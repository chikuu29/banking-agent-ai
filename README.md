# 🏦 Agentic AI for Banking CRM

> Conversation-based AI assistant that helps Banking Relationship Managers identify high-potential customers and generate personalized outreach.

Built with **LangGraph** (ReAct Agent) + **FastAPI** (Mock Banking APIs) + **React** (Chat UI) + **Google Gemini**.

---

## 🏗️ Architecture

```
┌──────────────────┐     WebSocket      ┌─────────────────────────────────────┐
│                  │◄──────────────────►│           FastAPI Backend            │
│   React Chat UI  │                    │                                     │
│                  │                    │  ┌───────────────────────────────┐  │
│  • Chat input    │                    │  │     LangGraph ReAct Agent     │  │
│  • Tool call     │                    │  │                               │  │
│    visualization │                    │  │  Reason → Act → Observe → ... │  │
│  • Quick actions │                    │  └──────────┬────────────────────┘  │
│  • Markdown      │                    │             │                       │
│    rendering     │                    │     HTTP calls (tool invocations)   │
└──────────────────┘                    │             │                       │
                                        │  ┌──────────▼────────────────────┐  │
                                        │  │    Mock Banking REST APIs     │  │
                                        │  │                               │  │
                                        │  │  GET /api/v1/customers        │  │
                                        │  │  GET /api/v1/customers/{id}   │  │
                                        │  │  GET /api/v1/customers/{id}/  │  │
                                        │  │      transactions             │  │
                                        │  │  GET /api/v1/customers/{id}/  │  │
                                        │  │      credit-score             │  │
                                        │  │  GET /api/v1/products         │  │
                                        │  │  GET /api/v1/customers/{id}/  │  │
                                        │  │      product-eligibility      │  │
                                        │  └──────────┬────────────────────┘  │
                                        │             │                       │
                                        │  ┌──────────▼────────────────────┐  │
                                        │  │   SQLite + Synthetic Data     │  │
                                        │  │   150 customers, 12mo txns    │  │
                                        │  └───────────────────────────────┘  │
                                        └─────────────────────────────────────┘
```

### Key Design Decision: API-as-Tools

The agent **doesn't query the database directly** — it calls **real REST APIs via HTTP** as tools. This clearly demonstrates:

- ✅ **Structured tool usage** — each call is a real HTTP request
- ✅ **Traceability** — every tool invocation is logged and visible in the UI
- ✅ **Modularity** — APIs, Agent, and UI are fully decoupled
- ✅ **Extensibility** — swap SQLite for a real banking API without changing the agent

---

## 🔄 Execution Flow

```
User: "Find high-value customers for personal loan and generate WhatsApp messages"
  │
  ▼
Agent (LangGraph ReAct):
  │
  ├─ 🧠 REASON: "I need high-income customers with good credit who don't have a personal loan"
  │
  ├─ 🔧 TOOL: search_customers(min_income=800000, min_credit_score=700, without_product="personal_loan")
  │   └─ → HTTP GET /api/v1/customers?min_income=800000&min_credit_score=700&without_product=personal_loan
  │   └─ ← Returns 12 matching customers
  │
  ├─ 🧠 REASON: "Let me score the top candidates for conversion likelihood"
  │
  ├─ 🔧 TOOL: get_credit_score(customer_id=42)
  │   └─ → HTTP GET /api/v1/customers/42/credit-score
  │   └─ ← Score: 780, Rating: Excellent
  │
  ├─ 🔧 TOOL: score_lead_conversion(customer_id=42, product_type="personal_loan")
  │   └─ ← Score: 85/100 (High), Key factors: Income, Credit, Product Gap
  │
  ├─ 🧠 REASON: "Customer 42 is a strong lead. Let me generate a WhatsApp message."
  │
  ├─ 🔧 TOOL: generate_outreach_message(customer_id=42, product_type="personal_loan", channel="whatsapp")
  │   └─ ← Personalized WhatsApp message with customer's name, tier, and offer details
  │
  └─ 📝 RESPONSE: Presents ranked customers with scores, analysis, and personalized messages
```

---

## 🧰 Tool Design

The agent has **7 tools**, each wrapping a real API call or internal service:

| Tool | API Endpoint | Purpose |
|------|-------------|---------|
| `search_customers` | `GET /api/v1/customers` | Filter customers by income, credit score, tier, city, product ownership |
| `get_customer_profile` | `GET /api/v1/customers/{id}` | Full 360° customer view with demographics and interactions |
| `get_customer_transactions` | `GET /api/v1/customers/{id}/transactions` | Transaction history with spending analysis and EMI burden |
| `get_credit_score` | `GET /api/v1/customers/{id}/credit-score` | Credit score with factor breakdown |
| `check_product_eligibility` | `GET /api/v1/customers/{id}/product-eligibility` | Product eligibility check with fit scores |
| `score_lead_conversion` | *Internal scoring engine* | Multi-factor conversion scoring (0-100) |
| `generate_outreach_message` | *LLM-powered generator* | Personalized WhatsApp/Email/SMS messages |

### Scoring Engine

The conversion scoring uses **weighted heuristic factors**:

| Factor | Weight | Description |
|--------|--------|-------------|
| Income Adequacy | 20% | Income vs product requirements |
| Credit Score | 20% | Credit score quality |
| Spending Capacity | 15% | Disposable income after expenses |
| EMI Burden | 15% | Existing EMI to income ratio |
| Engagement Recency | 10% | Days since last interaction |
| Product Gap | 10% | Whether customer already owns the product |
| Relationship Tenure | 5% | Years as customer |
| Salary Trend | 5% | Salary growth from transaction data |

Weights are **customized per product type** (personal loan emphasizes income and credit, while mutual fund emphasizes spending capacity).

---

## 🎨 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **API-as-Tools** | Agent calls REST APIs via HTTP | Clearly demonstrates structured tool usage for evaluators |
| **Single ReAct Agent** | One agent, 7 specialized tools | Clear reasoning flow; avoids over-engineering |
| **LangGraph** | Industry-standard agentic framework | Stateful, supports streaming, memory, and tool calling |
| **Rule-based Scoring** | Weighted heuristics, not ML | Transparent and explainable — evaluators see exact factor contributions |
| **Synthetic Data** | Faker with Indian locale | Self-contained demo, realistic profiles, no PII |
| **WebSocket Streaming** | Real-time agent events | Shows tool calls live as they happen |
| **Tool Call Visualization** | Expandable cards in chat UI | Evaluators can inspect every tool invocation |

---

## ⚖️ Trade-offs & Limitations

| Aspect | Trade-off |
|--------|-----------|
| **HTTP overhead** | Tools call APIs via HTTP (slower than direct DB), but dramatically clearer for demonstrating tool usage |
| **Rule-based scoring** | Less accurate than ML models, but fully explainable and doesn't require training data |
| **Single agent** | Simpler than multi-agent; works well for this scope but less scalable |
| **SQLite** | Not production-grade, but zero-setup and portable |
| **No authentication** | Demo project — production would need RBAC and JWT |
| **Gemini dependency** | Needs API key; can swap to OpenAI/Anthropic by changing one import |

---

## 🚀 Setup & Run

### Prerequisites
- **Python 3.12+**
- **Node.js 18+** with pnpm
- **uv** (Python package manager) — [install](https://docs.astral.sh/uv/)
- **Google Gemini API key** — [get one free](https://aistudio.google.com)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd banking-agent-ai

# Set up environment
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
```

### 2. Start Backend

```bash
cd backend
uv sync                    # Install Python dependencies
uv run uvicorn main:app --reload      # Starts FastAPI with auto-reload on http://localhost:8000
```

The database will be automatically seeded with 150 synthetic customers on first run.

### 3. Start Frontend

```bash
cd frontend
pnpm install              # Install Node dependencies
pnpm dev                  # Starts React dev server on http://localhost:5173
```

### 4. Open the App

Navigate to **http://localhost:5173** — the chat interface will connect to the backend automatically.

### 5. Verify APIs (Optional)

```bash
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/customers?limit=3
curl http://localhost:8000/api/v1/customers/1/credit-score
```

---

## 📁 Project Structure

```
banking-agent-ai/
├── backend/
│   ├── pyproject.toml          # Python deps (uv)
│   ├── main.py                 # FastAPI entry point + WebSocket chat
│   ├── config.py               # Central configuration
│   ├── data/
│   │   ├── models.py           # SQLAlchemy ORM models
│   │   ├── database.py         # DB engine & sessions
│   │   └── seed.py             # Synthetic data generator
│   ├── api/
│   │   ├── customers.py        # Customer REST endpoints
│   │   ├── transactions.py     # Transaction REST endpoints
│   │   ├── credit_score.py     # Credit score REST endpoint
│   │   ├── products.py         # Product catalog & eligibility
│   │   └── schemas.py          # Pydantic response schemas
│   └── agent/
│       ├── tools.py            # LangChain tools (HTTP wrappers)
│       ├── graph.py            # LangGraph agent definition
│       ├── scoring.py          # Conversion scoring engine
│       ├── message_generator.py# LLM-powered outreach generator
│       ├── prompts.py          # System prompts
│       └── state.py            # Agent state definition
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx            # React entry
        ├── App.jsx             # Root layout
        ├── index.css           # Design system (dark theme)
        ├── components/
        │   ├── ChatInterface.jsx
        │   ├── MessageBubble.jsx
        │   ├── ToolCallCard.jsx
        │   └── Sidebar.jsx
        └── hooks/
            └── useChat.js      # WebSocket chat hook
```

---

## 🎬 Demo Use Cases

### Use Case 1: Personal Loan Lead Generation
> "Find high-value customers likely to convert for a personal loan this month and generate personalized WhatsApp messages."

**Tools called**: `search_customers` → `get_credit_score` (×N) → `score_lead_conversion` (×N) → `generate_outreach_message` (×3)

### Use Case 2: Deep Customer Analysis
> "Show me the complete profile and spending analysis for customer ID 5, and recommend suitable products."

**Tools called**: `get_customer_profile` → `get_customer_transactions` → `get_credit_score` → `check_product_eligibility`

### Use Case 3: Segment-Based Campaign
> "Which Gold tier customers in Mumbai should I target for credit card upgrades? Score them and draft outreach."

**Tools called**: `search_customers` → `score_lead_conversion` (×N) → `generate_outreach_message` (×3)
