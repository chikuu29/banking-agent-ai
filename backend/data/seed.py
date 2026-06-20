"""Synthetic data generator for the Banking CRM demo.

Generates realistic Indian banking customer profiles with transaction histories,
product ownership, and interaction records.
"""

import logging


import random
from datetime import date, timedelta
from faker import Faker

import hashlib
from data.models import Customer, Transaction, Product, Interaction, Base, User
from data.database import engine, SessionLocal
from config import NUM_CUSTOMERS, RANDOM_SEED

logger = logging.getLogger(__name__)

fake = Faker("en_IN")
Faker.seed(RANDOM_SEED)
random.seed(RANDOM_SEED)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# --- Constants for realistic data ---

INDIAN_CITIES = [
    ("Mumbai", "Maharashtra"), ("Delhi", "Delhi"), ("Bangalore", "Karnataka"),
    ("Chennai", "Tamil Nadu"), ("Pune", "Maharashtra"), ("Hyderabad", "Telangana"),
    ("Kolkata", "West Bengal"), ("Ahmedabad", "Gujarat"), ("Jaipur", "Rajasthan"),
    ("Lucknow", "Uttar Pradesh"), ("Kochi", "Kerala"), ("Chandigarh", "Punjab"),
]

OCCUPATIONS = [
    "Software Engineer", "Doctor", "Business Owner", "Teacher", "CA",
    "Lawyer", "Government Employee", "Bank Manager", "Architect",
    "Marketing Manager", "Sales Executive", "Consultant", "Freelancer",
    "Pharmacist", "Civil Engineer", "Professor", "Dentist", "Pilot",
    "Data Scientist", "Product Manager",
]

TIER_THRESHOLDS = {
    "Platinum": 2000000,  # 20L+
    "Gold": 1000000,      # 10-20L
    "Silver": 500000,     # 5-10L
    "Bronze": 0,          # <5L
}

PRODUCT_CATALOG = [
    {
        "name": "Personal Loan - FlexiCash",
        "type": "personal_loan",
        "min_income": 400000,
        "min_credit_score": 680,
        "interest_rate": 10.5,
        "description": "Instant personal loan up to ₹25L with flexible tenure",
        "features": ["No collateral", "Instant approval", "Flexible EMI", "Minimal documentation"],
        "max_amount": 2500000,
        "tenure_months": 60,
    },
    {
        "name": "Home Loan - DreamHome",
        "type": "home_loan",
        "min_income": 600000,
        "min_credit_score": 700,
        "interest_rate": 8.5,
        "description": "Home loan up to ₹5Cr at competitive rates",
        "features": ["Low interest", "Up to 30yr tenure", "Balance transfer", "Top-up facility"],
        "max_amount": 50000000,
        "tenure_months": 360,
    },
    {
        "name": "Credit Card - Platinum Rewards",
        "type": "credit_card",
        "min_income": 500000,
        "min_credit_score": 720,
        "interest_rate": None,
        "description": "Premium credit card with 5X rewards and lounge access",
        "features": ["5X reward points", "Airport lounge", "Fuel surcharge waiver", "Zero annual fee 1st year"],
        "max_amount": None,
        "tenure_months": None,
    },
    {
        "name": "Credit Card - Gold Cashback",
        "type": "credit_card",
        "min_income": 300000,
        "min_credit_score": 680,
        "interest_rate": None,
        "description": "Cashback credit card with 2% on all spends",
        "features": ["2% cashback", "No annual fee", "EMI conversion", "Contactless payments"],
        "max_amount": None,
        "tenure_months": None,
    },
    {
        "name": "Fixed Deposit - SecureGrowth",
        "type": "fixed_deposit",
        "min_income": 0,
        "min_credit_score": 0,
        "interest_rate": 7.25,
        "description": "Fixed deposit with guaranteed returns up to 7.25%",
        "features": ["Guaranteed returns", "Flexible tenure", "Auto-renewal", "Loan against FD"],
        "max_amount": None,
        "tenure_months": 120,
    },
    {
        "name": "Mutual Fund - SmartInvest SIP",
        "type": "mutual_fund",
        "min_income": 300000,
        "min_credit_score": 0,
        "interest_rate": None,
        "description": "Curated mutual fund SIPs with expert-managed portfolios",
        "features": ["Expert fund selection", "Auto SIP", "Goal-based investing", "Tax saving ELSS"],
        "max_amount": None,
        "tenure_months": None,
    },
    {
        "name": "Life Insurance - LifeSecure",
        "type": "insurance",
        "min_income": 300000,
        "min_credit_score": 0,
        "interest_rate": None,
        "description": "Term life insurance with coverage up to ₹2Cr",
        "features": ["High coverage", "Low premium", "Critical illness rider", "Accidental death benefit"],
        "max_amount": 20000000,
        "tenure_months": None,
    },
    {
        "name": "Demat Account - TradeEasy",
        "type": "demat_account",
        "min_income": 300000,
        "min_credit_score": 0,
        "interest_rate": None,
        "description": "Zero brokerage demat account for stocks and IPOs",
        "features": ["Zero brokerage on delivery", "IPO access", "Research reports", "Mobile trading"],
        "max_amount": None,
        "tenure_months": None,
    },
]


