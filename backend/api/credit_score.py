"""Credit Score API endpoint.

GET /api/customers/{id}/credit-score — Get credit score with factor breakdown
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from data.database import get_db
from data.models import Customer, Transaction
from api.schemas import CreditScoreResponse, CreditFactor

router = APIRouter(prefix="/api/customers", tags=["Credit Score"])


def _analyze_credit_factors(customer: Customer, db: Session) -> list[CreditFactor]:
    """Generate a realistic credit factor breakdown based on customer data."""
    factors = []
    score = customer.credit_score

    # Payment History (35% of score)
    if score >= 750:
        factors.append(CreditFactor(
            name="Payment History",
            impact="positive",
            detail="Excellent track record — no missed payments in the last 24 months",
        ))
    elif score >= 680:
        factors.append(CreditFactor(
            name="Payment History",
            impact="positive",
            detail="Good payment history with occasional delays",
        ))
    else:
        factors.append(CreditFactor(
            name="Payment History",
            impact="negative",
            detail="Some missed or late payments found in credit history",
        ))

    # Credit Utilization (30%)
    if "credit_card" in (customer.existing_products or []):
        if score >= 720:
            factors.append(CreditFactor(
                name="Credit Utilization",
                impact="positive",
                detail="Low credit utilization ratio (<30%) on existing credit cards",
            ))
        else:
            factors.append(CreditFactor(
                name="Credit Utilization",
                impact="negative",
                detail="High credit utilization ratio (>50%) on credit cards",
            ))
    else:
        factors.append(CreditFactor(
            name="Credit Utilization",
            impact="neutral",
            detail="No credit card history — limited credit utilization data",
        ))

    # Credit History Length (15%)
    tenure_years = (date.today() - customer.account_open_date).days / 365.25
    if tenure_years >= 5:
        factors.append(CreditFactor(
            name="Credit History Length",
            impact="positive",
            detail=f"Long credit history ({tenure_years:.1f} years) demonstrates stability",
        ))
    elif tenure_years >= 2:
        factors.append(CreditFactor(
            name="Credit History Length",
            impact="neutral",
            detail=f"Moderate credit history ({tenure_years:.1f} years)",
        ))
    else:
        factors.append(CreditFactor(
            name="Credit History Length",
            impact="negative",
            detail=f"Short credit history ({tenure_years:.1f} years) — limited data",
        ))

    # Credit Mix (10%)
    num_products = len(customer.existing_products or [])
    if num_products >= 3:
        factors.append(CreditFactor(
            name="Credit Mix",
            impact="positive",
            detail=f"Diverse credit mix with {num_products} product types",
        ))
    else:
        factors.append(CreditFactor(
            name="Credit Mix",
            impact="neutral",
            detail=f"Limited credit mix with only {num_products} product(s)",
        ))

    # Recent Inquiries (10%)
    if score >= 730:
        factors.append(CreditFactor(
            name="Recent Credit Inquiries",
            impact="positive",
            detail="No recent hard inquiries on credit report",
        ))
    else:
        factors.append(CreditFactor(
            name="Recent Credit Inquiries",
            impact="neutral",
            detail="1-2 recent credit inquiries found",
        ))

    # Income Stability
    if customer.annual_income >= 800000:
        factors.append(CreditFactor(
            name="Income Stability",
            impact="positive",
            detail=f"Strong annual income of ₹{customer.annual_income:,.0f}",
        ))
    elif customer.annual_income >= 400000:
        factors.append(CreditFactor(
            name="Income Stability",
            impact="neutral",
            detail=f"Moderate annual income of ₹{customer.annual_income:,.0f}",
        ))
    else:
        factors.append(CreditFactor(
            name="Income Stability",
            impact="negative",
            detail=f"Lower income bracket at ₹{customer.annual_income:,.0f}",
        ))

    return factors


def _score_to_rating(score: int) -> str:
    if score >= 750:
        return "Excellent"
    elif score >= 700:
        return "Good"
    elif score >= 650:
        return "Fair"
    else:
        return "Poor"


@router.get("/{customer_id}/credit-score", response_model=CreditScoreResponse)
def get_credit_score(customer_id: int, db: Session = Depends(get_db)):
    """Get credit score and detailed factor breakdown for a customer.
    
    Returns the credit score, rating category, and individual factors
    that contribute to the score (payment history, utilization, etc.).
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    factors = _analyze_credit_factors(customer, db)

    return CreditScoreResponse(
        customer_id=customer.id,
        customer_name=customer.name,
        score=customer.credit_score,
        rating=_score_to_rating(customer.credit_score),
        factors=factors,
    )
