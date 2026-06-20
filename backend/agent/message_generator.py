"""LLM-powered personalized outreach message generator.

Uses Google Gemini to create contextual, personalized messages for
different channels (WhatsApp, Email, SMS) based on customer profile data.
"""

import json
from langchain_google_genai import ChatGoogleGenerativeAI
from data.database import get_db_session
from data.models import Customer
from config import GOOGLE_API_KEY, LLM_MODEL


def _get_llm():
    """Get a configured LLM instance for message generation."""
    return ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        google_api_key=GOOGLE_API_KEY,
        temperature=0.7,
    )


def generate_message(customer_id: int, product_type: str, channel: str = "whatsapp", rm_name: str = None) -> dict:
    """Generate a personalized outreach message for a customer.
    
    Args:
        customer_id: Target customer ID
        product_type: Product to promote (e.g., 'personal_loan')
        channel: Message channel — 'whatsapp', 'email', or 'sms'
    
    Returns:
        Dict with generated message, subject (for email), and metadata
    """
    with get_db_session() as db:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": f"Customer {customer_id} not found"}

        # Build customer context for the LLM
        context = {
            "name": customer.name,
            "first_name": customer.name.split()[0],
            "age": customer.age,
            "occupation": customer.occupation,
            "city": customer.city,
            "tier": customer.relationship_tier,
            "phone": customer.phone,
            "income_bracket": (
                "premium" if customer.annual_income >= 2000000
                else "high" if customer.annual_income >= 1000000
                else "mid" if customer.annual_income >= 500000
                else "standard"
            ),
            "existing_products": customer.existing_products or [],
            "tenure_years": round(((__import__('datetime').date.today() - customer.account_open_date).days) / 365.25, 1),
        }

    # Channel-specific instructions
    channel_instructions = {
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

    product_names = {
        "personal_loan": "Personal Loan",
        "home_loan": "Home Loan",
        "credit_card": "Premium Credit Card",
        "mutual_fund": "Mutual Fund SIP",
        "fixed_deposit": "Fixed Deposit",
        "insurance": "Life Insurance",
        "demat_account": "Demat Account",
    }

    product_display = product_names.get(product_type, product_type.replace("_", " ").title())

    prompt = f"""Generate a personalized {channel} outreach message for a banking customer.

Customer Context:
- Name: {context['name']} (address as {context['first_name']})
- Age: {context['age']}, {context['occupation']} based in {context['city']}
- Relationship Tier: {context['tier']} customer for {context['tenure_years']} years
- Income Bracket: {context['income_bracket']}
- Existing Products: {', '.join(context['existing_products']) if context['existing_products'] else 'Savings Account only'}

Product to Promote: {product_display}

Channel Instructions: {channel_instructions.get(channel, channel_instructions['whatsapp'])}

Additional Guidelines:
- Reference their existing relationship and tier status
- Personalize based on their occupation and city
- Mention a specific benefit relevant to their profile
- Include urgency without being pushy
- DO NOT include placeholder brackets like [X%] — use realistic sample values
- {f"Sign off as the Relationship Manager, {rm_name}" if rm_name else "Sign off as the Relationship Manager"}

Generate ONLY the message text, nothing else."""

    try:
        llm = _get_llm()
        response = llm.invoke(prompt)
        message_text = response.content.strip()

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

        return result

    except Exception as e:
        # Fallback template-based message if LLM fails
        return _fallback_message(context, product_display, channel, rm_name)


def _fallback_message(context: dict, product_display: str, channel: str, rm_name: str = None) -> dict:
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
