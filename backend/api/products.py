"""Product API endpoints.

GET /api/products                             — List all banking products
GET /api/customers/{id}/product-eligibility   — Check product eligibility for a customer
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from data.database import get_db
from data.models import Customer, Product
from api.schemas import ProductInfo, EligibilityResult, ProductEligibilityResponse, ProductCreate

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Products"])


@router.get("/api/v1/products", response_model=list[ProductInfo])
def list_products(db: Session = Depends(get_db)):
    """List all banking products available for recommendation.
    
    Returns complete product catalog with eligibility criteria and features.
    """
    logger.info("API GET /api/v1/products: listing all products")
    products = db.query(Product).all()
    logger.info("API GET /api/v1/products: found %d products in catalog", len(products))
    return products


@router.get(
    "/api/v1/customers/{customer_id}/product-eligibility",
    response_model=ProductEligibilityResponse,
)
def check_product_eligibility(customer_id: int, db: Session = Depends(get_db)):
    """Check which banking products a customer is eligible for.
    
    Evaluates each product against the customer's profile (income, credit score)
    and returns eligibility status with fit score and reasons.
    """
    logger.info("API GET /api/v1/customers/%d/product-eligibility: checking eligibility", customer_id)
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        logger.warning("API GET /api/v1/customers/%d/product-eligibility: customer not found", customer_id)
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
    eligible_count = sum(1 for r in results if r.eligible)
    logger.info("API GET /api/v1/customers/%d/product-eligibility: checked %d products, customer eligible for %d",
                customer_id, len(results), eligible_count)

    return ProductEligibilityResponse(
        customer_id=customer.id,
        customer_name=customer.name,
        eligible_products=results,
    )


@router.post("/api/v1/products", response_model=ProductInfo)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    """Create a new banking product catalog offering."""
    logger.info("API POST /api/v1/products: creating product '%s' (%s)", payload.name, payload.type)
    new_prod = Product(
        name=payload.name,
        type=payload.type,
        min_income=payload.min_income or 0.0,
        min_credit_score=payload.min_credit_score or 0,
        interest_rate=payload.interest_rate,
        description=payload.description,
        features=payload.features or [],
        max_amount=payload.max_amount,
        tenure_months=payload.tenure_months
    )
    
    db.add(new_prod)
    try:
        db.commit()
        db.refresh(new_prod)
        logger.info("API POST /api/v1/products: successfully created product ID %d", new_prod.id)
    except Exception as e:
        logger.error("API POST /api/v1/products: failed to create product: %s", e)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    return new_prod
