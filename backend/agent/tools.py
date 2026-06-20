"""LangChain tool definitions for the Banking CRM Agent.

Each tool wraps an HTTP call to the bank's REST APIs or an internal service.
This design clearly demonstrates structured tool usage — the agent makes
real API calls that are logged and traceable.
"""

import logging
import time

import json
import httpx
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig

from config import API_BASE_URL
from agent.scoring import score_customer
from agent.message_generator import generate_message
from data.database import SessionLocal
from data.models import User, ChatThread

logger = logging.getLogger(__name__)


# --- HTTP Client ---
# Using sync httpx client for simplicity in this demo
_client = httpx.Client(base_url=API_BASE_URL, timeout=30.0)


def _api_get(path: str, params: dict = None) -> dict:
    """Make a GET request to the banking API."""
    # Filter out None values from params
    if params:
        params = {k: v for k, v in params.items() if v is not None}
    logger.info("  → HTTP GET %s%s params=%s", API_BASE_URL, path, params or "{}")
    start = time.perf_counter()
    try:
        response = _client.get(path, params=params)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info("  ← HTTP %d in %.1fms (body: %d bytes)", response.status_code, elapsed, len(response.content))
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        elapsed = (time.perf_counter() - start) * 1000
        logger.error("  ✗ HTTP error %d for GET %s in %.1fms: %s",
                      e.response.status_code, path, elapsed, e.response.text[:200])
        raise
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        logger.error("  ✗ Request failed for GET %s in %.1fms: %s", path, elapsed, e)
        raise


# --- Tool Definitions ---

@tool
def search_customers(
    min_income: int = None,
    min_credit_score: int = None,
    tier: str = None,
    city: str = None,
    without_product: str = None,
    limit: int = 15,
) -> str:
    """Search for customers matching specific criteria.
    
    Use this tool to find customer segments for targeted campaigns.
    You can filter by income, credit score, relationship tier, city,
    and whether they lack a specific product.
    
    Args:
        min_income: Minimum annual income (e.g., 800000 for 8 lakh)
        min_credit_score: Minimum credit score (e.g., 700)
        tier: Relationship tier filter (Platinum, Gold, Silver, Bronze)
        city: City name filter
        without_product: Find customers who DON'T have this product (e.g., 'personal_loan')
        limit: Maximum number of results (default 15)
    
    Returns:
        JSON list of customer summaries with key fields
    """
    logger.info("🔧 [TOOL] search_customers(min_income=%s, min_credit_score=%s, tier=%s, city=%s, without_product=%s, limit=%s)",
                min_income, min_credit_score, tier, city, without_product, limit)
    start = time.perf_counter()
    params = {
        "min_income": min_income,
        "min_credit_score": min_credit_score,
        "tier": tier,
        "city": city,
        "without_product": without_product,
        "limit": limit,
    }
    result = _api_get("/api/v1/customers", params)
    elapsed = (time.perf_counter() - start) * 1000
    result_json = json.dumps(result, indent=2, default=str)
    logger.info("🔧 [TOOL] search_customers → %d results returned in %.1fms", len(result) if isinstance(result, list) else 1, elapsed)
    return result_json


