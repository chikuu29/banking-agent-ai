"""Conversion scoring engine.

Rule-based heuristic scoring system that estimates a customer's likelihood
to convert for a specific banking product. Designed to be transparent and
explainable — each factor contribution is visible.
"""

from dataclasses import dataclass
from datetime import date
from sqlalchemy.orm import Session

from data.models import Customer, Transaction, Interaction
from data.database import get_db_session


@dataclass
class ScoringFactor:
    """A single factor contributing to the conversion score."""
    name: str
    score: float       # 0-100
    weight: float      # 0-1
    detail: str


@dataclass
class ConversionScore:
    """Complete conversion scoring result."""
    customer_id: int
    customer_name: str
    product_type: str
    score: int          # 0-100 weighted total
    label: str          # High / Medium / Low
    confidence: str     # High / Medium / Low
    factors: list[ScoringFactor]
    summary: str


# Weight configurations per product type
PRODUCT_WEIGHTS = {
    "personal_loan": {
        "income_adequacy": 0.20,
        "credit_score": 0.20,
        "spending_capacity": 0.15,
        "emi_burden": 0.15,
        "engagement_recency": 0.10,
        "product_gap": 0.10,
        "relationship_tenure": 0.05,
        "salary_trend": 0.05,
    },
    "credit_card": {
        "income_adequacy": 0.20,
        "credit_score": 0.25,
        "spending_capacity": 0.20,
        "emi_burden": 0.05,
        "engagement_recency": 0.10,
        "product_gap": 0.10,
        "relationship_tenure": 0.05,
        "salary_trend": 0.05,
    },
    "home_loan": {
        "income_adequacy": 0.25,
        "credit_score": 0.25,
        "spending_capacity": 0.10,
        "emi_burden": 0.15,
        "engagement_recency": 0.05,
        "product_gap": 0.10,
        "relationship_tenure": 0.05,
        "salary_trend": 0.05,
    },
    "mutual_fund": {
        "income_adequacy": 0.15,
        "credit_score": 0.05,
        "spending_capacity": 0.25,
        "emi_burden": 0.10,
        "engagement_recency": 0.10,
        "product_gap": 0.15,
        "relationship_tenure": 0.10,
        "salary_trend": 0.10,
    },
    "fixed_deposit": {
        "income_adequacy": 0.15,
        "credit_score": 0.05,
        "spending_capacity": 0.25,
        "emi_burden": 0.10,
        "engagement_recency": 0.10,
        "product_gap": 0.15,
        "relationship_tenure": 0.15,
        "salary_trend": 0.05,
    },
    "insurance": {
        "income_adequacy": 0.20,
        "credit_score": 0.05,
        "spending_capacity": 0.15,
        "emi_burden": 0.10,
        "engagement_recency": 0.10,
        "product_gap": 0.20,
        "relationship_tenure": 0.10,
        "salary_trend": 0.10,
    },
}

# Default weights for unlisted product types
DEFAULT_WEIGHTS = {
    "income_adequacy": 0.20,
    "credit_score": 0.15,
    "spending_capacity": 0.15,
    "emi_burden": 0.15,
    "engagement_recency": 0.10,
    "product_gap": 0.10,
    "relationship_tenure": 0.10,
    "salary_trend": 0.05,
}


def _score_income_adequacy(customer: Customer, product_type: str) -> ScoringFactor:
    """Score based on income relative to product requirements."""
    income = customer.annual_income
    min_thresholds = {
        "personal_loan": 400000,
        "home_loan": 600000,
        "credit_card": 300000,
        "mutual_fund": 300000,
        "insurance": 300000,
        "fixed_deposit": 0,
    }
    min_income = min_thresholds.get(product_type, 300000)

    if income <= 0:
        score = 0
        detail = "No income data available"
    elif income >= min_income * 3:
        score = 95
        detail = f"Income ₹{income:,.0f} is {income/max(min_income,1):.1f}x the minimum requirement"
    elif income >= min_income * 2:
        score = 80
        detail = f"Income ₹{income:,.0f} comfortably exceeds minimum ₹{min_income:,.0f}"
    elif income >= min_income:
        score = 60
        detail = f"Income ₹{income:,.0f} meets minimum requirement ₹{min_income:,.0f}"
    else:
        score = 20
        detail = f"Income ₹{income:,.0f} below minimum ₹{min_income:,.0f}"

    return ScoringFactor(name="Income Adequacy", score=score, weight=0, detail=detail)


