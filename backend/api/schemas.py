"""Pydantic schemas for API responses.

These schemas provide typed, documented responses for all banking API endpoints.
"""

from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


# --- Customer Schemas ---

class CustomerSummary(BaseModel):
    """Brief customer summary returned in list queries."""
    id: int
    name: str
    age: int
    gender: str
    occupation: str
    annual_income: float
    credit_score: int
    relationship_tier: str
    city: str
    state: str
    phone: str
    email: str
    existing_products: list[str] = []
    average_balance: float = 0.0

    class Config:
        from_attributes = True


class CustomerProfile(BaseModel):
    """Full 360-degree customer profile."""
    id: int
    name: str
    age: int
    gender: str
    occupation: str
    annual_income: float
    credit_score: int
    relationship_tier: str
    phone: str
    email: str
    city: str
    state: str
    account_open_date: date
    last_interaction_date: Optional[date] = None
    assigned_rm_id: str
    existing_products: list[str] = []
    kyc_status: str
    average_balance: float = 0.0
    total_relationship_value: float = 0.0
    recent_interactions: list["InteractionRecord"] = []
    account_tenure_years: float = 0.0

    class Config:
        from_attributes = True


# --- Transaction Schemas ---

class TransactionRecord(BaseModel):
    """A single transaction."""
    id: int
    date: date
    type: str
    category: str
    amount: float
    balance_after: float
    channel: str
    description: str

    class Config:
        from_attributes = True


class TransactionSummary(BaseModel):
    """Aggregated transaction summary."""
    total_credit: float = 0.0
    total_debit: float = 0.0
    net_flow: float = 0.0
    avg_monthly_income: float = 0.0
    avg_monthly_expense: float = 0.0
    avg_balance: float = 0.0
    top_spending_categories: list[dict] = []
    total_emi_payments: float = 0.0
    emi_to_income_ratio: float = 0.0


class TransactionResponse(BaseModel):
    """Response for transaction history endpoint."""
    customer_id: int
    customer_name: str
    period_months: int
    transactions: list[TransactionRecord] = []
    summary: TransactionSummary


# --- Credit Score Schemas ---

class CreditFactor(BaseModel):
    """A factor contributing to credit score."""
    name: str
    impact: str  # positive / negative / neutral
    detail: str


class CreditScoreResponse(BaseModel):
    """Detailed credit score breakdown."""
    customer_id: int
    customer_name: str
    score: int
    rating: str  # Excellent / Good / Fair / Poor
    factors: list[CreditFactor] = []


# --- Product Schemas ---

class ProductInfo(BaseModel):
    """Banking product information."""
    id: int
    name: str
    type: str
    min_income: float = 0
    min_credit_score: int = 0
    interest_rate: Optional[float] = None
    description: str
    features: list[str] = []
    max_amount: Optional[float] = None
    tenure_months: Optional[int] = None

    class Config:
        from_attributes = True


class EligibilityResult(BaseModel):
    """Product eligibility check result."""
    product_name: str
    product_type: str
    eligible: bool
    fit_score: int = 0  # 0-100
    reasons: list[str] = []


class ProductEligibilityResponse(BaseModel):
    """Full eligibility check response."""
    customer_id: int
    customer_name: str
    eligible_products: list[EligibilityResult] = []


# --- Interaction Schemas ---

class InteractionRecord(BaseModel):
    """An interaction record."""
    id: int
    date: date
    channel: str
    type: str
    product_discussed: Optional[str] = None
    outcome: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# Rebuild models to resolve forward refs
CustomerProfile.model_rebuild()


class CustomerCreate(BaseModel):
    name: str
    age: int
    gender: str
    occupation: str
    annual_income: float
    credit_score: int
    relationship_tier: str
    phone: str
    email: str
    city: str
    state: str
    assigned_rm_id: Optional[str] = "RM001"
    existing_products: list[str] = []
    average_balance: float = 0.0
    total_relationship_value: float = 0.0
    kyc_status: Optional[str] = "verified"


class ProductCreate(BaseModel):
    name: str
    type: str
    min_income: float = 0.0
    min_credit_score: int = 0
    interest_rate: Optional[float] = None
    description: str
    features: list[str] = []
    max_amount: Optional[float] = None
    tenure_months: Optional[int] = None

