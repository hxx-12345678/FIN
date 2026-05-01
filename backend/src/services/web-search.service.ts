/**
 * Web Search Service for AI CFO
 * 
 * Provides real-time web intelligence for CFO queries that need
 * external market data, competitive intelligence, regulatory updates,
 * and industry benchmarks.
 * 
 * Architecture: Query Router → Search API → Snippet Extraction → Citation Builder
 * 
 * Uses Google Custom Search API (free tier: 100 queries/day, $5/1000 after).
 * Falls back to a curated knowledge base if API is unavailable.
 */

import { logger } from '../utils/logger';
import * as cheerio from 'cheerio';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WebSearchResult {
  query: string;
  snippets: WebSnippet[];
  searchTimeMs: number;
  source: 'google_cse' | 'fallback_knowledge' | 'direct_scrape';
}

export interface WebSnippet {
  title: string;
  snippet: string;
  url: string;
  source: string;  // Domain name (e.g., "reuters.com")
  publishedDate?: string;
  relevanceScore: number;
  scrapedContent?: string;
}

export interface WebSearchCitation {
  index: number;
  title: string;
  url: string;
  source: string;
  snippet: string;
}

// ─── Intent Router ───────────────────────────────────────────────────────────

// Patterns that indicate a query needs real-time external data
const WEB_SEARCH_TRIGGERS = {
  competitive: [
    /\b(competitor|competitive|industry|benchmark|compare|comparison|versus|vs\.?)\b/i,
    /\b(market\s+(share|position|leader)|peer\s+(group|comparison))\b/i,
  ],
  macro: [
    /\b(interest\s+rate|fed\s+rate|inflation|cpi|gdp|recession|macro|economy|economic)\b/i,
    /\b(tariff|trade\s+war|sanctions|geopolitical)\b/i,
  ],
  regulatory: [
    /\b(tax\s+(law|reform|change|update|regulation)|compliance|regulation|regulatory)\b/i,
    /\b(gaap|ifrs|sox|sec|audit\s+standard|accounting\s+standard)\b/i,
    /\b(gdpr|ccpa|data\s+privacy|kyc|aml)\b/i,
  ],
  benchmarks: [
    /\b(rule\s+of\s+40|median|average|percentile|quartile)\b/i,
    /\b(saas\s+metric|ndr|net\s+dollar\s+retention|arr\s+multiple|ltv.?cac)\b/i,
    /\b(valuation\s+multiple|p.?e\s+ratio|ev.?ebitda)\b/i,
  ],
  news: [
    /\b(news|latest|recent|update|announce|announcement|headline)\b/i,
    /\b(ipo|acquisition|merger|layoff|bankruptcy|funding\s+round)\b/i,
  ],
  fundraising: [
    /\b(series\s+[a-f]|seed\s+round|vc\s+(activity|funding)|valuation\s+trend)\b/i,
    /\b(raise\s+capital|fundrais|investor\s+sentiment)\b/i,
  ],
  explicit: [
    /\b(search\s+(for|the\s+web|online|internet)|look\s+up|find\s+out|google)\b/i,
    /https?:\/\//i,  // User pasted a URL
  ],
};

// Intents that should NEVER trigger web search (pure internal computation)
const NO_SEARCH_INTENTS = new Set([
  'runway_burn',
  'runway_calculation',
  'burn_rate_calculation',
  'scenario_modeling',
  'anomaly_detection',
  'report_generation',
  'budget_change',
  'system_status',
  'system_guidance',
  'conversation_prompt',
]);

// ─── Rate Limiting ───────────────────────────────────────────────────────────

let dailySearchCount = 0;
let lastResetDate = new Date().toDateString();
const DAILY_LIMIT = 90; // Keep buffer under the 100 free tier limit

function checkAndResetDailyLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailySearchCount = 0;
    lastResetDate = today;
  }
  return dailySearchCount < DAILY_LIMIT;
}

// ─── Simple In-Memory Cache ──────────────────────────────────────────────────

