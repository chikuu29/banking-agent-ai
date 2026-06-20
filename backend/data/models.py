"""SQLAlchemy ORM models for the Banking CRM domain."""

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, 
    ForeignKey, Text, JSON, Boolean, Enum as SQLEnum
)
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# --- Enums ---

class RelationshipTier(str, enum.Enum):
    PLATINUM = "Platinum"
    GOLD = "Gold"
    SILVER = "Silver"
    BRONZE = "Bronze"


class TransactionType(str, enum.Enum):
    CREDIT = "credit"
    DEBIT = "debit"


class TransactionCategory(str, enum.Enum):
    SALARY = "salary"
    EMI = "emi"
    SHOPPING = "shopping"
    GROCERIES = "groceries"
    UTILITIES = "utilities"
    TRANSFER = "transfer"
    INVESTMENT = "investment"
    RENT = "rent"
    DINING = "dining"
    TRAVEL = "travel"
    INSURANCE = "insurance"
    MEDICAL = "medical"
    ATM_WITHDRAWAL = "atm_withdrawal"
    FD_DEPOSIT = "fd_deposit"
    FD_MATURITY = "fd_maturity"
    LOAN_DISBURSEMENT = "loan_disbursement"
    MISCELLANEOUS = "miscellaneous"


class ProductType(str, enum.Enum):
    PERSONAL_LOAN = "personal_loan"
    HOME_LOAN = "home_loan"
    CREDIT_CARD = "credit_card"
    FIXED_DEPOSIT = "fixed_deposit"
    SAVINGS_ACCOUNT = "savings_account"
    MUTUAL_FUND = "mutual_fund"
    INSURANCE = "insurance"
    DEMAT_ACCOUNT = "demat_account"


class InteractionChannel(str, enum.Enum):
    CALL = "call"
    EMAIL = "email"
    BRANCH = "branch"
    APP = "app"
    WHATSAPP = "whatsapp"


class InteractionType(str, enum.Enum):
    INQUIRY = "inquiry"
    COMPLAINT = "complaint"
    SERVICE_REQUEST = "service_request"
    PRODUCT_INQUIRY = "product_inquiry"
    FEEDBACK = "feedback"


# --- Models ---

class Customer(Base):
    """Represents a bank customer with full profile information."""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)
    occupation = Column(String(100), nullable=False)
    annual_income = Column(Float, nullable=False)
    credit_score = Column(Integer, nullable=False)
    relationship_tier = Column(String(20), nullable=False)
    phone = Column(String(15), nullable=False)
    email = Column(String(100), nullable=False)
    city = Column(String(50), nullable=False)
    state = Column(String(50), nullable=False)
    account_open_date = Column(Date, nullable=False)
    last_interaction_date = Column(Date, nullable=True)
    assigned_rm_id = Column(String(10), default="RM001")
    existing_products = Column(JSON, default=list)  # List of product type strings
    kyc_status = Column(String(20), default="verified")
    average_balance = Column(Float, default=0.0)
    total_relationship_value = Column(Float, default=0.0)

    # Relationships
    transactions = relationship("Transaction", back_populates="customer", lazy="dynamic")
    interactions = relationship("Interaction", back_populates="customer", lazy="dynamic")


class Transaction(Base):
    """Represents a financial transaction."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String(10), nullable=False)  # credit / debit
    category = Column(String(30), nullable=False)
    amount = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    channel = Column(String(20), nullable=False)  # UPI, NetBanking, Branch, ATM
    description = Column(String(200), nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="transactions")


class Product(Base):
    """Represents a banking product offered by the bank."""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    type = Column(String(30), nullable=False)
    min_income = Column(Float, default=0)
    min_credit_score = Column(Integer, default=0)
    interest_rate = Column(Float, nullable=True)
    description = Column(Text, nullable=False)
    features = Column(JSON, default=list)
    max_amount = Column(Float, nullable=True)
    tenure_months = Column(Integer, nullable=True)


class Interaction(Base):
    """Represents an interaction between a customer and the bank."""
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    date = Column(Date, nullable=False)
    channel = Column(String(20), nullable=False)
    type = Column(String(30), nullable=False)
    product_discussed = Column(String(30), nullable=True)
    outcome = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="interactions")


class User(Base):
    """Represents a Relationship Manager (RM) who can log in."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(100), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    role = Column(String(50), default="Relationship Manager")
    assigned_rm_id = Column(String(15), default="RM001")

    # Relationships
    chat_threads = relationship("ChatThread", back_populates="user", cascade="all, delete-orphan")


class ChatThread(Base):
    """Represents a conversation thread (recent chat) for an RM."""
    __tablename__ = "chat_threads"

    id = Column(String(36), primary_key=True)  # UUID string
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="chat_threads")


class ExecutionLog(Base):
    """Logs the agent execution steps and token consumption."""
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    thread_id = Column(String(36), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    query = Column(Text, nullable=False)
    execution_flow = Column(JSON, nullable=False)  # list of tool calls and notes
    token_count_input = Column(Integer, default=0)
    token_count_output = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

