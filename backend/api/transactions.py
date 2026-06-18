"""Transaction API endpoints.

GET /api/customers/{id}/transactions — Fetch transaction history with summary
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import date, timedelta
from collections import defaultdict

from data.database import get_db
from data.models import Customer, Transaction
from api.schemas import TransactionRecord, TransactionSummary, TransactionResponse

router = APIRouter(prefix="/api/customers", tags=["Transactions"])


@router.get("/{customer_id}/transactions", response_model=TransactionResponse)
def get_transactions(
    customer_id: int,
    months: int = Query(6, ge=1, le=24, description="Number of months of history"),
    category: str | None = Query(None, description="Filter by transaction category"),
    min_amount: float | None = Query(None, description="Minimum transaction amount"),
    db: Session = Depends(get_db),
):
    """Fetch transaction history and spending analysis for a customer.
    
    Returns individual transactions plus aggregated summary statistics
    including income, expenses, spending categories, and EMI burden analysis.
    """
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    # Build query
    cutoff_date = date.today() - timedelta(days=months * 30)
    query = (
        db.query(Transaction)
        .filter(Transaction.customer_id == customer_id)
        .filter(Transaction.date >= cutoff_date)
    )

    if category:
        query = query.filter(Transaction.category == category)
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)

    transactions = query.order_by(desc(Transaction.date)).all()

    # Compute summary
    total_credit = sum(t.amount for t in transactions if t.type == "credit")
    total_debit = sum(t.amount for t in transactions if t.type == "debit")
    total_emi = sum(t.amount for t in transactions if t.category == "emi")

    # Spending by category
    category_totals = defaultdict(float)
    for t in transactions:
        if t.type == "debit":
            category_totals[t.category] += t.amount

    top_categories = sorted(
        [{"category": k, "total": round(v, 2)} for k, v in category_totals.items()],
        key=lambda x: x["total"],
        reverse=True,
    )[:5]

    # Average balance
    balances = [t.balance_after for t in transactions]
    avg_balance = round(sum(balances) / len(balances), 2) if balances else 0

    summary = TransactionSummary(
        total_credit=round(total_credit, 2),
        total_debit=round(total_debit, 2),
        net_flow=round(total_credit - total_debit, 2),
        avg_monthly_income=round(total_credit / max(months, 1), 2),
        avg_monthly_expense=round(total_debit / max(months, 1), 2),
        avg_balance=avg_balance,
        top_spending_categories=top_categories,
        total_emi_payments=round(total_emi, 2),
        emi_to_income_ratio=round(total_emi / total_credit, 4) if total_credit > 0 else 0,
    )

    return TransactionResponse(
        customer_id=customer_id,
        customer_name=customer.name,
        period_months=months,
        transactions=[
            TransactionRecord(
                id=t.id, date=t.date, type=t.type, category=t.category,
                amount=t.amount, balance_after=t.balance_after,
                channel=t.channel, description=t.description,
            )
            for t in transactions[:50]  # Limit to 50 most recent for readability
        ],
        summary=summary,
    )
