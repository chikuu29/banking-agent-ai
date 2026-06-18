"""Central configuration for the Banking CRM Agentic AI system."""

import os
from dotenv import load_dotenv

load_dotenv()


# --- LLM Configuration ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")

# --- API Configuration ---
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_BASE_URL = f"http://{API_HOST}:{API_PORT}"

# --- Database Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./banking_crm.db")

# --- Seed Data Configuration ---
NUM_CUSTOMERS = int(os.getenv("NUM_CUSTOMERS", "150"))
RANDOM_SEED = 42  # For reproducible synthetic data
