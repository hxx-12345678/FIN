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
from jobs.reasoning_engine import ModelReasoningEngine

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

def handle_aicfo_chat(job_id: str, org_id: str, object_id: str, logs: dict):
    """
    Handle AI CFO Chat request from Python worker for better performance and data processing.
    """
    logger.info(f"Processing AICFO Chat job {job_id} for org {org_id}")
    
    gemini_model = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
    
    api_keys = []
    if os.getenv('GEMINI_API_KEY'): 
        api_keys.append(os.getenv('GEMINI_API_KEY'))
    for i in range(1, 10):
        key = os.getenv(f'GEMINI_API_KEY_{i}')
        if key:
            api_keys.append(key)
    
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
            
        calculations = params.get('calculations', {})
        grounding_context = params.get('groundingContext', {})
        evidence = grounding_context.get('evidence', [])
        
        model_state = {}
        model_id = None
        if model_run_id:
            cursor.execute('SELECT model_id, summary_json FROM model_runs WHERE id = %s', (model_run_id,))
            row = cursor.fetchone()
            if row:
                model_id = str(row[0])
                raw_summary = row[1]
                if raw_summary is None:
                    model_state = {}
                elif isinstance(raw_summary, dict):
                    model_state = raw_summary
                else:
                    try:
                        model_state = json.loads(str(raw_summary))
                    except:
                        model_state = {}
        
        analysis_summary = "No deep model analysis available."
        analytical_insights = []
        
        if model_id:
            try:
                engine = ModelReasoningEngine(model_id)
                cursor.execute("""
                    SELECT d.id, d.name, d.category, f.expression 
                    FROM drivers d
                    LEFT JOIN driver_formulas f ON d.id = f."driverId"
                    WHERE d."modelId" = %s
                """, (model_id,))
                node_rows = cursor.fetchall()
                model_nodes = [{"id": str(r[0]), "name": r[1], "category": r[2], "formula": r[3]} for r in node_rows]
                
                months = model_state.get('months', [])
                metrics = model_state.get('metrics', {})
                engine.hydrate_from_json(model_nodes, metrics, months)
                
                targets = ['revenue', 'netIncome', 'cashBalance', 'burnRate']
                for target in targets:
                    res = engine.analyze_drivers(target)
                    if 'drivers' in res:
                        analytical_insights.append({
                            "target": target,
                            "top_drivers": res['drivers'][:3]
                        })
                
                weak_points = engine.detect_weak_assumptions()
                if weak_points:
                    analytical_insights.append({"weak_assumptions": weak_points})
                
                analysis_summary = json.dumps(analytical_insights, indent=2)
            except Exception as ae:
                logger.warning(f"Model reasoning engine failed: {ae}")
                analysis_summary = f"Analytical engine error: {str(ae)}"
        
        system_prompt = """You are a world-class Chief Financial Officer (CFO) and strategic advisor. 
        Your task is to generate institutional-grade financial analysis and board-level narratives.

        CRITICAL OUTPUT REQUIREMENTS:
        1. FORMAT: You MUST respond ONLY in valid JSON. No markdown codeblocks, no preamble.
        2. STRUCTURE: If the user query implies a "board report", "investor update", or "comprehensive analysis", follow this structure:
           {
             "executiveSummary": "A high-level overview of performance, strategic milestones, and primary takeaways (300-400 words).",
             "kpiAnalysis": "A deep dive into specific metrics (Revenue, Burn, NRR, LTV/CAC), explaining the 'why' behind the numbers (200-300 words).",
             "functionalHighlights": "Specific commentary on Sales, Marketing, and Operations performance (150-200 words).",
             "strategicRecommendations": ["At least 3 high-impact, data-driven actions"],
             "risksAndMitigations": "Analysis of current exposure and planned counter-measures (100-150 words).",
             "naturalLanguage": "A cohesive full-length narrative combining all the above for a professional report (500-800 words)."
           }
        3. CONTENT QUALITY:
           - Use sophisticated, CFO-level vocabulary (e.g., 'capital efficiency', 'operating leverage', 'unit profitability', 'bridge analysis').
           - NO HALLUCINATIONS: Use the provided METRICS and CONTEXT. If missing, make logical inferences based on startup benchmarks but explicitly label them as strategic assessments.
           - LENGTH IS MANDATORY: For comprehensive report queries, the 'naturalLanguage' field MUST exceed 500 words. Total JSON content should be substantial.
           - Be decisive and analytical, not just descriptive. Don't just say 'Revenue increased', say 'Revenue growth of X% indicates strong market fit, though we must monitor the Y% increase in CAC which may signal channel saturation.'
        """
        
        context_text = "\n".join([f"- {str(e.get('content', ''))}" for e in evidence])
        
        user_prompt = f"""
        QUERY: "{query}"
        METRICS: {json.dumps(calculations)}
        CONTEXT: {context_text}
        MODEL_ANALYSIS: {analysis_summary}
        """
        
        last_error = None
        response: Optional[requests.Response] = None
        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
        api_versions = ['v1beta']
        
        start_time = time.time()
        for model_name in models_to_try:
            if response: break
            for api_version in api_versions:
                if response: break
                for idx, api_key in enumerate(api_keys):
                    try:
                        url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model_name}:generateContent?key={api_key}"
                        payload: Dict[str, Any] = {
                            "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
                            "generationConfig": {
                                "temperature": 0.7,
                                "maxOutputTokens": 4096,
                            }
                        }
                        
                        if api_version == 'v1beta':
                            payload["generationConfig"]["response_mime_type"] = "application/json"

                        resp = requests.post(url, json=payload, timeout=60)
                        if resp.status_code == 200:
                            response = resp
                            gemini_model = model_name
                            break
                        else:
                            last_error = resp.text
                    except Exception as e:
                        last_error = str(e)
        
        parsed = None
        natural_language = ''
        recommendations = []
        
        if response and hasattr(response, 'json'):
            try:
                result_data = response.json()
                content = result_data['candidates'][0]['content']['parts'][0]['text']
                
                # Clean up common LLM JSON artifacts
                json_str = content.strip()
                
                # Remove markdown blocks if present
                if '```json' in json_str:
                    json_str = json_str.split('```json')[1].split('```')[0].strip()
                elif '```' in json_str:
                    json_str = json_str.split('```')[1].split('```')[0].strip()
                
                # Remove any non-printable control characters that break JSON
                json_str = "".join(char for char in json_str if ord(char) >= 32 or char in "\n\r\t")
                
                # Find first { and last } to isolate the object
                start_idx = json_str.find('{')
                end_idx = json_str.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    json_str = json_str[start_idx:end_idx+1]
                
                try:
                    parsed = json.loads(json_str)
                except json.JSONDecodeError:
                    # Attempt manual fix for common issues: trailing commas and unescaped newlines in strings
                    # 1. Trailing commas
                    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                    # 2. Unescaped newlines in JSON strings (harder, but we can try)
                    # Replace real newlines inside quotes with \n
                    def fix_newlines(m):
                        return m.group(0).replace('\n', '\\n').replace('\r', '\\r')
                    json_str = re.sub(r'"[^"]*[\n\r][^"]*"', fix_newlines, json_str)
                    
                    try:
                        parsed = json.loads(json_str)
                    except:
                        # Final fallback: regex-based extraction of known fields
                        logger.warning("Standard JSON parsing failed, using expanded regex extraction")
                        
                        # Try to find naturalLanguage - look for everything between quotes after the key
                        nl_match = re.search(r'"(?:naturalLanguage|executiveSummary|summary)":\s*"(.*?)"(?=\s*,\s*"|\s*})', json_str, re.DOTALL)
                        if not nl_match:
                            nl_match = re.search(r'"(?:naturalLanguage|executiveSummary|summary)":\s*"(.*)', json_str, re.DOTALL)
                        
                        # Try to find recommendations array
                        rec_match = re.search(r'"recommendations":\s*\[(.*?)]', json_str, re.DOTALL)
                        
                        parsed = {
                            "naturalLanguage": nl_match.group(1).replace('\\n', '\n').strip() if nl_match else "",
                            "recommendations": []
                        }
                        
                        # Clean up if we matched everything till the end
                        if parsed["naturalLanguage"].endswith('"}'):
                            parsed["naturalLanguage"] = parsed["naturalLanguage"][:-2]
                        
                        if rec_match:
                            rec_text = rec_match.group(1)
                            # Handle both quoted strings and objects in the recommendations array
                            recs = re.findall(r'"(.*?)"', rec_text)
                            parsed["recommendations"] = [r for r in recs if len(r) > 5]
            
                if parsed:
                    natural_language = parsed.get('naturalLanguage', '')
                    recommendations = parsed.get('recommendations', [])
            except Exception as pe:
                logger.error(f"Failed to parse LLM response: {pe}")
        
        if not natural_language:
            natural_language = generateNaturalLanguageFromQuery(query, calculations)
            
        plan_json = {
            "goal": query,
            "stagedChanges": recommendations,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "structuredResponse": {
                "natural_text": natural_language,
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
            SET plan_json = %s::jsonb, status = 'completed', updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(plan_json), plan_id))
        
        cursor.execute("UPDATE jobs SET status = 'done', progress = 100, finished_at = NOW() WHERE id = %s", (job_id,))
        conn.commit()
        
    except Exception as e:
        logger.error(f"Error in handle_aicfo_chat: {e}", exc_info=True)
        if conn and plan_id:
            try:
                conn.rollback()
                cursor = conn.cursor()
                # Create a minimal fallback
                fallback_text = generateNaturalLanguageFromQuery(query if 'query' in locals() else '', calculations if 'calculations' in locals() else {})
                err_str = str(e)
                err_sub = err_str[0:200]  # type: ignore
                fallback_plan = {
                    "goal": query if 'query' in locals() else 'Request',
                    "stagedChanges": [],
                    "structuredResponse": {"natural_text": fallback_text, "fallback": True},
                    "metadata": {"error": err_sub}
                }
                cursor.execute("UPDATE ai_cfo_plans SET plan_json = %s::jsonb, status = 'completed' WHERE id = %s", (json.dumps(fallback_plan), plan_id))
                cursor.execute("UPDATE jobs SET status = 'done', finished_at = NOW() WHERE id = %s", (job_id,))
                conn.commit()
            except:
                pass
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