@tool
def get_customer_profile(customer_id: int = None, customer_ids: str = None) -> str:
    """Get detailed 360-degree profile for one or more specific customers.
    
    Args:
        customer_id: The unique customer ID (for single customer lookup)
        customer_ids: Comma-separated list of customer IDs (e.g. '1, 2, 3') for batch lookup
    
    Returns:
        JSON object or list of profiles
    """
    logger.info("🔧 [TOOL] get_customer_profile(customer_id=%s, customer_ids=%s)", customer_id, customer_ids)
    start = time.perf_counter()
    
    ids = []
    if customer_id is not None:
        ids.append(customer_id)
    if customer_ids:
        for part in customer_ids.split(","):
            part = part.strip()
            if part.isdigit():
                ids.append(int(part))
                
    ids = list(dict.fromkeys(ids))
    if not ids:
        return json.dumps({"error": "No valid customer IDs provided"})
        
    results = []
    for cid in ids:
        try:
            profile = _api_get(f"/api/v1/customers/{cid}")
            results.append(profile)
        except Exception as e:
            results.append({"id": cid, "error": f"Failed to retrieve profile: {e}"})
            
    elapsed = (time.perf_counter() - start) * 1000
    is_batch = len(ids) > 1 or (customer_ids is not None and "," in customer_ids)
    
    if is_batch:
        logger.info("🔧 [TOOL] get_customer_profile (batch of %d) finished in %.1fms", len(ids), elapsed)
        return json.dumps(results, indent=2, default=str)
    else:
        customer_name = results[0].get("name", "unknown") if results and "error" not in results[0] else "unknown"
        logger.info("🔧 [TOOL] get_customer_profile → customer='%s' in %.1fms", customer_name, elapsed)
        return json.dumps(results[0] if results else {}, indent=2, default=str)


@tool
def get_customer_transactions(customer_id: int = None, customer_ids: str = None, months: int = 6) -> str:
    """Fetch transaction history and spending analysis for one or more customers.
    
    Args:
        customer_id: The unique customer ID (for single customer lookup)
        customer_ids: Comma-separated list of customer IDs (e.g. '1, 2, 3') for batch lookup
        months: Number of months of history to fetch (1-24, default 6)
    
    Returns:
        JSON object or list of transaction responses
    """
    logger.info("🔧 [TOOL] get_customer_transactions(customer_id=%s, customer_ids=%s, months=%d)", customer_id, customer_ids, months)
    start = time.perf_counter()
    
    ids = []
    if customer_id is not None:
        ids.append(customer_id)
    if customer_ids:
        for part in customer_ids.split(","):
            part = part.strip()
            if part.isdigit():
                ids.append(int(part))
                
    ids = list(dict.fromkeys(ids))
    if not ids:
        return json.dumps({"error": "No valid customer IDs provided"})
        
    results = []
    for cid in ids:
        try:
            res = _api_get(f"/api/v1/customers/{cid}/transactions", {"months": months})
            # Trim individual transactions for readability, keep summary
            txn_count = len(res.get("transactions", [])) if isinstance(res, dict) else 0
            if "transactions" in res and len(res["transactions"]) > 10:
                res["transactions"] = res["transactions"][:10]
                res["note"] = "Showing 10 most recent transactions. Full data available via API."
            results.append(res)
        except Exception as e:
            results.append({"customer_id": cid, "error": f"Failed to retrieve transactions: {e}"})
            
    elapsed = (time.perf_counter() - start) * 1000
    is_batch = len(ids) > 1 or (customer_ids is not None and "," in customer_ids)
    
    if is_batch:
        logger.info("🔧 [TOOL] get_customer_transactions (batch of %d) finished in %.1fms", len(ids), elapsed)
        return json.dumps(results, indent=2, default=str)
    else:
        logger.info("🔧 [TOOL] get_customer_transactions → finished in %.1fms", elapsed)
        return json.dumps(results[0] if results else {}, indent=2, default=str)


