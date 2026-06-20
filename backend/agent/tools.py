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
def get_customer_profile(customer_id: int) -> str:
    """Get detailed 360-degree profile for a specific customer.
    
    Returns complete demographics, account information, existing products,
    recent interaction history, and relationship metrics.
    
    Args:
        customer_id: The unique customer ID
    
    Returns:
        JSON object with full customer profile
    """
    logger.info("🔧 [TOOL] get_customer_profile(customer_id=%d)", customer_id)
    start = time.perf_counter()
    result = _api_get(f"/api/v1/customers/{customer_id}")
    elapsed = (time.perf_counter() - start) * 1000
    customer_name = result.get("name", "unknown") if isinstance(result, dict) else "unknown"
    logger.info("🔧 [TOOL] get_customer_profile → customer='%s' in %.1fms", customer_name, elapsed)
    return json.dumps(result, indent=2, default=str)


@tool
def get_customer_transactions(customer_id: int, months: int = 6) -> str:
    """Fetch transaction history and spending analysis for a customer.
    
    Returns recent transactions plus aggregated summary including
    income, expenses, top spending categories, and EMI burden analysis.
    
    Args:
        customer_id: The unique customer ID
        months: Number of months of history to fetch (1-24, default 6)
    
    Returns:
        JSON with transactions list and summary statistics
    """
    logger.info("🔧 [TOOL] get_customer_transactions(customer_id=%d, months=%d)", customer_id, months)
    start = time.perf_counter()
    result = _api_get(f"/api/v1/customers/{customer_id}/transactions", {"months": months})
    # Trim individual transactions for readability, keep summary
    txn_count = len(result.get("transactions", [])) if isinstance(result, dict) else 0
    if "transactions" in result and len(result["transactions"]) > 10:
        result["transactions"] = result["transactions"][:10]
        result["note"] = "Showing 10 most recent transactions. Full data available via API."
    elapsed = (time.perf_counter() - start) * 1000
    logger.info("🔧 [TOOL] get_customer_transactions → %d transactions (trimmed to %d) in %.1fms",
                txn_count, len(result.get("transactions", [])), elapsed)
    return json.dumps(result, indent=2, default=str)


@tool
def get_credit_score(customer_id: int) -> str:
    """Get credit score and detailed factor breakdown for a customer.
    
    Returns the credit score, rating category (Excellent/Good/Fair/Poor),
    and individual factors that contribute to the score.
    
    Args:
        customer_id: The unique customer ID
    
    Returns:
        JSON with score, rating, and factor analysis
    """
    logger.info("🔧 [TOOL] get_credit_score(customer_id=%d)", customer_id)
    start = time.perf_counter()
    result = _api_get(f"/api/v1/customers/{customer_id}/credit-score")
    elapsed = (time.perf_counter() - start) * 1000
    score = result.get("score", "?") if isinstance(result, dict) else "?"
    rating = result.get("rating", "?") if isinstance(result, dict) else "?"
    logger.info("🔧 [TOOL] get_credit_score → score=%s, rating=%s in %.1fms", score, rating, elapsed)
    return json.dumps(result, indent=2, default=str)


@tool
def check_product_eligibility(customer_id: int) -> str:
    """Check which banking products a customer is eligible for.
    
    Evaluates each product against the customer's income and credit score.
    Returns eligibility status, fit score (0-100), and detailed reasons.
    
    Args:
        customer_id: The unique customer ID
    
    Returns:
        JSON with list of products and their eligibility details
    """
    logger.info("🔧 [TOOL] check_product_eligibility(customer_id=%d)", customer_id)
    start = time.perf_counter()
    result = _api_get(f"/api/v1/customers/{customer_id}/product-eligibility")
    elapsed = (time.perf_counter() - start) * 1000
    eligible_count = sum(1 for p in result.get("eligible_products", []) if p.get("eligible")) if isinstance(result, dict) else 0
    total_products = len(result.get("eligible_products", [])) if isinstance(result, dict) else 0
    logger.info("🔧 [TOOL] check_product_eligibility → %d/%d eligible in %.1fms", eligible_count, total_products, elapsed)
    return json.dumps(result, indent=2, default=str)


@tool
def score_lead_conversion(customer_id: int, product_type: str) -> str:
    """Score a customer's likelihood to convert for a specific product.
    
    Uses a multi-factor scoring engine that evaluates income adequacy,
    credit score, spending capacity, EMI burden, engagement recency,
    product gaps, relationship tenure, and salary trends.
    
    Returns a score (0-100), confidence level, and detailed factor breakdown.
    
    Args:
        customer_id: The unique customer ID
        product_type: Product type to score for. Options:
            - personal_loan
            - home_loan  
            - credit_card
            - mutual_fund
            - fixed_deposit
            - insurance
    
    Returns:
        JSON with score, label (High/Medium/Low), factors, and summary
    """
    logger.info("🔧 [TOOL] score_lead_conversion(customer_id=%d, product_type='%s')", customer_id, product_type)
    start = time.perf_counter()
    result = score_customer(customer_id, product_type)
    elapsed = (time.perf_counter() - start) * 1000
    score = result.get("score", "?")
    label = result.get("label", "?")
    logger.info("🔧 [TOOL] score_lead_conversion → score=%s, label=%s in %.1fms", score, label, elapsed)
    return json.dumps(result, indent=2, default=str)


@tool
def generate_outreach_message(customer_id: int, product_type: str, channel: str = "whatsapp", config: RunnableConfig = None) -> str:
    """Generate a personalized outreach message for a customer.
    
    Creates a contextual, personalized message based on the customer's profile,
    relationship history, and the target product. Messages are tailored to the
    communication channel.
    
    Args:
        customer_id: The unique customer ID
        product_type: Product to promote (e.g., 'personal_loan')
        channel: Message channel. Options:
            - whatsapp (friendly, emoji-friendly, conversational)
            - email (professional with subject line)
            - sms (concise, under 160 chars)
    
    Returns:
        JSON with the generated message and metadata
    """
    logger.info("🔧 [TOOL] generate_outreach_message(customer_id=%d, product_type='%s', channel='%s')",
                customer_id, product_type, channel)
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
                else:
                    logger.debug("  No user found for thread user_id=%s", thread.user_id)
            else:
                logger.debug("  No thread found for id=%s", thread_id)
        except Exception as e:
            logger.error("  Failed to query user for thread_id %s: %s", thread_id, e, exc_info=True)
        finally:
            db.close()

    result = generate_message(customer_id, product_type, channel, rm_name=rm_name)
    elapsed = (time.perf_counter() - start) * 1000
    msg_len = len(result.get("message", "")) if isinstance(result, dict) else 0
    logger.info("🔧 [TOOL] generate_outreach_message → %d char message in %.1fms", msg_len, elapsed)
    return json.dumps(result, indent=2, default=str)


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
