"""LLM-powered personalized outreach message generator.

Uses the centralized LLM factory (``create_llm``) so that the configured
provider (Gemini / DeepSeek) is honoured automatically.  Falls back to
template-based messages when the LLM is unavailable.
"""

import logging
import json

from data.database import get_db_session
from data.models import Customer
from agent.llm_factory import create_llm

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_message(
    customer_id: int,
    product_type: str,
    channel: str = "whatsapp",
    rm_name: str = None,
) -> dict:
    """Generate a personalized outreach message for a customer.

    Args:
        customer_id: Target customer ID.
        product_type: Product to promote (e.g., ``'personal_loan'``).
        channel: Message channel — ``'whatsapp'``, ``'email'``, or ``'sms'``.
        rm_name: Optional Relationship Manager name for the sign-off.

    Returns:
        Dict with generated message, subject (for email), and metadata.
    """
    import time

    logger.info("┌─── Message Generator ─────────────────────────")
    logger.info("│ Customer ID  : %d", customer_id)
    logger.info("│ Product Type : %s", product_type)
    logger.info("│ Channel      : %s", channel)
    logger.info("│ RM Name      : %s", rm_name or "(not set)")

    start = time.perf_counter()

    with get_db_session() as db:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            logger.warning("│ ✗ Customer %d not found", customer_id)
            logger.info("└────────────────────────────────────────────────")
            return {"error": f"Customer {customer_id} not found"}

        # Build customer context for the LLM
        context = _build_customer_context(customer)
        logger.info("│ Customer     : %s (tier=%s, city=%s, income=%s)",
                     context["name"], context["tier"], context["city"], context["income_bracket"])
        logger.info("│ Products     : %s", context["existing_products"] or "none")
        logger.info("│ Tenure       : %.1f years", context["tenure_years"])

    prompt = _build_prompt(context, product_type, channel, rm_name)
    logger.info("│ Prompt built  : %d chars", len(prompt))
    logger.debug("│ Prompt text:\n%s", prompt)

    try:
        logger.info("│ Invoking LLM (temperature=0.7)...")
        llm_start = time.perf_counter()
        llm = create_llm(temperature=0.7)
        response = llm.invoke(prompt)
        llm_elapsed = (time.perf_counter() - llm_start) * 1000
        message_text = response.content.strip()

        logger.info("│ ✓ LLM response received in %.1fms (%d chars)",
                     llm_elapsed, len(message_text))
        logger.debug("│ Response preview: %s", message_text[:150])

        result = {
            "customer_id": customer_id,
            "customer_name": context["name"],
            "customer_phone": context["phone"],
            "product_type": product_type,
            "channel": channel,
            "message": message_text,
        }

        # Extract subject for email
        if channel == "email" and "Subject:" in message_text:
            lines = message_text.split("\n", 2)
            if lines[0].startswith("Subject:"):
                result["subject"] = lines[0].replace("Subject:", "").strip()
                result["message"] = "\n".join(lines[1:]).strip()
                logger.info("│ Email subject : %s", result["subject"])

        total_elapsed = (time.perf_counter() - start) * 1000
        logger.info("│ Total time    : %.1fms", total_elapsed)
        logger.info("└────────────────────────────────────────────────")
        return result

    except Exception:
        logger.exception(
            "│ ✗ LLM unavailable — falling back to template for customer %d",
            customer_id,
        )
        total_elapsed = (time.perf_counter() - start) * 1000
        logger.info("│ Fallback used (elapsed: %.1fms)", total_elapsed)
        logger.info("└────────────────────────────────────────────────")
        return _fallback_message(context, _product_display(product_type), channel, rm_name)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_customer_context(customer: Customer) -> dict:
    """Extract a lightweight context dict from a Customer ORM object."""
    import datetime

    return {
        "name": customer.name,
        "first_name": customer.name.split()[0],
        "age": customer.age,
        "occupation": customer.occupation,
        "city": customer.city,
        "tier": customer.relationship_tier,
        "phone": customer.phone,
        "income_bracket": (
            "premium" if customer.annual_income >= 2_000_000
            else "high" if customer.annual_income >= 1_000_000
            else "mid" if customer.annual_income >= 500_000
            else "standard"
        ),
        "existing_products": customer.existing_products or [],
        "tenure_years": round(
            (datetime.date.today() - customer.account_open_date).days / 365.25, 1
        ),
    }