@tool
def get_credit_score(customer_id: int = None, customer_ids: str = None) -> str:
    """Get credit score and detailed factor breakdown for one or more customers.
    
    Args:
        customer_id: The unique customer ID (for single customer lookup)
        customer_ids: Comma-separated list of customer IDs (e.g. '1, 2, 3') for batch lookup
    
    Returns:
        JSON object or list of credit score responses
    """
    logger.info("🔧 [TOOL] get_credit_score(customer_id=%s, customer_ids=%s)", customer_id, customer_ids)
    start = time.perf_counter()
    
    ids = []
    if customer_id is not None:
        ids.append(customer_id)
    if customer_ids:
        for part in customer_ids.split(","):
            part = part.strip()
            if part.isdigit():
                ids.append(int(part))
                
    ids = list(dict.fromkeys(ids))
    if not ids:
        return json.dumps({"error": "No valid customer IDs provided"})
        
    results = []
    for cid in ids:
        try:
            res = _api_get(f"/api/v1/customers/{cid}/credit-score")
            results.append(res)
        except Exception as e:
            results.append({"customer_id": cid, "error": f"Failed to retrieve credit score: {e}"})
            
    elapsed = (time.perf_counter() - start) * 1000
    is_batch = len(ids) > 1 or (customer_ids is not None and "," in customer_ids)
    
    if is_batch:
        logger.info("🔧 [TOOL] get_credit_score (batch of %d) finished in %.1fms", len(ids), elapsed)
        return json.dumps(results, indent=2, default=str)
    else:
        score = results[0].get("score", "?") if results and "error" not in results[0] else "?"
        rating = results[0].get("rating", "?") if results and "error" not in results[0] else "?"
        logger.info("🔧 [TOOL] get_credit_score → score=%s, rating=%s in %.1fms", score, rating, elapsed)
        return json.dumps(results[0] if results else {}, indent=2, default=str)


@tool
def check_product_eligibility(customer_id: int = None, customer_ids: str = None) -> str:
    """Check which banking products one or more customers are eligible for.
    
    Args:
        customer_id: The unique customer ID (for single customer lookup)
        customer_ids: Comma-separated list of customer IDs (e.g. '1, 2, 3') for batch lookup
    
    Returns:
        JSON object or list of product eligibility responses
    """
    logger.info("🔧 [TOOL] check_product_eligibility(customer_id=%s, customer_ids=%s)", customer_id, customer_ids)
    start = time.perf_counter()
    
    ids = []
    if customer_id is not None:
        ids.append(customer_id)
    if customer_ids:
        for part in customer_ids.split(","):
            part = part.strip()
            if part.isdigit():
                ids.append(int(part))
                
    ids = list(dict.fromkeys(ids))
    if not ids:
        return json.dumps({"error": "No valid customer IDs provided"})
        
    results = []
    for cid in ids:
        try:
            res = _api_get(f"/api/v1/customers/{cid}/product-eligibility")
            results.append(res)
        except Exception as e:
            results.append({"customer_id": cid, "error": f"Failed to retrieve eligibility: {e}"})
            
    elapsed = (time.perf_counter() - start) * 1000
    is_batch = len(ids) > 1 or (customer_ids is not None and "," in customer_ids)
    
    if is_batch:
        logger.info("🔧 [TOOL] check_product_eligibility (batch of %d) finished in %.1fms", len(ids), elapsed)
        return json.dumps(results, indent=2, default=str)
    else:
        logger.info("🔧 [TOOL] check_product_eligibility → finished in %.1fms", elapsed)
        return json.dumps(results[0] if results else {}, indent=2, default=str)


@tool
def score_lead_conversion(customer_id: int = None, customer_ids: str = None, product_type: str = None) -> str:
    """Score conversion likelihood for one or more customers for a specific product.
    
    Args:
        customer_id: The unique customer ID (for single customer scoring)
        customer_ids: Comma-separated list of customer IDs (e.g. '1, 2, 3') for batch scoring
        product_type: Product type to score for. Options: personal_loan, home_loan, credit_card, mutual_fund, fixed_deposit, insurance
    
    Returns:
        JSON object or list of scoring results
    """
    logger.info("🔧 [TOOL] score_lead_conversion(customer_id=%s, customer_ids=%s, product_type='%s')", customer_id, customer_ids, product_type)
    start = time.perf_counter()
    
    ids = []
    if customer_id is not None:
        ids.append(customer_id)
    if customer_ids:
        for part in customer_ids.split(","):
            part = part.strip()
            if part.isdigit():
                ids.append(int(part))
                
    ids = list(dict.fromkeys(ids))
    if not ids:
        return json.dumps({"error": "No valid customer IDs provided"})
        
    results = []
    for cid in ids:
        try:
            res = score_customer(cid, product_type)
            results.append(res)
        except Exception as e:
            results.append({"customer_id": cid, "product_type": product_type, "error": f"Failed to score: {e}"})
            
    elapsed = (time.perf_counter() - start) * 1000
    is_batch = len(ids) > 1 or (customer_ids is not None and "," in customer_ids)
    
    if is_batch:
        logger.info("🔧 [TOOL] score_lead_conversion (batch of %d) finished in %.1fms", len(ids), elapsed)
        return json.dumps(results, indent=2, default=str)
    else:
        score = results[0].get("score", "?") if results and "error" not in results[0] else "?"
        label = results[0].get("label", "?") if results and "error" not in results[0] else "?"
        logger.info("🔧 [TOOL] score_lead_conversion → score=%s, label=%s in %.1fms", score, label, elapsed)
        return json.dumps(results[0] if results else {}, indent=2, default=str)


