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
  source: 'google_cse' | 'fallback_knowledge' | 'direct_scrape' | 'duckduckgo_scraper';
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

// Institutional Knowledge Base (Vetted Fallbacks — Updated Q1 2026)
const VETTED_KNOWLEDGE_BASE = [
  {
    title: 'SaaS Rule of 40 Benchmarks (2025-2026)',
    snippet: 'Rule of 40 = Revenue Growth % + EBITDA Margin %. Top Quartile: >55%. Median: 38-42%. Efficiency-focused companies (lower growth) aim for 18-22% growth + 18-22% margin. Growth-focused aim for 40%+ growth and -5% margin. Rule of 40+ companies command a 2.5x valuation premium.',
    url: 'https://www.bvp.com/atlas/the-rule-of-40',
    source: 'Bessemer Venture Partners'
  },
  {
    title: 'Public SaaS Valuation Multiples (2025-2026)',
    snippet: 'Median EV/Revenue multiples for public SaaS companies: 7.2x (Q4 2025). High Growth (>30% YoY): 11.5x. Rule of 40 winners: 14.8x median. Companies below Rule of 40: 4.8x. ARR multiple compression for sub-$50M ARR companies.',
    url: 'https://www.meritechcapital.com/benchmarking/public-saas-comparables',
    source: 'Meritech Capital'
  },
  {
    title: 'SaaS Cost Structures & OpEx Benchmarks (2025)',
    snippet: 'Typical SaaS OpEx Allocation: R&D (22-28%), S&M (35-45%), G&A (10-15%). Median Gross Margins: 76-82%. Best-in-class companies achieve >85% gross margins. Cloud hosting costs typically 8-12% of revenue.',
    url: 'https://www.key.com/business/resource-center/saas-benchmarking.jsp',
    source: 'KeyBanc'
  },
  {
    title: 'Net Dollar Retention (NDR) Benchmarks',
    snippet: 'Median NDR for public SaaS: 110% (2025). Top quartile: >125%. Bottom quartile: <100%. Enterprise SaaS: 115-130%. SMB SaaS: 95-110%. NDR >100% means existing customer base grows without new sales.',
    url: 'https://www.benchmarkit.ai',
    source: 'Benchmarkit'
  },
  {
    title: 'LTV/CAC Ratio Benchmarks',
    snippet: 'Healthy LTV/CAC ratio: >3x. Best-in-class: >5x. Median for venture-backed SaaS: 3.2x. CAC payback period median: 18-22 months. Companies with <12 month payback are in top decile.',
    url: 'https://www.saas-capital.com/resources',
    source: 'SaaS Capital'
  },
  {
    title: 'Burn Multiple Benchmarks (2025-2026)',
    snippet: 'Burn Multiple = Net Burn / Net New ARR. Amazing: <1x. Good: 1-1.5x. Mediocre: 1.5-2x. Bad: >2x. Median for Series A: 1.8x. Median for Series B: 1.4x. Top quartile: <1.0x.',
    url: 'https://www.bvp.com/atlas',
    source: 'Bessemer Venture Partners'
  },
  {
    title: 'Venture Fundraising Multiples (2025-2026)',
    snippet: 'Series A median valuation: $45M pre-money at $5M ARR (9x). Series B: $150M at $15M ARR (10x). Series C: $400M at $50M ARR (8x). Growth equity: 6-8x ARR for 30%+ growers. Down-round frequency: 28% in 2025.',
    url: 'https://www.cartaequityinsights.com',
    source: 'Carta Equity Insights'
  }
];

const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const GOOGLE_CSE_URL = 'https://www.googleapis.com/customsearch/v1';

// Tier-1 Institutional Financial Domains (CFO-Grade Authority)
const AUTHORITATIVE_DOMAINS = [
  'meritechcapital.com',
  'key.com',
  'bvp.com',
  'iconiqcapital.com',
  'benchmarkit.ai',
  'saas-capital.com',
  'bain.com',
  'highalpha.com',
  'publiccomps.com',
  'chartmogul.com',
  'gaap.com',
  'fasb.org',
  'sec.gov'
];

function getCacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ─── Core Service ────────────────────────────────────────────────────────────

export const webSearchService = {
  /**
   * Determine if a query needs web search based on intent and content analysis.
   */
  shouldSearch(query: string, intent?: string): { shouldSearch: boolean; category: string; reason: string } {
    if (intent && NO_SEARCH_INTENTS.has(intent)) {
      return { shouldSearch: false, category: 'none', reason: 'Internal computation intent' };
    }

    const queryLower = query.toLowerCase();
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
      let normalizedUrl = urlStr.trim();

      if (normalizedUrl.startsWith('//')) {
        normalizedUrl = `https:${normalizedUrl}`;
      }

      try {
        const maybeDdg = new URL(normalizedUrl);
        if (
          /(^|\.)duckduckgo\.com$/i.test(maybeDdg.hostname) &&
          maybeDdg.pathname.startsWith('/l/')
        ) {
          const uddg = maybeDdg.searchParams.get('uddg');
          if (uddg) {
            normalizedUrl = decodeURIComponent(uddg);
          }
        }
      } catch {
        // If URL is still not parseable, fetch() will throw and be handled below.
      }

      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 FinaPilot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) return null;
      
      const html = await response.text();
      const $ = cheerio.load(html);

      $('script, style, noscript, iframe, img, svg, video, audio, header, footer, nav, aside').remove();

      const title = $('title').text().trim() || $('h1').first().text().trim();
      let content = '';
      $('p, h1, h2, h3, h4, h5, h6, li, article').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) {
          content += text + '\n\n';
        }
      });

      return { 
        title, 
        content: content.substring(0, 15000).trim() 
      };
    } catch (error) {
      logger.warn(`[WebSearch] Failed to scrape ${urlStr}: ${(error as Error).message}`);
      return null;
    }
  },

  extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? Array.from(new Set(matches)) : [];
  },

  /**
   * Execute a web search and return structured results.
   */
  async search(
    query: string, 
    category: string = 'general', 
    maxResults: number = 5,
    beforeDate?: string // YYYY-MM-DD for temporal grounding
  ): Promise<WebSearchResult> {
    const startTime = Date.now();
    const explicitUrls = this.extractUrls(query);

    if (explicitUrls.length > 0) {
      const snippets: WebSnippet[] = [];
      for (const urlStr of explicitUrls.slice(0, 3)) {
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
        } catch (e) {}
      }
      if (snippets.length > 0) {
        return { query, snippets, searchTimeMs: Date.now() - startTime, source: 'direct_scrape' };
      }
    }
    
    const cacheKey = getCacheKey(query);
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return { ...cached.result, searchTimeMs: 0 };
    }

    if (!checkAndResetDailyLimit()) {
      return this.getFallbackResults(query, category, startTime);
    }
    
    if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ID) {
      return this.getFallbackResults(query, category, startTime);
    }

    try {
      let enhancedQuery = this.enhanceQuery(query, category);
      
      // Inject temporal grounding if specified to avoid temporal paradoxes (judging 2023 by 2026 data)
      if (beforeDate) {
        enhancedQuery += ` before:${beforeDate}`;
      }

      const url = new URL(GOOGLE_CSE_URL);
      url.searchParams.set('key', GOOGLE_CSE_API_KEY);
      url.searchParams.set('cx', GOOGLE_CSE_ID);
      url.searchParams.set('q', enhancedQuery);
      url.searchParams.set('num', Math.min(maxResults, 10).toString());
      
      // If beforeDate is used, we disable dateRestrict to allow older results that match the window
      if (!beforeDate) {
        url.searchParams.set('dateRestrict', 'm6');
      }
      url.searchParams.set('safe', 'active');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return this.getFallbackResults(query, category, startTime);

      const data: any = await response.json();
      dailySearchCount++;

      const snippets: WebSnippet[] = (data.items || [])
        .slice(0, maxResults)
        .map((item: any, idx: number) => ({
          title: item.title || '',
          snippet: item.snippet || '',
          url: item.link,
          source: new URL(item.link).hostname.replace(/^www\./, ''),
          relevanceScore: 1 - (idx * 0.1),
        }));

      for (let i = 0; i < Math.min(2, snippets.length); i++) {
        const scrapeResult = await this.scrapeUrl(snippets[i].url);
        if (scrapeResult && scrapeResult.content) {
          snippets[i].scrapedContent = scrapeResult.content;
          if (snippets[i].snippet.length < 100) {
            snippets[i].snippet = scrapeResult.content.substring(0, 300) + '...';
          }
        }
      }

      const result: WebSearchResult = { query: enhancedQuery, snippets, searchTimeMs: Date.now() - startTime, source: 'google_cse' };
      searchCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (error: any) {
      return this.getFallbackResults(query, category, startTime);
    }
  },

  /**
   * DEEP RESEARCH: Performs search AND crawls top results for high-fidelity grounding.
   * This is a multi-stage pipeline: Search -> Scrape -> Distill -> Cite.
   */
  async deepSearch(query: string, category = 'general', maxCrawl = 3, beforeDate?: string): Promise<WebSearchResult> {
    const startTime = Date.now();
    logger.info(`[WebSearch] Initiating Deep Research for: "${query}"`);
    
    // Stage 1: Broad Discovery
    const searchResult = await this.search(query, category, 10, beforeDate);
    if (searchResult.snippets.length === 0) return searchResult;

    // Stage 2: Selective Deep Scrape (Quality Filtering)
    const deepSnippets: WebSnippet[] = [...searchResult.snippets];
    const crawlTargets = searchResult.snippets
      .filter(s => !s.title.includes('[TRUSTED]')) 
      .slice(0, maxCrawl);

    const crawlPromises = crawlTargets.map(async (target) => {
      try {
        const scraped = await this.scrapeUrl(target.url);
        if (scraped && scraped.content.length > 500) {
          const idx = deepSnippets.findIndex(s => s.url === target.url);
          if (idx !== -1) {
            // Tag content for Auditor grounding verification
            deepSnippets[idx].scrapedContent = scraped.content;
            deepSnippets[idx].snippet = `[DEEP EXTRACT] ${scraped.content.substring(0, 1000)}...`;
            deepSnippets[idx].relevanceScore += 0.1; // Boost confidence for deep extracts
            
            logger.info(`[WebSearch] Deep extracted ${scraped.content.length} chars from ${target.url}`);
          }
        }
      } catch (e) {
        logger.warn(`[WebSearch] Deep crawl failed for ${target.url}: ${e}`);
      }
    });

    await Promise.allSettled(crawlPromises);

    return {
      ...searchResult,
      snippets: deepSnippets,
      searchTimeMs: Date.now() - startTime,
      source: `${searchResult.source}+deep_crawl` as any
    };
  },

  enhanceQuery(query: string, category: string): string {
    const prefixes: Record<string, string> = {
      competitive: 'industry analysis',
      macro: 'macroeconomic outlook',
      regulatory: 'financial regulation update',
      benchmarks: 'SaaS financial benchmark data survey',
      news: 'financial news',
      fundraising: 'startup fundraising market',
    };
    
    let enhanced = query;
    const prefix = prefixes[category] || '';
    if (prefix && !query.toLowerCase().includes(prefix.toLowerCase().split(' ')[0])) {
      enhanced = `${prefix} ${query}`;
    }

    // Force Domain Authority Weighting for Benchmarks & Regulatory
    if (category === 'benchmarks' || category === 'regulatory') {
      const siteFilter = AUTHORITATIVE_DOMAINS.map(d => `site:${d}`).join(' OR ');
      enhanced = `(${enhanced}) (${siteFilter})`;
    }

    return enhanced;
  },

  buildCitationContext(results: WebSearchResult): string {
    if (results.snippets.length === 0) return '';
    let context = '\n\n[WEB SEARCH RESULTS]\n';
    results.snippets.forEach((s, idx) => {
      context += `\n[${idx + 1}] ${s.title} (${s.source})\nURL: ${s.url}\n`;
      context += s.scrapedContent ? `FULL CONTENT:\n${s.scrapedContent}\n` : `SUMMARY:\n${s.snippet}\n`;
    });
    return context + '\n[END WEB SEARCH RESULTS]\n';
  },

  extractCitations(results: WebSearchResult): WebSearchCitation[] {
    return results.snippets.map((s, idx) => ({
      index: idx + 1,
      title: s.title,
      url: s.url,
      source: s.source,
      snippet: s.snippet.substring(0, 200),
    }));
  },

  async getFallbackResults(query: string, category: string, startTime: number): Promise<WebSearchResult> {
    const fallbackSnippets: WebSnippet[] = [];

    // ── Stage 1: DuckDuckGo HTML Scrape (robust parsing) ──
    try {
      const axios = (await import('axios')).default;
      const enhancedQuery = category === 'benchmarks'
        ? `${query} SaaS benchmark data 2025 2026`
        : category === 'macro'
        ? `${query} macroeconomic data 2026`
        : query;

      const res = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(enhancedQuery)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 8000,
      });

      const $ = cheerio.load(res.data);
      $('.result').each((i, el) => {
        if (fallbackSnippets.length >= 8) return;
        const titleEl = $(el).find('.result__a').first();
        const title = titleEl.text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();
        let rawHref = titleEl.attr('href') || '';

        // Resolve DuckDuckGo redirect URLs to actual URLs
        try {
          if (rawHref.includes('duckduckgo.com/l/')) {
            const parsed = new URL(rawHref.startsWith('//') ? `https:${rawHref}` : rawHref);
            const uddg = parsed.searchParams.get('uddg');
            if (uddg) rawHref = decodeURIComponent(uddg);
          }
        } catch { /* keep raw */ }

        // Extract real domain
        let source = 'web';
        try {
          source = new URL(rawHref).hostname.replace(/^www\./, '');
        } catch { /* keep 'web' */ }

        // Score higher for authoritative financial domains
        const isAuthoritative = AUTHORITATIVE_DOMAINS.some(d => source.includes(d));
        const relevanceScore = isAuthoritative ? 0.95 : 0.75 - (i * 0.05);

        if (title && title.length > 5 && snippet.length > 20) {
          fallbackSnippets.push({
            title,
            snippet: snippet.substring(0, 500),
            url: rawHref,
            source,
            relevanceScore: Math.max(relevanceScore, 0.3),
          });
        }
      });

      // Sort by relevance (authoritative sources first)
      fallbackSnippets.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Deep scrape top 2 results for richer context
      for (let i = 0; i < Math.min(2, fallbackSnippets.length); i++) {
        try {
          if (!fallbackSnippets[i].url || fallbackSnippets[i].url.length < 10) continue;
          const scraped = await this.scrapeUrl(fallbackSnippets[i].url);
          if (scraped && scraped.content && scraped.content.length > 200) {
            fallbackSnippets[i].scrapedContent = scraped.content;
            if (fallbackSnippets[i].snippet.length < 100) {
              fallbackSnippets[i].snippet = scraped.content.substring(0, 400) + '...';
            }
          }
        } catch { /* skip failed scrapes */ }
      }

      logger.info(`[WebSearch] DuckDuckGo fallback returned ${fallbackSnippets.length} results for: "${query}"`);
    } catch (e) {
      logger.warn(`[WebSearch] DuckDuckGo scrape failed: ${(e as Error).message}`);
    }

    // ── Stage 2: Vetted Knowledge Base (if search results are insufficient) ──
    if (fallbackSnippets.length < 3) {
      const queryLower = query.toLowerCase();
      for (const kb of VETTED_KNOWLEDGE_BASE) {
        // Match on keywords from the knowledge base title
        const titleWords = kb.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matches = titleWords.filter(w => queryLower.includes(w));
        if (matches.length >= 1) {
          fallbackSnippets.push({
            ...kb,
            title: `[VETTED] ${kb.title}`,
            relevanceScore: 0.85,
          });
        }
      }
    }

    const resultSource = fallbackSnippets.length > 0 ? 'duckduckgo_scraper' : 'fallback_knowledge';

    return {
      query,
      snippets: fallbackSnippets,
      searchTimeMs: Date.now() - startTime,
      source: resultSource as any,
    };
  }
};

