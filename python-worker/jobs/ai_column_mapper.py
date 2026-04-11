import os
import json
import requests
from typing import List, Dict, Any
from utils.logger import setup_logger

logger = setup_logger()

# Loading Gemini Config from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# High availability alternate keys
GEMINI_API_KEYS = [GEMINI_API_KEY] if GEMINI_API_KEY else []
for i in range(1, 10):
    k = os.getenv(f"GEMINI_API_KEY_{i}")
    if k and k not in GEMINI_API_KEYS:
        GEMINI_API_KEYS.append(k)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

def analyze_columns_with_ai(headers: List[str], sample_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Uses Google Gemini (LLM) to analyze CSV headers and sample data to provide semantic mapping to our internal schema.
    """
    logger.info(f"AI Column Mapper: Analyzing {len(headers)} headers with {len(sample_rows)} sample rows using Gemini")
    
    # Internal schema definition for prompt context - synchronized with column-mapping.config.ts
    system_prompt = """You are an FP&A AI Data Mapping Assistant.
Given a list of CSV column headers and a sample of rows, map each header to our exact internal financial system schema.

Our Internal Schema Fields:
- date: Transaction or reporting date (DataType: date)
- amount: Main monetary amount (DataType: number)
- revenue: Sales/Income specific amt (DataType: number)
- description: Notes/narration (DataType: string)
- category: GL Account or expense category classification (DataType: string)
- cogs: Cost of goods sold (DataType: number)
- payroll: Salaries/Wages (DataType: number)
- marketing: Advertising/Marketing spend (DataType: number)
- mrr: Monthly recurring revenue (DataType: number)
- arr: Annual recurring revenue (DataType: number)
- customer_count: Total customers (DataType: number)
- churn_rate: Customer churn (DataType: percentage)
- cac: Customer acquisition cost (DataType: number)
- ltv: Customer lifetime value (DataType: number)
- account: Bank account or source (DataType: string)
- reference: Transaction ID/Ref (DataType: string)
- currency: Currency code (DataType: string)

Rules:
1. Return ONLY valid JSON. Ensure the JSON is properly formatted and contains no markdown or extra commentary.
2. For each header, provide the best 'internalField' match if it's confidently related.
3. If a column is generic IDs, empty, or useless for FP&A (like 'Row Number'), mark 'skip': true.
4. Provide a 'confidence' score (0 to 1).
5. Provide a brief 1-sentence 'explanation' string explaining your reasoning based on names or sample data.
6. Look closely at sample data! If 'Value' contains '$500', it's 'amount'. If 'Client ID' is numbers, it's 'skip'.
7. Response format:
{
  "mappings": [
    {
      "csvColumn": "Original Header",
      "internalField": "mapped_field_name",
      "confidence": 0.95,
      "skip": false,
      "explanation": "Brief reason here",
      "method": "ai_semantic"
    }
  ],
  "formatDetected": "custom"
}
"""

    if not GEMINI_API_KEYS:
        logger.warning("No Gemini API keys found in environment, returning empty AI mappings.")
        return {"mappings": [], "formatDetected": "unknown"}

    try:
        user_content = json.dumps({
            "headers": headers,
            "sampleData": sample_rows[:5]  # Limit to 5 rows to save tokens
        })

        # Try API keys in rotation for high availability
        last_error = ""
        for key in GEMINI_API_KEYS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={key}"
                
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": f"{system_prompt}\n\nUser Data For Analysis:\n{user_content}"
                        }]
                    }],
                    "generationConfig": {
                        "temperature": 0.1,
                        "responseMimeType": "application/json"
                    }
                }

                response = requests.post(url, json=payload, timeout=30)
                
                if response.status_code != 200:
                    last_error = f"Gemini API returned status {response.status_code}: {response.text[:200]}"
                    continue

                res_json = response.json()
                
                try:
                    text_content = res_json['candidates'][0]['content']['parts'][0]['text']
                    result = json.loads(text_content)
                    logger.info("AI Column Mapper received valid response from Gemini.")
                    return result
                except (KeyError, IndexError, json.JSONDecodeError) as e:
                    last_error = f"Failed to parse Gemini response: {str(e)}"
                    continue

            except Exception as e:
                last_error = str(e)
                continue
        
        logger.error(f"All Gemini attempts failed: {last_error}")
        return {"mappings": [], "formatDetected": "unknown", "error": last_error}

    except Exception as e:
        logger.error(f"Unexpected error in analyze_columns_with_ai: {str(e)}")
        return {"mappings": [], "formatDetected": "unknown", "error": str(e)}
