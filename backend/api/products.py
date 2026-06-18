"""Product API endpoints.

GET /api/products                             — List all banking products
GET /api/customers/{id}/product-eligibility   — Check product eligibility for a customer
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from data.database import get_db
from data.models import Customer, Product
from api.schemas import ProductInfo, EligibilityResult, ProductEligibilityResponse

router = APIRouter(tags=["Products"])


@router.get("/api/products", response_model=list[ProductInfo])
def list_products(db: Session = Depends(get_db)):
    """List all banking products available for recommendation.
    
    Returns complete product catalog with eligibility criteria and features.
    """
    products = db.query(Product).all()
    return products


@router.get(
    "/api/customers/{customer_id}/product-eligibility",
    response_model=ProductEligibilityResponse,
)
def check_product_eligibility(customer_id: int, db: Session = Depends(get_db)):
    """Check which banking products a customer is eligible for.
    
    Evaluates each product against the customer's profile (income, credit score)
    and returns eligibility status with fit score and reasons.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    products = db.query(Product).all()
    existing = set(customer.existing_products or [])
    results = []

    for product in products:
        reasons = []
        eligible = True
        fit_score = 50  # Base score

        # Already owns this product type?
        already_owns = product.type in existing
        if already_owns:
            reasons.append(f"Customer already has a {product.type} product")
            fit_score -= 30

        # Income check
        if customer.annual_income >= product.min_income:
            income_ratio = customer.annual_income / max(product.min_income, 1)
            income_bonus = min(25, int(income_ratio * 5))
            fit_score += income_bonus
            reasons.append(f"Income ₹{customer.annual_income:,.0f} meets minimum ₹{product.min_income:,.0f}")
        else:
            eligible = False
            fit_score -= 20
            reasons.append(f"Income ₹{customer.annual_income:,.0f} below minimum ₹{product.min_income:,.0f}")

        # Credit score check
        if customer.credit_score >= product.min_credit_score:
            cs_bonus = min(20, (customer.credit_score - product.min_credit_score) // 5)
            fit_score += cs_bonus
            reasons.append(f"Credit score {customer.credit_score} meets minimum {product.min_credit_score}")
        elif product.min_credit_score > 0:
            eligible = False
            fit_score -= 20
            reasons.append(f"Credit score {customer.credit_score} below minimum {product.min_credit_score}")

        # Tier bonus
        tier_bonuses = {"Platinum": 15, "Gold": 10, "Silver": 5, "Bronze": 0}
        fit_score += tier_bonuses.get(customer.relationship_tier, 0)

        # Clamp score
        fit_score = max(0, min(100, fit_score))

        # Don't mark as eligible if they already own it
        if already_owns:
            eligible = False

        results.append(EligibilityResult(
            product_name=product.name,
            product_type=product.type,
            eligible=eligible,
            fit_score=fit_score,
            reasons=reasons,
        ))

    # Sort by fit_score descending, eligible first
    results.sort(key=lambda r: (r.eligible, r.fit_score), reverse=True)

    return ProductEligibilityResponse(
        customer_id=customer.id,
        customer_name=customer.name,
        eligible_products=results,
    )
