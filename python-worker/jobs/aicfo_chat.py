"""AI CFO Chat Job Handler - High Performance LLM Analysis"""
import json
import os
import re
import time
from datetime import datetime, timezone
import requests
from typing import Dict, List, Any, Optional
from utils.db import get_db_connection
from utils.logger import setup_logger

logger = setup_logger()

def generateNaturalLanguageFromQuery(query, calculations):
    """Generate query-specific natural language when JSON parsing fails"""
    query_lower = query.lower() if query else ''
    
    if 'runway' in query_lower or ('cash' in query_lower and 'how long' in query_lower):
        runway = calculations.get('runway', calculations.get('cashRunway', 0))
        return f"Based on your current financial position, your cash runway is approximately {runway:.1f} months. This provides you with strategic flexibility for growth initiatives. To extend your runway, consider optimizing expenses, accelerating revenue growth, or raising capital when you have 6+ months remaining."
    
    elif 'burn' in query_lower or 'burn rate' in query_lower:
        burn = calculations.get('burnRate', calculations.get('monthlyBurnRate', 0))
        return f"Your monthly burn rate is currently ${burn:,.0f}. To improve this metric, review major expense categories including payroll, marketing, and operations. Target reducing non-essential spending by 5-10% while maintaining growth momentum. This optimization can extend your runway by 2-3 months."
    
    elif 'revenue' in query_lower and ('strategy' in query_lower or 'strategies' in query_lower or 'accelerate' in query_lower or 'growth' in query_lower):
        rev = calculations.get('revenue', calculations.get('monthlyRevenue', 0))
        growth = calculations.get('growth', calculations.get('revenueGrowth', 0)) * 100
        return f"""Based on your current monthly revenue of ${rev:,.0f} and growth rate of {growth:.1f}%, here are specific strategies to accelerate revenue growth:

**1. Customer Acquisition Optimization**
- Analyze your current CAC (Customer Acquisition Cost) and optimize channels with the best LTV:CAC ratio
- Implement referral programs to leverage existing customers
- Focus on high-intent channels that align with your ideal customer profile

**2. Pricing & Packaging Strategy**
- Review your pricing model and test value-based pricing tiers
- Consider expansion revenue through upsells and add-ons
- Implement annual contracts with discounts to improve cash flow

**3. Sales Process Enhancement**
- Shorten sales cycles by removing friction points
- Implement sales automation for lead nurturing
- Focus on high-value deals that move the needle

**4. Customer Retention & Expansion**
- Reduce churn through proactive customer success
- Implement expansion revenue strategies (upsells, cross-sells)
- Build strong customer relationships that drive advocacy

**5. Market Expansion**
- Identify new market segments or geographies
- Develop partnerships and channel strategies
- Consider product extensions that serve adjacent markets

Each of these strategies should be measured against your current metrics to track impact on revenue growth."""
    
    elif 'revenue' in query_lower or 'growth' in query_lower or 'trends' in query_lower:
        rev = calculations.get('revenue', calculations.get('monthlyRevenue', 0))
        growth = calculations.get('growth', calculations.get('revenueGrowth', 0)) * 100
        return f"Your current monthly revenue is ${rev:,.0f} with a growth rate of {growth:.1f}% per month. To accelerate growth, focus on customer acquisition, retention strategies, and expansion revenue. Consider optimizing your pricing model and sales processes to drive sustainable growth."
    
    elif 'funding' in query_lower or 'raise' in query_lower:
        runway = calculations.get('runway', 0)
        return f"With a {runway:.1f}-month runway, you're in a favorable position to raise capital. Start the fundraising process 6 months before your runway drops below 12 months. Target raising 18-24 months of runway at your current burn rate to maximize valuation and minimize dilution."
    
    elif 'expense' in query_lower or 'cost' in query_lower or 'optimize' in query_lower:
        burn = calculations.get('burnRate', 0)
        return f"To optimize your expenses, analyze your ${burn:,.0f} monthly burn rate across key categories. Focus on reducing non-core operational expenses while maintaining essential growth investments. Target a 7-10% reduction in discretionary spending, which could extend your runway by 2-3 months."
    
    else:
        # Generic but helpful response
        runway = calculations.get('runway', 0)
        burn = calculations.get('burnRate', 0)
        rev = calculations.get('revenue', 0)
        return f"I've analyzed your financial position: ${rev:,.0f} monthly revenue, ${burn:,.0f} monthly burn rate, and {runway:.1f} months of cash runway. Key focus areas include optimizing burn efficiency, accelerating revenue growth, and maintaining a healthy cash position for strategic flexibility."