_CHANNEL_INSTRUCTIONS = {
    "whatsapp": (
        "Write a friendly, conversational WhatsApp message. "
        "Use appropriate emojis (2-3 max). Keep it under 200 words. "
        "Start with a greeting using their first name. "
        "Include a clear call-to-action. "
        "Don't be overly formal — WhatsApp is personal."
    ),
    "email": (
        "Write a professional email with subject line. "
        "Format: Subject: <subject>\\n\\n<body>. "
        "Be professional but warm. Include a clear CTA. "
        "Keep the body under 250 words."
    ),
    "sms": (
        "Write a concise SMS under 160 characters. "
        "Include the key offer and a CTA. "
        "No emojis. Be direct and professional."
    ),
}

_PRODUCT_NAMES = {
    "personal_loan": "Personal Loan",
    "home_loan": "Home Loan",
    "credit_card": "Premium Credit Card",
    "mutual_fund": "Mutual Fund SIP",
    "fixed_deposit": "Fixed Deposit",
    "insurance": "Life Insurance",
    "demat_account": "Demat Account",
}


def _product_display(product_type: str) -> str:
    return _PRODUCT_NAMES.get(product_type, product_type.replace("_", " ").title())


def _build_prompt(context: dict, product_type: str, channel: str, rm_name: str | None) -> str:
    """Construct the LLM prompt for outreach message generation."""
    product_display = _product_display(product_type)
    channel_instr = _CHANNEL_INSTRUCTIONS.get(channel, _CHANNEL_INSTRUCTIONS["whatsapp"])

    return f"""Generate a personalized {channel} outreach message for a banking customer.

Customer Context:
- Name: {context['name']} (address as {context['first_name']})
- Age: {context['age']}, {context['occupation']} based in {context['city']}
- Relationship Tier: {context['tier']} customer for {context['tenure_years']} years
- Income Bracket: {context['income_bracket']}
- Existing Products: {', '.join(context['existing_products']) if context['existing_products'] else 'Savings Account only'}

Product to Promote: {product_display}

Channel Instructions: {channel_instr}

Additional Guidelines:
- Reference their existing relationship and tier status
- Personalize based on their occupation and city
- Mention a specific benefit relevant to their profile
- Include urgency without being pushy
- DO NOT include placeholder brackets like [X%] — use realistic sample values
- {"Sign off as the Relationship Manager, " + rm_name if rm_name else "Sign off as the Relationship Manager"}

Generate ONLY the message text, nothing else."""


def _fallback_message(
    context: dict,
    product_display: str,
    channel: str,
    rm_name: str | None = None,
) -> dict:
    """Generate a template-based fallback message if LLM is unavailable."""
    first_name = context["first_name"]
    rm_signoff = f", {rm_name}" if rm_name else ""

    if channel == "whatsapp":
        message = (
            f"Hi {first_name}! 👋\n\n"
            f"As your dedicated Relationship Manager{rm_signoff}, I wanted to reach out with an "
            f"exclusive {product_display} offer tailored for our {context['tier']} customers.\n\n"
            f"Based on your profile, you're pre-approved for attractive rates. "
            f"Would you like me to share the details?\n\n"
            f"Feel free to reply or call me at your convenience. 😊\n\n"
            f"Best regards,\n{rm_name if rm_name else 'Your Relationship Manager'}"
        )
    elif channel == "email":
        message = (
            f"Dear {first_name},\n\n"
            f"I hope this email finds you well. As your dedicated Relationship Manager{rm_signoff}, "
            f"I'm pleased to inform you about an exclusive {product_display} offer "
            f"available to our valued {context['tier']} customers.\n\n"
            f"Given your excellent banking relationship with us over the past "
            f"{context['tenure_years']} years, you are eligible for preferential terms.\n\n"
            f"I would be happy to discuss this further at your convenience.\n\n"
            f"Warm regards,\n{rm_name if rm_name else 'Your Relationship Manager'}"
        )
    else:  # SMS
        message = (
            f"{first_name}, exclusive {product_display} offer for {context['tier']} customers. "
            f"Pre-approved rates available. Call your RM {rm_name if rm_name else ''} for details."
        )

    return {
        "customer_id": None,
        "customer_name": context["name"],
        "customer_phone": context.get("phone"),
        "product_type": product_display,
        "channel": channel,
        "message": message,
        "note": "Generated using fallback template — LLM unavailable",
    }