def _score_credit(customer: Customer) -> ScoringFactor:
    """Score based on credit score."""
    cs = customer.credit_score
    if cs >= 780:
        score, detail = 95, f"Excellent credit score ({cs}) — top-tier borrower"
    elif cs >= 750:
        score, detail = 85, f"Very good credit score ({cs}) — strong profile"
    elif cs >= 700:
        score, detail = 70, f"Good credit score ({cs}) — eligible for most products"
    elif cs >= 650:
        score, detail = 50, f"Fair credit score ({cs}) — some products available"
    else:
        score, detail = 25, f"Below average credit score ({cs}) — limited eligibility"

    return ScoringFactor(name="Credit Score", score=score, weight=0, detail=detail)


def _score_spending_capacity(customer: Customer, db: Session) -> ScoringFactor:
    """Score based on disposable income after expenses."""
    from datetime import timedelta

    cutoff = date.today() - timedelta(days=180)
    txns = db.query(Transaction).filter(
        Transaction.customer_id == customer.id,
        Transaction.date >= cutoff,
    ).all()

    if not txns:
        return ScoringFactor(name="Spending Capacity", score=50, weight=0, detail="Insufficient transaction data")

    total_credit = sum(t.amount for t in txns if t.type == "credit")
    total_debit = sum(t.amount for t in txns if t.type == "debit")
    savings_ratio = (total_credit - total_debit) / total_credit if total_credit > 0 else 0

    if savings_ratio > 0.30:
        score, detail = 90, f"High savings ratio ({savings_ratio:.0%}) — strong disposable income"
    elif savings_ratio > 0.15:
        score, detail = 70, f"Moderate savings ratio ({savings_ratio:.0%}) — reasonable capacity"
    elif savings_ratio > 0.05:
        score, detail = 50, f"Low savings ratio ({savings_ratio:.0%}) — limited capacity"
    else:
        score, detail = 25, f"Very low/negative savings ratio ({savings_ratio:.0%})"

    return ScoringFactor(name="Spending Capacity", score=score, weight=0, detail=detail)


def _score_emi_burden(customer: Customer, db: Session) -> ScoringFactor:
    """Score based on existing EMI burden relative to income."""
    from datetime import timedelta

    cutoff = date.today() - timedelta(days=180)
    emi_total = sum(
        t.amount for t in db.query(Transaction).filter(
            Transaction.customer_id == customer.id,
            Transaction.date >= cutoff,
            Transaction.category == "emi",
        ).all()
    )

    monthly_income = customer.annual_income / 12
    monthly_emi = emi_total / 6  # 6 months
    emi_ratio = monthly_emi / monthly_income if monthly_income > 0 else 0

    if emi_ratio == 0:
        score, detail = 90, "No existing EMI burden — excellent for new loan products"
    elif emi_ratio < 0.20:
        score, detail = 75, f"Low EMI burden ({emi_ratio:.0%} of income) — room for new EMIs"
    elif emi_ratio < 0.40:
        score, detail = 50, f"Moderate EMI burden ({emi_ratio:.0%} of income)"
    else:
        score, detail = 20, f"High EMI burden ({emi_ratio:.0%} of income) — limited capacity"

    return ScoringFactor(name="EMI Burden", score=score, weight=0, detail=detail)