@tool
def generate_outreach_message(
    customer_id: int = None,
    customer_ids: str = None,
    product_type: str = None,
    channel: str = "whatsapp",
    config: RunnableConfig = None
) -> str:
    """Generate a personalized outreach message for one or more customers.
    
    Args:
        customer_id: The unique customer ID (for single customer lookup)
        customer_ids: Comma-separated list of customer IDs (e.g. '1, 2, 3') for batch message generation
        product_type: Product to promote (e.g., 'personal_loan')
        channel: Message channel. Options: whatsapp, email, sms
    
    Returns:
        JSON object or list of generated messages
    """
    logger.info("🔧 [TOOL] generate_outreach_message(customer_id=%s, customer_ids=%s, product_type='%s', channel='%s')",
                customer_id, customer_ids, product_type, channel)
    start = time.perf_counter()
    thread_id = config.get("configurable", {}).get("thread_id", "default") if config else "default"
    logger.debug("  Thread ID for RM lookup: %s", thread_id)
    
    rm_name = None
    if thread_id and thread_id != "default":
        db = SessionLocal()
        try:
            thread = db.query(ChatThread).filter(ChatThread.id == thread_id).first()
            if thread:
                user = db.query(User).filter(User.id == thread.user_id).first()
                if user:
                    rm_name = user.full_name
                    logger.info("  Resolved RM name: '%s' from thread %s", rm_name, thread_id)
        except Exception as e:
            logger.error("  Failed to query user for thread_id %s: %s", thread_id, e)
        finally:
            db.close()

    ids = []
    if customer_id is not None:
        ids.append(customer_id)
    if customer_ids:
        for part in customer_ids.split(","):
            part = part.strip()
            if part.isdigit():
                ids.append(int(part))
                
    ids = list(dict.fromkeys(ids))
    if not ids:
        return json.dumps({"error": "No valid customer IDs provided"})
        
    results = []
    for cid in ids:
        try:
            res = generate_message(cid, product_type, channel, rm_name=rm_name)
            results.append(res)
        except Exception as e:
            results.append({"customer_id": cid, "product_type": product_type, "channel": channel, "error": f"Failed to generate message: {e}"})
            
    elapsed = (time.perf_counter() - start) * 1000
    is_batch = len(ids) > 1 or (customer_ids is not None and "," in customer_ids)
    
    if is_batch:
        logger.info("🔧 [TOOL] generate_outreach_message (batch of %d) finished in %.1fms", len(ids), elapsed)
        return json.dumps(results, indent=2, default=str)
    else:
        msg_len = len(results[0].get("message", "")) if results and "error" not in results[0] else 0
        logger.info("🔧 [TOOL] generate_outreach_message → %d char message in %.1fms", msg_len, elapsed)
        return json.dumps(results[0] if results else {}, indent=2, default=str)


# Export all tools as a list for the agent
ALL_TOOLS = [
    search_customers,
    get_customer_profile,
    get_customer_transactions,
    get_credit_score,
    check_product_eligibility,
    score_lead_conversion,
    generate_outreach_message,
]

logger.info("Registered %d agent tools: %s", len(ALL_TOOLS), [t.name for t in ALL_TOOLS])