def _assign_tier(income: float) -> str:
    for tier, threshold in TIER_THRESHOLDS.items():
        if income >= threshold:
            return tier
    return "Bronze"


def _generate_products_for_customer(income: float, credit_score: int) -> list[str]:
    """Assign existing products based on profile — everyone has savings account."""
    products = ["savings_account"]

    # Higher income / credit = more likely to have products
    if income > 800000 and credit_score > 720 and random.random() < 0.4:
        products.append("credit_card")
    if income > 600000 and random.random() < 0.3:
        products.append("fixed_deposit")
    if income > 1000000 and credit_score > 700 and random.random() < 0.25:
        products.append("home_loan")
    if income > 500000 and random.random() < 0.2:
        products.append("mutual_fund")
    if income > 400000 and random.random() < 0.15:
        products.append("insurance")
    if income > 800000 and random.random() < 0.15:
        products.append("demat_account")
    # Deliberately keep personal_loan rare — that's what we want to sell
    if income > 500000 and credit_score > 700 and random.random() < 0.1:
        products.append("personal_loan")

    return products


def _generate_transactions(customer_id: int, income: float, months: int = 12) -> list[Transaction]:
    """Generate realistic monthly transaction patterns."""
    transactions = []
    monthly_income = income / 12
    today = date.today()
    balance = random.uniform(50000, 500000)

    for month_offset in range(months, 0, -1):
        month_start = today - timedelta(days=month_offset * 30)

        # --- Monthly salary credit ---
        salary_variation = random.uniform(0.98, 1.02)
        salary = round(monthly_income * salary_variation, 2)
        balance += salary
        transactions.append(Transaction(
            customer_id=customer_id,
            date=month_start + timedelta(days=random.randint(0, 2)),
            type="credit",
            category="salary",
            amount=salary,
            balance_after=round(balance, 2),
            channel="NetBanking",
            description=f"Salary credit - {month_start.strftime('%b %Y')}",
        ))

        # --- Rent (40-60% chance) ---
        if random.random() < 0.5:
            rent = round(monthly_income * random.uniform(0.15, 0.30), 2)
            balance -= rent
            transactions.append(Transaction(
                customer_id=customer_id,
                date=month_start + timedelta(days=random.randint(1, 5)),
                type="debit",
                category="rent",
                amount=rent,
                balance_after=round(balance, 2),
                channel="NetBanking",
                description="Rent payment",
            ))

        # --- EMI payments (if they have loans) ---
        if random.random() < 0.3:
            emi = round(monthly_income * random.uniform(0.05, 0.15), 2)
            balance -= emi
            transactions.append(Transaction(
                customer_id=customer_id,
                date=month_start + timedelta(days=random.randint(3, 7)),
                type="debit",
                category="emi",
                amount=emi,
                balance_after=round(balance, 2),
                channel="NetBanking",
                description="EMI - Loan repayment",
            ))

        # --- Utilities ---
        utilities = round(random.uniform(2000, 8000), 2)
        balance -= utilities
        transactions.append(Transaction(
            customer_id=customer_id,
            date=month_start + timedelta(days=random.randint(5, 15)),
            type="debit",
            category="utilities",
            amount=utilities,
            balance_after=round(balance, 2),
            channel="UPI",
            description="Utility bills - Electricity/Water/Gas",
        ))

        # --- Shopping (2-5 transactions per month) ---
        for _ in range(random.randint(2, 5)):
            amount = round(random.uniform(500, monthly_income * 0.05), 2)
            balance -= amount
            transactions.append(Transaction(
                customer_id=customer_id,
                date=month_start + timedelta(days=random.randint(1, 28)),
                type="debit",
                category=random.choice(["shopping", "groceries", "dining"]),
                amount=amount,
                balance_after=round(balance, 2),
                channel=random.choice(["UPI", "Card", "NetBanking"]),
                description=random.choice([
                    "Amazon purchase", "Flipkart order", "Swiggy order",
                    "BigBasket groceries", "DMart shopping", "Restaurant bill",
                    "Myntra fashion", "Zepto delivery",
                ]),
            ))

        # --- Investment (occasional) ---
        if random.random() < 0.25:
            invest = round(monthly_income * random.uniform(0.05, 0.20), 2)
            balance -= invest
            transactions.append(Transaction(
                customer_id=customer_id,
                date=month_start + timedelta(days=random.randint(1, 15)),
                type="debit",
                category="investment",
                amount=invest,
                balance_after=round(balance, 2),
                channel="NetBanking",
                description=random.choice(["SIP investment", "Mutual fund purchase", "Stock purchase"]),
            ))

        # --- ATM withdrawal (occasional) ---
        if random.random() < 0.3:
            atm = round(random.uniform(2000, 20000), 2)
            balance -= atm
            transactions.append(Transaction(
                customer_id=customer_id,
                date=month_start + timedelta(days=random.randint(1, 28)),
                type="debit",
                category="atm_withdrawal",
                amount=atm,
                balance_after=round(balance, 2),
                channel="ATM",
                description="ATM cash withdrawal",
            ))

    return transactions