# Configuration removed from global scope to ensure fresh load from env
# GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
# GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY_1')

def handle_aicfo_chat(job_id: str, org_id: str, object_id: str, logs: dict):
    """
    Handle AI CFO Chat request from Python worker for better performance and data processing.
    """
    logger.info(f"Processing AICFO Chat job {job_id} for org {org_id}")
    
    # Fetch configuration inside the function to ensure environment variables are loaded
    # Use gemini-2.0-flash-exp or gemini-1.5-flash for reliability in 2026
    gemini_model = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
    
    # Try multiple API keys just like the backend
    api_keys = []
    if os.getenv('GEMINI_API_KEY'): api_keys.append(os.getenv('GEMINI_API_KEY'))
    if os.getenv('GEMINI_API_KEY_1'): api_keys.append(os.getenv('GEMINI_API_KEY_1'))
    if os.getenv('GEMINI_API_KEY_2'): api_keys.append(os.getenv('GEMINI_API_KEY_2'))
    
    if not api_keys:
        logger.error("No Gemini API keys found in environment variables")
        raise ValueError("No Gemini API keys found in environment variables")

    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        params = logs.get('params', {})
        query = params.get('query')
        model_run_id = params.get('modelRunId')
        plan_id = object_id
        
        if not query:
            raise ValueError("Query is required for AI CFO chat")
            
        # Step 1: Data Grounding (Use passed calculations and context)
        calculations = params.get('calculations', {})
        grounding_context = params.get('groundingContext', {})
        evidence = grounding_context.get('evidence', [])
        
        # 1.2 Get Recent Model State if not fully provided
        model_state = {}
        if model_run_id:
            cursor.execute("SELECT summary_json FROM model_runs WHERE id = %s", (model_run_id,))
            row = cursor.fetchone()
            if row and row[0]:
                model_state = row[0] if isinstance(row[0], dict) else json.loads(row[0])
        
        # Step 2: Call Gemini (Stable and Fast)
        system_prompt = """You are an elite strategic CFO with deep expertise in financial analysis and strategic planning.

CORE PRINCIPLES:
1. ANSWER THE SPECIFIC QUESTION: Read the query carefully and provide a direct, comprehensive answer. Don't give generic summaries.
2. BE DETAILED AND ACTIONABLE: For strategy questions, provide specific, actionable strategies with clear steps. For analysis questions, provide deep insights.
3. USE THE DATA: Ground all recommendations in the provided financial metrics and context.
4. BE PROFESSIONAL BUT CONVERSATIONAL: Write as a trusted CFO advisor would speak to a CEO or founder.
5. PROVIDE EXPLANATIONS: Explain WHY each recommendation matters, not just WHAT to do.

RESPONSE QUALITY:
- For "What strategies..." questions: Provide 3-5 specific strategies with clear action steps, expected impact, and reasoning
- For "How can I..." questions: Provide step-by-step guidance with specific recommendations
- For "Show me..." questions: Provide detailed analysis with trends, patterns, and insights
- For "Create a plan..." questions: Provide a structured plan with phases, timelines, and expected outcomes

Respond ONLY in valid JSON format."""
        
        context_text = "\n".join([f"- {e.get('content')}" for e in evidence])
        
        user_prompt = f"""
        USER QUERY: "{query}"
        
        IMPORTANT: Answer the user's question directly and comprehensively. If they ask "What strategies can help me accelerate revenue growth?", provide specific, actionable strategies with clear steps. If they ask "How can I improve my burn rate?", provide detailed recommendations. Don't give generic summaries - give detailed, actionable answers.
        
        FINANCIAL METRICS:
        {json.dumps(calculations, indent=2)}
        
        ADDITIONAL CONTEXT:
        {context_text}
        
        MODEL SUMMARY:
        {json.dumps(model_state, indent=2)}
        
        YOUR TASK:
        1. Read the query carefully and understand what the user is asking
        2. Provide a comprehensive, detailed answer that directly addresses their question
        3. For strategy questions (e.g., "What strategies can help me accelerate revenue growth?"), provide 3-5 SPECIFIC strategies with:
           - Clear numbered list (1., 2., 3., etc.)
           - Specific action steps for each strategy
           - Expected impact and reasoning
           - Minimum 400-600 words total
        4. For analysis questions, provide deep insights with trends and patterns
        5. Ground all recommendations in the provided financial data
        6. Explain WHY each recommendation matters
        7. DO NOT give short, generic answers. Be detailed and comprehensive.
        
        CRITICAL: For "What strategies..." or "How can I..." questions, your naturalLanguage response MUST be at least 400 words and include a numbered list of specific strategies with detailed explanations.
        
        Respond with this exact JSON structure:
        {{
          "recommendations": [
            {{ 
              "type": "runway|burn|revenue|cost|strategy|growth", 
              "title": "Clear action title",
              "summary": "One sentence summary",
              "action": "Detailed action step with specific steps", 
              "explain": "Why this matters and how it works", 
              "impact": {{ "runway": "+2 months", "burn": "-5%", "revenue": "+15%" }}, 
              "priority": "high|medium|low",
              "reasoning": "Detailed explanation of why this recommendation is important"
            }}
          ],
          "naturalLanguage": "A comprehensive, detailed answer to the user's question. For strategy questions like 'What strategies can help me accelerate revenue growth?', provide a numbered list (1., 2., 3., etc.) of 3-5 specific strategies, each with clear action steps, expected impact, and reasoning. Minimum 400 words. Be detailed and actionable, not generic. Use markdown formatting with **bold** for strategy titles and bullet points for action steps."
        }}
        """
        
        # Try each API key and model fallback - Gemini 2.5 models as of 2026
        last_error = None
        response = None
        # Try Gemini 2.5 models first, then fallback to 2.0 and 1.5
        models_to_try = [
            'gemini-2.5-flash',  # Fastest, best for chat
            'gemini-2.5-pro'    # Most capable for complex analysis
        ]
        api_versions = ['v1beta', 'v1']
        
        for model_name in models_to_try:
            if response: break
            for api_version in api_versions:
                if response: break
                for idx, api_key in enumerate(api_keys):
                    try:
                        # Don't log API key prefixes for security - use index instead
                        logger.info(f"Attempting Gemini with model {model_name}, version {api_version} (key #{idx + 1})")
                        url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model_name}:generateContent?key={api_key}"
                        
                        # High compatibility generation config
                        gen_config = {
                            "temperature": 0.8,
                            "topP": 0.95,
                            "topK": 40,
                            "maxOutputTokens": 4096,  # Increased for detailed strategy responses
                        }
                        
                        # Only add response_mime_type if it's explicitly supported/required
                        # Some v1 endpoints don't support it in the same way as v1beta
                        if api_version == 'v1beta':
                            gen_config["response_mime_type"] = "application/json"
                        
                        payload = {
                            "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
                            "generationConfig": gen_config
                        }
                        
                        logger.debug(f"Payload for {model_name}: {json.dumps(gen_config)}")
                        
                        start_time = time.time()
                        resp = requests.post(url, json=payload, timeout=20)
                        
                        if resp.status_code == 200:
                            response = resp
                            gemini_model = model_name # Update for metadata
                            break
                        elif resp.status_code == 400 and ("responseMimeType" in resp.text or "response_mime_type" in resp.text):
                            # Retry WITHOUT response_mime_type if that was the error
                            logger.warning(f"Retrying {model_name} without response_mime_type...")
                            if "response_mime_type" in gen_config:
                                del gen_config["response_mime_type"]
                            payload["generationConfig"] = gen_config
                            resp = requests.post(url, json=payload, timeout=20)
                            if resp.status_code == 200:
                                response = resp
                                gemini_model = model_name
                                break
                        
                        resp_text = resp.text
                        # If it's a quota error, don't spam logs with the whole thing
                        # Also sanitize any potential API key exposure in error messages
                        log_msg = resp_text[:300] if resp.status_code != 429 else "Quota exceeded"
                        # Remove any potential API key strings from log messages
                        log_msg = re.sub(r'AIzaSy[A-Za-z0-9]{35}', '[REDACTED_API_KEY]', log_msg)
                        logger.warning(f"Gemini API ({model_name}, {api_version}) failed (status {resp.status_code}): {log_msg}")
                        last_error = resp_text
                    except Exception as e:
                        # Sanitize error messages to prevent API key exposure
                        error_msg = str(e)
                        error_msg = re.sub(r'AIzaSy[A-Za-z0-9]{35}', '[REDACTED_API_KEY]', error_msg)
                        logger.warning(f"Error calling Gemini {model_name}: {error_msg}")
                        last_error = error_msg
        
        if not response:
            raise Exception(f"All Gemini models, versions and keys failed. Last error: {last_error}")
            
        llm_duration = time.time() - start_time
        logger.info(f"LLM call ({gemini_model}) took {llm_duration:.2f}s")
        
        result_data = response.json()
        content = result_data['candidates'][0]['content']['parts'][0]['text']
        
        # Parse JSON from content - robust parsing
        parsed = None
        natural_language = ''
        recommendations = []
        
        try:
            # Handle possible markdown backticks or extra whitespace
            json_str = content.strip()
            if '```json' in json_str:
                json_str = json_str.split('```json')[1].split('```')[0].strip()
            elif '```' in json_str:
                json_str = json_str.split('```')[1].split('```')[0].strip()
            
            # CRITICAL FIX: Handle unterminated strings and unescaped newlines
            # Gemini sometimes returns JSON with unescaped newlines in strings
            # We need to fix these before parsing
            import re
            
            # Fix unterminated strings by finding incomplete string values and completing them
            # Pattern: "key": "value that might have newlines or be unterminated
            # Strategy: Find all string values and ensure they're properly escaped
            
            # First, try to fix common issues:
            # 1. Replace unescaped newlines in string values with \n
            # 2. Fix unterminated strings at the end of JSON
            # 3. Escape quotes within string values
            
            # More robust approach: Try to repair the JSON incrementally
            try:
                parsed = json.loads(json_str)
            except json.JSONDecodeError as parse_error:
                logger.warning(f"Initial JSON parse failed: {parse_error}. Attempting repair...")
                
                # Try to fix unterminated strings by finding the last incomplete string
                # and closing it properly
                error_pos = getattr(parse_error, 'pos', None) or 0
                
                # Strategy: Find incomplete string values and complete them
                # Look for patterns like: "action": "text that is unterminated
                # We'll try to find where the string should end
                
                # For unterminated strings, try to find the next valid JSON structure
                # and close the string before it
                if 'Unterminated string' in str(parse_error):
                    # Find the position where the string starts
                    # Look backwards from error position to find opening quote
                    start_pos = json_str.rfind('"', 0, error_pos)
                    if start_pos != -1:
                        # Try to find where the string should end (next unescaped quote or end of object)
                        # Look for patterns that suggest string continuation
                        # If we can't find a closing quote, try to insert one before the next structural character
                        remaining = json_str[error_pos:]
                        # Look for next structural character that would end the string
                        next_comma = remaining.find(',')
                        next_brace = remaining.find('}')
                        next_bracket = remaining.find(']')
                        
                        # Find the earliest structural character
                        end_markers = [m for m in [next_comma, next_brace, next_bracket] if m != -1]
                        if end_markers:
                            insert_pos = error_pos + min(end_markers)
                            # Insert closing quote before the structural character
                            json_str = json_str[:insert_pos] + '"' + json_str[insert_pos:]
                            logger.info(f"Repaired unterminated string at position {insert_pos}")
                
                # Also fix unescaped newlines in strings
                # Replace literal newlines within string values with \n
                # This is tricky - we need to be careful not to break valid JSON
                # For now, try parsing again after the repair
                try:
                    parsed = json.loads(json_str)
                except json.JSONDecodeError as e2:
                    logger.warning(f"Repair attempt failed: {e2}. Using fallback extraction...")
                    # Fall through to regex extraction below
                    raise e2
            
            # If we got here, parsing succeeded
            natural_language = parsed.get('naturalLanguage', '')
            recommendations = parsed.get('recommendations', [])
            
            # Validate natural_language is not JSON itself
            if natural_language.startswith('{') or natural_language.startswith('['):
                logger.warning("naturalLanguage appears to be JSON, extracting from recommendations")
                # If naturalLanguage is JSON, generate from recommendations
                if recommendations and len(recommendations) > 0:
                    natural_language = f"Based on your query '{query}', {recommendations[0].get('summary', recommendations[0].get('explain', ''))}"
                else:
                    natural_language = f"Based on your query '{query}', I've analyzed your financial position and prepared recommendations."
                    
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"Failed to parse LLM JSON response: {e}")
            logger.error(f"Raw content (first 500 chars): {content[:500]}")
            # If JSON parsing fails, try to extract natural language from raw content
            # Sometimes Gemini returns plain text even when asked for JSON
            import re
            if 'naturalLanguage' in content or 'natural_language' in content:
                # Try regex extraction - handle multiline strings
                nl_match = re.search(r'"naturalLanguage":\s*"((?:[^"\\]|\\.|\\n)*)"', content, re.DOTALL)
                if not nl_match:
                    # Try without quotes (might be unquoted)
                    nl_match = re.search(r'"naturalLanguage":\s*([^,}\]]+)', content, re.DOTALL)
                if nl_match:
                    natural_language = nl_match.group(1).strip().strip('"').replace('\\n', '\n')
                else:
                    # Fallback: use first 300 chars as natural language
                    natural_language = content[:300] if len(content) > 300 else content
            else:
                # Generate from query and calculations
                natural_language = generateNaturalLanguageFromQuery(query, calculations)
            recommendations = []
        
        # Ensure natural_language is not empty and is actually text (not JSON)
        if not natural_language or natural_language.strip().startswith('{'):
            natural_language = generateNaturalLanguageFromQuery(query, calculations)
        
        # Ensure recommendations have dataSources for auditability
        for rec in recommendations:
            if 'dataSources' not in rec or not rec.get('dataSources'):
                # Add data sources from evidence
                rec['dataSources'] = [
                    {
                        "type": "financial_metric",
                        "id": f"metric_{idx}",
                        "snippet": ev.get('content', str(ev))[:200]
                    }
                    for idx, ev in enumerate(evidence[:3])  # Limit to first 3 for brevity
                ]
            
        # Step 3: Update AI CFO Plan in Database
        plan_json = {
            "goal": query,
            "stagedChanges": recommendations,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "structuredResponse": {
                "natural_text": natural_language,  # CRITICAL: Must be actual text, not JSON
                "recommendations": recommendations,
                "calculations": calculations
            },
            "metadata": {
                "processingTimeMs": int((time.time() - start_time) * 1000),
                "modelUsed": gemini_model,
                "worker": "python"
            }
        }
        
        cursor.execute("""
            UPDATE ai_cfo_plans
            SET plan_json = %s::jsonb, 
                status = 'completed',
                updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(plan_json), plan_id))
        
        # Step 4: Mark job as done
        cursor.execute("""
            UPDATE jobs
            SET status = 'done', progress = 100, finished_at = NOW()
            WHERE id = %s
        """, (job_id,))
        
        conn.commit()
        logger.info(f"Successfully completed AICFO Chat job {job_id}")
        
    except Exception as e:
        logger.error(f"Error in AICFO Chat job: {e}", exc_info=True)
        
        # CRITICAL: Even if Gemini fails, provide query-specific fallback response
        # Don't just mark as failed - give user a helpful response
        fallback_success = False
        try:
            # Safely get query and calculations (may not exist if error happened early)
            safe_query = query if 'query' in locals() and query else logs.get('params', {}).get('query', 'your financial query')
            safe_calculations = calculations if 'calculations' in locals() and calculations else logs.get('params', {}).get('calculations', {})
            
            if conn and plan_id:
                # Generate fallback response based on query and calculations
                query_lower = safe_query.lower() if safe_query else ''
                fallback_text = f"Based on your query: '{safe_query}', "
                
                if 'runway' in query_lower or 'cash' in query_lower and 'how long' in query_lower:
                    runway_val = safe_calculations.get('runway', safe_calculations.get('cashRunway', 0))
                    fallback_text += f"your cash runway is approximately {runway_val:.1f} months. "
                    fallback_text += "Consider extending runway through revenue acceleration or expense optimization to reach 12+ months for optimal flexibility."
                elif 'burn' in query_lower or 'burn rate' in query_lower:
                    burn_val = safe_calculations.get('burnRate', safe_calculations.get('monthlyBurnRate', 0))
                    fallback_text += f"your monthly burn rate is ${burn_val:,.0f}. "
                    fallback_text += "Review major expense categories (payroll, marketing, operations) to identify optimization opportunities that can extend your runway."
                elif 'revenue' in query_lower or 'growth' in query_lower:
                    rev_val = safe_calculations.get('revenue', safe_calculations.get('monthlyRevenue', 0))
                    growth_val = safe_calculations.get('growth', safe_calculations.get('revenueGrowth', 0)) * 100
                    fallback_text += f"your monthly revenue is ${rev_val:,.0f} with {growth_val:.1f}% growth. "
                    fallback_text += "Focus on growth acceleration through customer acquisition, retention, and expansion strategies."
                elif 'funding' in query_lower or 'raise' in query_lower:
                    runway_val = safe_calculations.get('runway', 0)
                    fallback_text += f"with a {runway_val:.1f}-month runway, you are in a good position to raise capital. "
                    fallback_text += "Start fundraising 6 months before runway drops below 12 months. Target raising 18-24 months of runway at current burn rate."
                else:
                    # Generic but still helpful
                    runway_val = safe_calculations.get('runway', 0)
                    burn_val = safe_calculations.get('burnRate', 0)
                    rev_val = safe_calculations.get('revenue', 0)
                    fallback_text += f"I've analyzed your financial position: ${rev_val:,.0f} monthly revenue, ${burn_val:,.0f} burn rate, {runway_val:.1f} months runway. "
                    fallback_text += "Key focus areas: optimize burn efficiency, accelerate revenue growth, and maintain healthy cash runway."
                
                fallback_plan = {
                    "goal": safe_query,
                    "stagedChanges": [],
                    "generatedAt": datetime.now(timezone.utc).isoformat(),
                    "structuredResponse": {
                        "natural_text": fallback_text,
                        "recommendations": [],
                        "calculations": safe_calculations,
                        "fallback": True
                    },
                    "metadata": {
                        "processingTimeMs": 0,
                        "modelUsed": "fallback-deterministic",
                        "worker": "python",
                        "error": str(e)[:200]
                    }
                }
                
                conn.rollback()
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE ai_cfo_plans
                    SET plan_json = %s::jsonb, 
                        status = 'completed',
                        updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps(fallback_plan), plan_id))
                
                cursor.execute("""
                    UPDATE jobs
                    SET status = 'done', progress = 100, finished_at = NOW()
                    WHERE id = %s
                """, (job_id,))
                
                conn.commit()
                logger.info(f"✅ Created query-specific fallback response for AICFO Chat job {job_id}")
                fallback_success = True
                return  # Don't re-raise - we provided a response
        except Exception as fallback_error:
            logger.error(f"❌ Error creating fallback response: {fallback_error}", exc_info=True)
            fallback_success = False
        
        # If fallback creation failed, mark job as failed
        if not fallback_success:
            try:
                if conn:
                    conn.rollback()
                    cursor = conn.cursor()
                    cursor.execute("UPDATE jobs SET status = 'failed', last_error = %s WHERE id = %s", (str(e)[:500], job_id))
                    if plan_id:
                        cursor.execute("UPDATE ai_cfo_plans SET status = 'failed' WHERE id = %s", (plan_id,))
                    conn.commit()
            except:
                pass
            raise
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