def _score_engagement_recency(customer: Customer, db: Session) -> ScoringFactor:
    """Score based on how recently the customer interacted."""
    last_interaction = customer.last_interaction_date
    if not last_interaction:
        return ScoringFactor(name="Engagement Recency", score=30, weight=0, detail="No recent interactions recorded")

    days_since = (date.today() - last_interaction).days

    # Check for product inquiries
    recent_inquiries = db.query(Interaction).filter(
        Interaction.customer_id == customer.id,
        Interaction.type == "product_inquiry",
    ).count()

    if days_since <= 30 and recent_inquiries > 0:
        score = 95
        detail = f"Very recent engagement ({days_since} days ago) with {recent_inquiries} product inquiries"
    elif days_since <= 30:
        score = 80
        detail = f"Recent engagement ({days_since} days ago)"
    elif days_since <= 90:
        score = 60
        detail = f"Moderately recent engagement ({days_since} days ago)"
    elif days_since <= 180:
        score = 40
        detail = f"Last engagement was {days_since} days ago"
    else:
        score = 20
        detail = f"Dormant customer — last interaction was {days_since} days ago"

    return ScoringFactor(name="Engagement Recency", score=score, weight=0, detail=detail)


def _score_product_gap(customer: Customer, product_type: str) -> ScoringFactor:
    """Score based on whether customer already has this product."""
    existing = customer.existing_products or []

    if product_type in existing:
        return ScoringFactor(
            name="Product Gap", score=5, weight=0,
            detail=f"Customer already owns a {product_type} — no gap",
        )
    else:
        # Check complementary products
        complements = {
            "personal_loan": ["savings_account", "credit_card"],
            "credit_card": ["savings_account"],
            "home_loan": ["savings_account", "insurance"],
            "mutual_fund": ["savings_account", "demat_account"],
            "insurance": ["savings_account"],
        }
        related = complements.get(product_type, [])
        has_related = sum(1 for p in related if p in existing)

        if has_related >= 2:
            score = 90
            detail = f"Strong product gap — doesn't have {product_type} but has related products"
        elif has_related >= 1:
            score = 75
            detail = f"Product gap exists — good cross-sell opportunity for {product_type}"
        else:
            score = 60
            detail = f"Customer doesn't own {product_type} — potential new product"

        return ScoringFactor(name="Product Gap", score=score, weight=0, detail=detail)


def _score_tenure(customer: Customer) -> ScoringFactor:
    """Score based on relationship tenure."""
    tenure_years = (date.today() - customer.account_open_date).days / 365.25

    if tenure_years >= 7:
        score, detail = 90, f"Long-standing customer ({tenure_years:.1f} years) — high trust"
    elif tenure_years >= 4:
        score, detail = 70, f"Established relationship ({tenure_years:.1f} years)"
    elif tenure_years >= 2:
        score, detail = 50, f"Growing relationship ({tenure_years:.1f} years)"
    else:
        score, detail = 30, f"Relatively new customer ({tenure_years:.1f} years)"

    return ScoringFactor(name="Relationship Tenure", score=score, weight=0, detail=detail)


def _score_salary_trend(customer: Customer, db: Session) -> ScoringFactor:
    """Score based on salary trend from transactions."""
    from datetime import timedelta

    salary_txns = db.query(Transaction).filter(
        Transaction.customer_id == customer.id,
        Transaction.category == "salary",
    ).order_by(Transaction.date).all()

    if len(salary_txns) < 3:
        return ScoringFactor(name="Salary Trend", score=50, weight=0, detail="Insufficient salary data for trend analysis")

    # Compare recent vs older salaries
    mid = len(salary_txns) // 2
    older_avg = sum(t.amount for t in salary_txns[:mid]) / mid
    recent_avg = sum(t.amount for t in salary_txns[mid:]) / (len(salary_txns) - mid)
    growth = (recent_avg - older_avg) / older_avg if older_avg > 0 else 0

    if growth > 0.10:
        score = 90
        detail = f"Strong salary growth ({growth:.1%}) — increasing capacity"
    elif growth > 0.02:
        score = 70
        detail = f"Steady salary growth ({growth:.1%})"
    elif growth > -0.02:
        score = 50
        detail = "Stable salary with minimal change"
    else:
        score = 30
        detail = f"Declining salary trend ({growth:.1%})"

    return ScoringFactor(name="Salary Trend", score=score, weight=0, detail=detail)