def _generate_interactions(customer_id: int, num: int = None) -> list[Interaction]:
    """Generate realistic interaction history."""
    if num is None:
        num = random.randint(1, 6)

    interactions = []
    today = date.today()

    for i in range(num):
        days_ago = random.randint(1, 365)
        interaction_date = today - timedelta(days=days_ago)

        interaction_type = random.choice(["inquiry", "complaint", "service_request", "product_inquiry", "feedback"])
        channel = random.choice(["call", "email", "branch", "app", "whatsapp"])

        product_discussed = None
        if interaction_type == "product_inquiry":
            product_discussed = random.choice([
                "personal_loan", "credit_card", "home_loan", "mutual_fund",
                "fixed_deposit", "insurance",
            ])

        outcomes = {
            "inquiry": ["resolved", "follow_up_needed", "information_provided"],
            "complaint": ["resolved", "escalated", "pending"],
            "service_request": ["completed", "in_progress", "scheduled"],
            "product_inquiry": ["interested", "not_interested", "considering", "applied"],
            "feedback": ["positive", "neutral", "negative"],
        }

        notes_templates = {
            "inquiry": ["Customer asked about account balance", "Inquiry about interest rates", "Asked about FD maturity dates"],
            "complaint": ["Issue with mobile app login", "Delayed credit card delivery", "Wrong transaction charge"],
            "service_request": ["Address change request", "Cheque book request", "Card replacement"],
            "product_inquiry": [
                f"Interested in {product_discussed or 'new product'}",
                f"Asked about eligibility for {product_discussed or 'loan'}",
                f"Comparing {product_discussed or 'investment'} options",
            ],
            "feedback": ["Happy with service", "Suggested mobile app improvements", "Appreciated quick resolution"],
        }

        interactions.append(Interaction(
            customer_id=customer_id,
            date=interaction_date,
            channel=channel,
            type=interaction_type,
            product_discussed=product_discussed,
            outcome=random.choice(outcomes[interaction_type]),
            notes=random.choice(notes_templates[interaction_type]),
        ))

    return interactions