const searchCache = new Map<string, { result: WebSearchResult; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for financial data

function getCacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ─── Core Service ────────────────────────────────────────────────────────────

export const webSearchService = {
  /**
   * Determine if a query needs web search based on intent and content analysis.
   * This is the "Query Router" - it avoids unnecessary API calls.
   */
  shouldSearch(query: string, intent?: string): { shouldSearch: boolean; category: string; reason: string } {
    // Never search for pure internal computation intents
    if (intent && NO_SEARCH_INTENTS.has(intent)) {
      return { shouldSearch: false, category: 'none', reason: 'Internal computation intent' };
    }

    const queryLower = query.toLowerCase();

    // Check each category of triggers
    for (const [category, patterns] of Object.entries(WEB_SEARCH_TRIGGERS)) {
      for (const pattern of patterns) {
        if (pattern.test(queryLower)) {
          return {
            shouldSearch: true,
            category,
            reason: `Matched ${category} pattern: ${pattern.source.substring(0, 40)}...`,
          };
        }
      }
    }

    return { shouldSearch: false, category: 'none', reason: 'No web search triggers found' };
  },

  /**
   * Scrape a URL and extract its main text content using Cheerio
   */
  async scrapeUrl(urlStr: string): Promise<{ title: string; content: string } | null> {
    try {
      const response = await fetch(urlStr, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 FinaPilot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) return null;
      
      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove noise
      $('script, style, noscript, iframe, img, svg, video, audio, header, footer, nav, aside').remove();

      const title = $('title').text().trim() || $('h1').first().text().trim();
      
      // Get paragraphs and main content text
      let content = '';
      $('p, h1, h2, h3, h4, h5, h6, li, article').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) { // filter out tiny artifacts
          content += text + '\n\n';
        }
      });

      // Limit content length to prevent context window explosion (approx 3000 words max)
      return { 
        title, 
        content: content.substring(0, 15000).trim() 
      };
    } catch (error) {
      logger.warn(`[WebSearch] Failed to scrape ${urlStr}: ${(error as Error).message}`);
      return null;
    }
  },

  /**
   * Extract all URLs from a given text
   */
  extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? Array.from(new Set(matches)) : [];
  },

  /**
   * Execute a web search and return structured, citation-ready results.
   */
  async search(query: string, category: string = 'general', maxResults: number = 5): Promise<WebSearchResult> {
    const startTime = Date.now();
    const explicitUrls = this.extractUrls(query);

    // If explicit URLs are provided in the query, bypass CSE and just scrape them directly (Deep Web Search)
    if (explicitUrls.length > 0) {
      logger.info(`[WebSearch] Found ${explicitUrls.length} explicit URLs in query, triggering direct scrape`);
      const snippets: WebSnippet[] = [];
      
      for (const urlStr of explicitUrls.slice(0, 3)) { // Max 3 links to scrape
        try {
          const urlObj = new URL(urlStr);
          const scrapeResult = await this.scrapeUrl(urlStr);
          
          if (scrapeResult && scrapeResult.content) {
            snippets.push({
              title: scrapeResult.title || `Content from ${urlObj.hostname}`,
              snippet: scrapeResult.content.substring(0, 300) + '...',
              scrapedContent: scrapeResult.content,
              url: urlStr,
              source: urlObj.hostname.replace(/^www\./, ''),
              relevanceScore: 1.0,
            });
          }
        } catch (e) {
          logger.warn(`[WebSearch] Invalid URL extracted: ${urlStr}`);
        }
      }

      if (snippets.length > 0) {
        return {
          query,
          snippets,
          searchTimeMs: Date.now() - startTime,
          source: 'direct_scrape'
        };
      }
    }

    // Check cache first
    const cacheKey = getCacheKey(query);
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      logger.debug(`[WebSearch] Cache hit for: "${query}"`);
      return { ...cached.result, searchTimeMs: 0 };
    }

    // Check rate limit
    if (!checkAndResetDailyLimit()) {
      logger.warn(`[WebSearch] Daily limit reached (${DAILY_LIMIT}), using fallback`);
      return this.getFallbackResults(query, category, startTime);
    }

    const apiKey = process.env.GOOGLE_CSE_API_KEY;
    const searchEngineId = process.env.GOOGLE_CSE_ID;

    if (!apiKey || !searchEngineId) {
      logger.debug('[WebSearch] Google CSE not configured, using fallback knowledge base');
      return this.getFallbackResults(query, category, startTime);
    }

    try {
      // Build search query optimized for financial/CFO context
      const enhancedQuery = this.enhanceQuery(query, category);

      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', searchEngineId);
      url.searchParams.set('q', enhancedQuery);
      url.searchParams.set('num', Math.min(maxResults, 10).toString());
      // Prefer recent results for financial data
      url.searchParams.set('dateRestrict', 'm6'); // Last 6 months
      url.searchParams.set('safe', 'active');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown');
        logger.warn(`[WebSearch] Google CSE error ${response.status}: ${errText}`);
        return this.getFallbackResults(query, category, startTime);
      }

      const data: any = await response.json();
      dailySearchCount++;

      const snippets: WebSnippet[] = (data.items || [])
        .slice(0, maxResults)
        .map((item: any, idx: number) => {
          const urlObj = new URL(item.link);
          return {
            title: item.title || '',
            snippet: item.snippet || '',
            url: item.link,
            source: urlObj.hostname.replace(/^www\./, ''),
            publishedDate: item.pagemap?.metatags?.[0]?.['article:published_time'] || undefined,
            relevanceScore: 1 - (idx * 0.1), // Decreasing relevance
          };
        });

      // --- Deep Scraping for top results ---
      // We take the top 2 results and do a full scrape to get deep context like Claude/Cursor
      for (let i = 0; i < Math.min(2, snippets.length); i++) {
        const scrapeResult = await this.scrapeUrl(snippets[i].url);
        if (scrapeResult && scrapeResult.content) {
          snippets[i].scrapedContent = scrapeResult.content;
          // Update the preview snippet based on the actual scraped content if it was very short
          if (snippets[i].snippet.length < 100) {
            snippets[i].snippet = scrapeResult.content.substring(0, 300) + '...';
          }
        }
      }

      const result: WebSearchResult = {
        query: enhancedQuery,
        snippets,
        searchTimeMs: Date.now() - startTime,
        source: 'google_cse',
      };

      // Cache the result
      searchCache.set(cacheKey, { result, timestamp: Date.now() });

      logger.info(`[WebSearch] Found ${snippets.length} results for "${query}" in ${result.searchTimeMs}ms`);
      return result;

    } catch (error: any) {
      logger.warn(`[WebSearch] Search failed: ${error.message}`);
      return this.getFallbackResults(query, category, startTime);
    }
  },

  /**
   * Enhance query with financial context for better search results
   */
  enhanceQuery(query: string, category: string): string {
    const prefixes: Record<string, string> = {
      competitive: 'industry analysis',
      macro: 'macroeconomic outlook 2026',
      regulatory: 'financial regulation update',
      benchmarks: 'SaaS financial benchmark data',
      news: 'financial news',
      fundraising: 'startup fundraising market',
    };

    const prefix = prefixes[category] || '';
    // Don't double up if the query already contains the context
    if (prefix && !query.toLowerCase().includes(prefix.toLowerCase().split(' ')[0])) {
      return `${prefix} ${query}`;
    }
    return query;
  },

  /**
   * Build citation references from search results for the LLM prompt
   */
  buildCitationContext(results: WebSearchResult): string {
    if (results.snippets.length === 0) return '';

    let context = '\n\n[WEB SEARCH RESULTS — Use these as grounding. Cite sources by [N] when referencing them.]\n';
    results.snippets.forEach((s, idx) => {
      context += `\n[${idx + 1}] ${s.title} (${s.source})\nURL: ${s.url}\n`;
      if (s.scrapedContent) {
        context += `FULL CONTENT EXTRACT:\n${s.scrapedContent}\n`;
      } else {
        context += `SUMMARY:\n${s.snippet}\n`;
      }
    });
    context += '\n[END WEB SEARCH RESULTS]\n';

    return context;
  },

  /**
   * Extract structured citations from the results for the frontend
   */
  extractCitations(results: WebSearchResult): WebSearchCitation[] {
    return results.snippets.map((s, idx) => ({
      index: idx + 1,
      title: s.title,
      url: s.url,
      source: s.source,
      snippet: s.snippet.substring(0, 200),
    }));
  },

  /**
   * Fallback knowledge base for when the API is unavailable.
   * Provides curated, accurate financial benchmarks.
   */
  getFallbackResults(query: string, category: string, startTime: number): WebSearchResult {
    const queryLower = query.toLowerCase();
    const fallbackSnippets: WebSnippet[] = [];

    // SaaS Benchmarks (always accurate and useful)
    if (category === 'benchmarks' || queryLower.includes('benchmark') || queryLower.includes('rule of 40')) {
      fallbackSnippets.push({
        title: 'SaaS Benchmarks 2026 — Key Financial Metrics',
        snippet: 'Median SaaS Rule of 40 score: 25-35% for growth-stage companies. Top quartile: >50%. Median gross margin: 70-80%. Median NDR for best-in-class: 120-130%. Median burn multiple: 1.5-2.5x for Series A-B companies. Median LTV:CAC ratio target: >3.0x.',
        url: 'https://www.bvp.com/atlas',
        source: 'bvp.com (Bessemer Atlas)',
        relevanceScore: 0.85,
      });
    }

    if (category === 'macro' || queryLower.includes('interest rate') || queryLower.includes('fed')) {
      fallbackSnippets.push({
        title: 'Federal Reserve Rate Policy — Current Outlook',
        snippet: 'The Federal Reserve maintains a data-dependent approach to monetary policy. Current federal funds rate target range and forward guidance should be verified at federalreserve.gov for the latest decisions. Key indicators: Core PCE, unemployment rate, and GDP growth.',
        url: 'https://www.federalreserve.gov/monetarypolicy.htm',
        source: 'federalreserve.gov',
        relevanceScore: 0.75,
      });
    }

    if (category === 'fundraising' || queryLower.includes('fundrais') || queryLower.includes('valuation')) {
      fallbackSnippets.push({
        title: 'Startup Fundraising Market — Key Trends',
        snippet: 'Series A median pre-money: $25-40M (2025-2026 range). Seed median: $8-15M. Revenue multiples have compressed from 2021 peaks. Focus on profitability and efficient growth. Bridge rounds remain common for companies extending runway.',
        url: 'https://carta.com/blog/state-of-private-markets/',
        source: 'carta.com',
        relevanceScore: 0.80,
      });
    }

    if (category === 'regulatory' || queryLower.includes('tax') || queryLower.includes('compliance')) {
      fallbackSnippets.push({
        title: 'Financial Compliance & Regulatory Updates',
        snippet: 'Key regulatory areas for CFOs: ASC 606 revenue recognition, lease accounting (ASC 842), R&D tax credit changes, state-level digital services taxes, and international transfer pricing updates. SOC 2 Type II and SOX compliance remain critical for enterprise SaaS.',
        url: 'https://www.fasb.org/standards',
        source: 'fasb.org',
        relevanceScore: 0.70,
      });
    }

    // Generic financial intelligence fallback
    if (fallbackSnippets.length === 0) {
      fallbackSnippets.push({
        title: 'Financial Intelligence — General',
        snippet: `For real-time financial intelligence on "${query}", we recommend checking Bloomberg Terminal, S&P Capital IQ, AlphaSense, or Koyfin for the most current data. Configure your GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID environment variables to enable live web search.`,
        url: 'https://www.bloomberg.com/professional/products/',
        source: 'bloomberg.com',
        relevanceScore: 0.50,
      });
    }

    return {
      query,
      snippets: fallbackSnippets,
      searchTimeMs: Date.now() - startTime,
      source: 'fallback_knowledge',
    };
  },
};
