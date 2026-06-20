"""Customer API endpoints.

GET /api/customers          — List/filter customers
GET /api/customers/{id}     — Get full customer profile
"""

import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import date

from data.database import get_db
from data.models import Customer, Interaction
from api.schemas import CustomerSummary, CustomerProfile, InteractionRecord, CustomerCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/customers", tags=["Customers"])


@router.get("", response_model=list[CustomerSummary])
def list_customers(
    min_income: float | None = Query(None, description="Minimum annual income filter"),
    max_income: float | None = Query(None, description="Maximum annual income filter"),
    min_credit_score: int | None = Query(None, description="Minimum credit score filter"),
    tier: str | None = Query(None, description="Relationship tier: Platinum, Gold, Silver, Bronze"),
    city: str | None = Query(None, description="City filter"),
    has_product: str | None = Query(None, description="Filter customers who own this product type"),
    without_product: str | None = Query(None, description="Filter customers who don't own this product type"),
    limit: int = Query(20, le=1000, description="Max results to return"),
    db: Session = Depends(get_db),
):
    """Search and filter customers by various criteria.
    
    Returns a list of customer summaries matching the specified filters.
    Useful for identifying customer segments for targeted campaigns.
    """
    logger.info("API GET /api/v1/customers: min_income=%s, min_credit_score=%s, tier=%s, city=%s, limit=%d",
                min_income, min_credit_score, tier, city, limit)
    query = db.query(Customer)

    if min_income is not None:
        query = query.filter(Customer.annual_income >= min_income)
    if max_income is not None:
        query = query.filter(Customer.annual_income <= max_income)
    if min_credit_score is not None:
        query = query.filter(Customer.credit_score >= min_credit_score)
    if tier is not None:
        query = query.filter(Customer.relationship_tier == tier)
    if city is not None:
        query = query.filter(Customer.city.ilike(f"%{city}%"))

    customers = query.order_by(desc(Customer.annual_income)).limit(limit).all()
    logger.info("API GET /api/v1/customers: found %d matches (before post-filtering)", len(customers))

    # Post-filter by product ownership (JSON field)
    if has_product:
        customers = [c for c in customers if has_product in (c.existing_products or [])]
    if without_product:
        customers = [c for c in customers if without_product not in (c.existing_products or [])]

    logger.info("API GET /api/v1/customers: returning %d results after post-filtering", len(customers))
    return customers


@router.get("/{customer_id}", response_model=CustomerProfile)
def get_customer_profile(customer_id: int, db: Session = Depends(get_db)):
    """Get detailed 360-degree profile for a specific customer.
    
    Includes demographics, account information, existing products,
    and recent interaction history.
    """
    logger.info("API GET /api/v1/customers/%d: fetching profile", customer_id)
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        logger.warning("API GET /api/v1/customers/%d: customer not found", customer_id)
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    # Fetch recent interactions
    recent_interactions = (
        db.query(Interaction)
        .filter(Interaction.customer_id == customer_id)
        .order_by(desc(Interaction.date))
        .limit(10)
        .all()
    )

    # Calculate tenure
    tenure_days = (date.today() - customer.account_open_date).days
    tenure_years = round(tenure_days / 365.25, 1)

    logger.info("API GET /api/v1/customers/%d: found profile for '%s' (tier=%s, tenure=%.1f years)",
                customer_id, customer.name, customer.relationship_tier, tenure_years)
    return CustomerProfile(
        id=customer.id,
        name=customer.name,
        age=customer.age,
        gender=customer.gender,
        occupation=customer.occupation,
        annual_income=customer.annual_income,
        credit_score=customer.credit_score,
        relationship_tier=customer.relationship_tier,
        phone=customer.phone,
        email=customer.email,
        city=customer.city,
        state=customer.state,
        account_open_date=customer.account_open_date,
        last_interaction_date=customer.last_interaction_date,
        assigned_rm_id=customer.assigned_rm_id,
        existing_products=customer.existing_products or [],
        kyc_status=customer.kyc_status,
        average_balance=customer.average_balance,
        total_relationship_value=customer.total_relationship_value,
        recent_interactions=[
            InteractionRecord(
                id=i.id, date=i.date, channel=i.channel, type=i.type,
                product_discussed=i.product_discussed, outcome=i.outcome, notes=i.notes,
            )
            for i in recent_interactions
        ],
        account_tenure_years=tenure_years,
    )


@router.post("", response_model=CustomerProfile)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new banking customer profile."""
    import datetime
    logger.info("API POST /api/v1/customers: creating customer named '%s'", payload.name)
    
    new_cust = Customer(
        name=payload.name,
        age=payload.age,
        gender=payload.gender,
        occupation=payload.occupation,
        annual_income=payload.annual_income,
        credit_score=payload.credit_score,
        relationship_tier=payload.relationship_tier,
        phone=payload.phone,
        email=payload.email,
        city=payload.city,
        state=payload.state,
        account_open_date=datetime.date.today(),
        last_interaction_date=None,
        assigned_rm_id=payload.assigned_rm_id or "RM001",
        existing_products=payload.existing_products or [],
        kyc_status=payload.kyc_status or "verified",
        average_balance=payload.average_balance or 0.0,
        total_relationship_value=payload.total_relationship_value or 0.0
    )
    
    db.add(new_cust)
    try:
        db.commit()
        db.refresh(new_cust)
        logger.info("API POST /api/v1/customers: successfully created customer ID %d", new_cust.id)
    except Exception as e:
        logger.error("API POST /api/v1/customers: failed to create customer: %s", e)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    return CustomerProfile(
        id=new_cust.id,
        name=new_cust.name,
        age=new_cust.age,
        gender=new_cust.gender,
        occupation=new_cust.occupation,
        annual_income=new_cust.annual_income,
        credit_score=new_cust.credit_score,
        relationship_tier=new_cust.relationship_tier,
        phone=new_cust.phone,
        email=new_cust.email,
        city=new_cust.city,
        state=new_cust.state,
        account_open_date=new_cust.account_open_date,
        last_interaction_date=None,
        assigned_rm_id=new_cust.assigned_rm_id,
        existing_products=new_cust.existing_products or [],
        kyc_status=new_cust.kyc_status,
        average_balance=new_cust.average_balance,
        total_relationship_value=new_cust.total_relationship_value,
        recent_interactions=[],
        account_tenure_years=0.0
    )