def seed_database():
    """Generate and insert all synthetic data."""
    logger.info("Seeding Banking CRM database...")

    # Create tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()

    try:
        # --- Seed Products ---
        logger.info("Creating product catalog...")
        for p in PRODUCT_CATALOG:
            session.add(Product(**p))
        session.flush()

        # --- Seed Users ---
        logger.info("Creating Relationship Manager users...")
        users = [
            User(
                username="suryanarayan",
                password_hash=hash_password("password"),
                full_name="Suryanarayan Biswal",
                email="cchiku1999@gmail.com",
                role="Relationship Manager",
                assigned_rm_id="RM001"
            ),
            User(
                username="rm001",
                password_hash=hash_password("password"),
                full_name="Siddharth Sharma",
                email="rm001@bank.com",
                role="Relationship Manager",
                assigned_rm_id="RM001"
            ),
            User(
                username="rm002",
                password_hash=hash_password("password"),
                full_name="Priyanka Verma",
                email="rm002@bank.com",
                role="Relationship Manager",
                assigned_rm_id="RM002"
            )
        ]
        session.add_all(users)
        session.flush()

        # --- Seed Customers ---
        logger.info("Creating %d customers...", NUM_CUSTOMERS)
        for i in range(1, NUM_CUSTOMERS + 1):
            city, state = random.choice(INDIAN_CITIES)
            gender = random.choice(["Male", "Female"])
            age = random.randint(24, 60)

            # Income distribution: skew towards middle
            income_base = random.choice([
                random.randint(300000, 600000),   # Lower tier (40%)
                random.randint(300000, 600000),
                random.randint(600000, 1200000),  # Mid tier (30%)
                random.randint(600000, 1200000),
                random.randint(600000, 1200000),
                random.randint(1200000, 2500000), # Upper tier (20%)
                random.randint(1200000, 2500000),
                random.randint(2500000, 5000000), # Premium (10%)
            ])
            annual_income = round(income_base, -3)  # Round to nearest 1000

            # Credit score: roughly normal around 720
            credit_score = min(850, max(580, int(random.gauss(720, 50))))

            tier = _assign_tier(annual_income)
            existing_products = _generate_products_for_customer(annual_income, credit_score)

            name = fake.name_male() if gender == "Male" else fake.name_female()

            account_open_date = date.today() - timedelta(days=random.randint(365, 3650))
            last_interaction_date = date.today() - timedelta(days=random.randint(1, 180))

            avg_balance = round(annual_income * random.uniform(0.1, 0.5) / 12, 2)
            total_rv = round(avg_balance * random.uniform(5, 20), 2)

            customer = Customer(
                id=i,
                name=name,
                age=age,
                gender=gender,
                occupation=random.choice(OCCUPATIONS),
                annual_income=annual_income,
                credit_score=credit_score,
                relationship_tier=tier,
                phone=fake.phone_number(),
                email=fake.email(),
                city=city,
                state=state,
                account_open_date=account_open_date,
                last_interaction_date=last_interaction_date,
                assigned_rm_id="RM001",
                existing_products=existing_products,
                kyc_status=random.choice(["verified", "verified", "verified", "pending"]),
                average_balance=avg_balance,
                total_relationship_value=total_rv,
            )
            session.add(customer)
            session.flush()

            # Generate transactions
            txns = _generate_transactions(i, annual_income, months=12)
            session.add_all(txns)

            # Generate interactions
            interactions = _generate_interactions(i)
            session.add_all(interactions)

            if i % 50 == 0:
                logger.info("  %d/%d customers created", i, NUM_CUSTOMERS)
                session.flush()

        session.commit()

        # Summary
        customer_count = session.query(Customer).count()
        txn_count = session.query(Transaction).count()
        interaction_count = session.query(Interaction).count()
        product_count = session.query(Product).count()
        user_count = session.query(User).count()

        logger.info(
            "Database seeded successfully! %d users, %d customers, %d transactions, %d interactions, %d products",
            user_count, customer_count, txn_count, interaction_count, product_count,
        )

    except Exception as e:
        session.rollback()
        logger.error("Error seeding database: %s", e, exc_info=True)
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