def score_customer(customer_id: int, product_type: str) -> dict:
    """Score a customer's conversion likelihood for a specific product.
    
    Args:
        customer_id: The customer ID to score
        product_type: The product type (e.g., 'personal_loan', 'credit_card')
    
    Returns:
        Dictionary with score, label, confidence, factors, and summary
    """
    import logging
    import time

    logger = logging.getLogger(__name__)
    logger.info("┌─── Scoring Engine ────────────────────────────")
    logger.info("│ Customer ID  : %d", customer_id)
    logger.info("│ Product Type : %s", product_type)

    start = time.perf_counter()

    with get_db_session() as db:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            logger.warning("│ ✗ Customer %d not found", customer_id)
            logger.info("└────────────────────────────────────────────────")
            return {"error": f"Customer {customer_id} not found"}

        logger.info("│ Customer     : %s (tier=%s, income=₹%s, credit=%d)",
                     customer.name, customer.relationship_tier,
                     f"{customer.annual_income:,.0f}", customer.credit_score)

        # Get weights for this product type
        weights = PRODUCT_WEIGHTS.get(product_type, DEFAULT_WEIGHTS)
        using_default = product_type not in PRODUCT_WEIGHTS
        logger.info("│ Weights      : %s%s", product_type, " (DEFAULT)" if using_default else "")

        # Calculate each factor
        logger.info("│ ── Factor Breakdown ──")
        factors_raw = [
            ("income_adequacy", _score_income_adequacy(customer, product_type)),
            ("credit_score", _score_credit(customer)),
            ("spending_capacity", _score_spending_capacity(customer, db)),
            ("emi_burden", _score_emi_burden(customer, db)),
            ("engagement_recency", _score_engagement_recency(customer, db)),
            ("product_gap", _score_product_gap(customer, product_type)),
            ("relationship_tenure", _score_tenure(customer)),
            ("salary_trend", _score_salary_trend(customer, db)),
        ]

        # Apply weights
        total_score = 0
        factors_output = []
        for key, factor in factors_raw:
            w = weights.get(key, 0.1)
            factor.weight = w
            weighted = factor.score * w
            total_score += weighted
            logger.info("│   %-22s score=%3d × weight=%.0f%% → %.1f  (%s)",
                         factor.name, round(factor.score), w * 100, weighted, factor.detail[:50])
            factors_output.append({
                "name": factor.name,
                "score": round(factor.score),
                "weight": round(w * 100),
                "weighted_contribution": round(factor.score * w, 1),
                "detail": factor.detail,
            })

        final_score = round(total_score)

        # Determine label and confidence
        if final_score >= 75:
            label, confidence = "High", "High"
        elif final_score >= 55:
            label, confidence = "Medium", "Medium"
        else:
            label, confidence = "Low", "Medium"

        elapsed = (time.perf_counter() - start) * 1000

        # Generate summary
        top_factors = sorted(factors_output, key=lambda f: f["weighted_contribution"], reverse=True)[:3]
        top_names = [f["name"] for f in top_factors]
        summary = (
            f"{customer.name} has a {label.lower()} conversion likelihood (score: {final_score}/100) "
            f"for {product_type.replace('_', ' ')}. "
            f"Key drivers: {', '.join(top_names)}."
        )

        logger.info("│ ── Result ──")
        logger.info("│ Final Score  : %d/100", final_score)
        logger.info("│ Label        : %s (confidence: %s)", label, confidence)
        logger.info("│ Top Drivers  : %s", ", ".join(top_names))
        logger.info("│ Time         : %.1fms", elapsed)
        logger.info("└────────────────────────────────────────────────")

        return {
            "customer_id": customer_id,
            "customer_name": customer.name,
            "product_type": product_type,
            "score": final_score,
            "label": label,
            "confidence": confidence,
            "factors": factors_output,
            "summary": summary,
        }
