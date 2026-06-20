"""FastAPI application entry point.

Serves the mock banking APIs and the WebSocket chat endpoint
for the LangGraph agent.
"""

import json
import uuid
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import hashlib

from config import API_HOST, API_PORT
from data.database import init_db, engine
from data.models import Base, Customer
from data.seed import seed_database

# Import API routers
from api.customers import router as customers_router
from api.transactions import router as transactions_router
from api.credit_score import router as credit_score_router
from api.products import router as products_router

# Import agent
from agent.graph import create_agent


# --- Lifespan ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed data on startup."""
    # Check if DB needs seeding
    init_db()
    from sqlalchemy.orm import Session
    from data.database import SessionLocal
    db = SessionLocal()
    count = db.query(Customer).count()
    db.close()

    if count == 0:
        print("[*] No data found -- seeding database...")
        seed_database()
    else:
        print(f"[OK] Database ready with {count} customers")

    # Create agent
    app.state.agent = create_agent()
    print("[OK] Agent initialized and ready")

    yield


# --- App Setup ---

app = FastAPI(
    title="Banking CRM Agentic AI",
    description=(
        "Conversation-based AI assistant for Banking Relationship Managers. "
        "Exposes mock banking APIs and a LangGraph-powered chat agent."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(customers_router)
app.include_router(transactions_router)
app.include_router(credit_score_router)
app.include_router(products_router)


# --- Pydantic Schemas for Auth & Threads ---

class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[str] = None
    assigned_rm_id: Optional[str] = "RM001"

class ThreadCreateRequest(BaseModel):
    title: str = "New Conversation"


# --- Auth Endpoints ---

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/api/v1/auth/signup")
def signup(payload: SignupRequest):
    from data.database import SessionLocal
    from data.models import User
    
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == payload.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
            
        new_user = User(
            username=payload.username,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            email=payload.email,
            assigned_rm_id=payload.assigned_rm_id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {
            "id": new_user.id,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "assigned_rm_id": new_user.assigned_rm_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/api/v1/auth/login")
def login(payload: LoginRequest):
    from data.database import SessionLocal
    from data.models import User
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == payload.username).first()
        if not user or user.password_hash != hash_password(payload.password):
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        return {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "assigned_rm_id": user.assigned_rm_id
        }
    finally:
        db.close()


# --- Thread Management Endpoints ---

@app.get("/api/v1/chat/threads")
def get_threads(user_id: int):
    from data.database import SessionLocal
    from data.models import ChatThread
    
    db = SessionLocal()
    try:
        threads = (
            db.query(ChatThread)
            .filter(ChatThread.user_id == user_id)
            .order_by(ChatThread.updated_at.desc())
            .all()
        )
        return [
            {
                "id": t.id,
                "title": t.title,
                "created_at": t.created_at.isoformat(),
                "updated_at": t.updated_at.isoformat()
            }
            for t in threads
        ]
    finally:
        db.close()

@app.post("/api/v1/chat/threads")
def create_thread(user_id: int, payload: ThreadCreateRequest):
    from data.database import SessionLocal
    from data.models import ChatThread
    import uuid
    
    db = SessionLocal()
    try:
        thread_id = str(uuid.uuid4())
        new_thread = ChatThread(
            id=thread_id,
            user_id=user_id,
            title=payload.title
        )
        db.add(new_thread)
        db.commit()
        
        return {
            "id": new_thread.id,
            "title": new_thread.title,
            "created_at": new_thread.created_at.isoformat()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/api/v1/chat/threads/{thread_id}")
def delete_thread(thread_id: str, user_id: int):
    from data.database import SessionLocal
    from data.models import ChatThread
    
    db = SessionLocal()
    try:
        thread = db.query(ChatThread).filter(ChatThread.id == thread_id, ChatThread.user_id == user_id).first()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        db.delete(thread)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# --- Token & Execution Flow Logs Endpoints ---

@app.get("/api/v1/chat/logs")
def get_logs(user_id: int, limit: int = 15):
    from data.database import SessionLocal
    from data.models import ExecutionLog
    
    db = SessionLocal()
    try:
        logs = (
            db.query(ExecutionLog)
            .filter(ExecutionLog.user_id == user_id)
            .order_by(ExecutionLog.timestamp.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": l.id,
                "thread_id": l.thread_id,
                "query": l.query,
                "execution_flow": l.execution_flow,
                "token_count_input": l.token_count_input,
                "token_count_output": l.token_count_output,
                "total_tokens": l.total_tokens,
                "timestamp": l.timestamp.isoformat()
            }
            for l in logs
        ]
    finally:
        db.close()


# --- Health Check ---

@app.get("/api/v1/health")
def health_check():
    """Health check endpoint."""
    from data.database import SessionLocal
    db = SessionLocal()
    customer_count = db.query(Customer).count()
    db.close()
    return {
        "status": "healthy",
        "customers": customer_count,
        "agent": "ready",
    }


@app.get("/api/v1/meta/tools")
def get_agent_tools():
    """Retrieve metadata about the AI Agent's tools."""
    return [
        {
            "name": "search_customers",
            "description": "Search for customers matching specific criteria like income, credit score, relationship tier, and product gaps. Useful for identifying targets for campaigns.",
            "category": "Customer Search",
            "parameters": [
                {"name": "min_income", "type": "int", "description": "Minimum annual income threshold in INR (e.g. 500000)"},
                {"name": "min_credit_score", "type": "int", "description": "Minimum credit score threshold (e.g. 700)"},
                {"name": "tier", "type": "string", "description": "Relationship tier: Platinum, Gold, Silver, Bronze"},
                {"name": "city", "type": "string", "description": "City name filter"},
                {"name": "without_product", "type": "string", "description": "Find customers who don't have this product type (e.g. personal_loan)"},
                {"name": "limit", "type": "int", "description": "Maximum results to return (default 15)"}
            ]
        },
        {
            "name": "get_customer_profile",
            "description": "Get a detailed 360-degree profile for a specific customer, including demographics, accounts, existing products, and relationship metrics.",
            "category": "Customer Profile",
            "parameters": [
                {"name": "customer_id", "type": "int", "description": "The unique customer ID (required)"}
            ]
        },
        {
            "name": "get_customer_transactions",
            "description": "Fetch transaction history and spending analysis for a customer, including income, expenses, top spending categories, and EMI burden analysis.",
            "category": "Transactions & Spend",
            "parameters": [
                {"name": "customer_id", "type": "int", "description": "The unique customer ID (required)"},
                {"name": "months", "type": "int", "description": "Number of months of history to fetch (1-24, default 6)"}
            ]
        },
        {
            "name": "get_credit_score",
            "description": "Get credit score and detailed positive/negative factor analysis for a customer.",
            "category": "Credit Assessment",
            "parameters": [
                {"name": "customer_id", "type": "int", "description": "The unique customer ID (required)"}
            ]
        },
        {
            "name": "check_product_eligibility",
            "description": "Check which banking products a customer is eligible for, evaluating each product against the customer's income and credit score.",
            "category": "Product Recommendations",
            "parameters": [
                {"name": "customer_id", "type": "int", "description": "The unique customer ID (required)"}
            ]
        },
        {
            "name": "score_lead_conversion",
            "description": "Score a customer's likelihood to convert for a specific product type (personal_loan, credit_card, mutual_fund, etc.) using a multi-factor scoring engine.",
            "category": "Lead Scoring",
            "parameters": [
                {"name": "customer_id", "type": "int", "description": "The unique customer ID (required)"},
                {"name": "product_type", "type": "string", "description": "Product type: personal_loan, credit_card, home_loan, mutual_fund, fixed_deposit, insurance (required)"}
            ]
        },
        {
            "name": "generate_outreach_message",
            "description": "Generate a personalized, context-aware outreach message (WhatsApp, Email, or SMS) promoting a product to a customer.",
            "category": "Customer Outreach",
            "parameters": [
                {"name": "customer_id", "type": "int", "description": "The unique customer ID (required)"},
                {"name": "product_type", "type": "string", "description": "Product type to promote (required)"},
                {"name": "channel", "type": "string", "description": "Outreach channel: whatsapp, email, sms (default 'whatsapp')"}
            ]
        }
    ]



# --- Chat History Endpoint ---

def serialize_messages(messages):
    serialized = []
    tool_calls_map = {}
    
    for msg in messages:
        msg_type = msg.__class__.__name__
        
        # Extract text content cleanly
        content = ""
        if hasattr(msg, "content"):
            if isinstance(msg.content, str):
                content = msg.content
            elif isinstance(msg.content, list):
                parts = []
                for part in msg.content:
                    if isinstance(part, str):
                        parts.append(part)
                    elif isinstance(part, dict):
                        if part.get("type") == "text" and "text" in part:
                            parts.append(part["text"])
                        elif "text" in part:
                            parts.append(part["text"])
                content = "".join(parts)
            else:
                content = str(msg.content)

        if msg_type in ("HumanMessage", "HumanMessageChunk"):
            serialized.append({
                "id": getattr(msg, "id", str(uuid.uuid4())),
                "type": "user",
                "content": content,
                "timestamp": None
            })
        elif msg_type in ("AIMessage", "AIMessageChunk"):
            tool_calls = getattr(msg, "tool_calls", [])
            if tool_calls:
                for tc in tool_calls:
                    tc_id = tc.get("id")
                    item = {
                        "id": tc_id,
                        "type": "tool_call",
                        "name": tc.get("name"),
                        "args": tc.get("args"),
                        "status": "done",
                        "result": None,
                        "timestamp": None
                    }
                    serialized.append(item)
                    if tc_id:
                        tool_calls_map[tc_id] = item
            
            if content.strip():
                serialized.append({
                    "id": getattr(msg, "id", str(uuid.uuid4())),
                    "type": "assistant",
                    "content": content,
                    "timestamp": None
                })
        elif msg_type in ("ToolMessage", "ToolMessageChunk"):
            tc_id = getattr(msg, "tool_call_id", None)
            if tc_id and tc_id in tool_calls_map:
                tool_calls_map[tc_id]["result"] = content
                tool_calls_map[tc_id]["status"] = "done"
            else:
                serialized.append({
                    "id": getattr(msg, "id", str(uuid.uuid4())),
                    "type": "tool_result",
                    "name": getattr(msg, "name", "unknown"),
                    "result": content,
                    "timestamp": None
                })
    return serialized


@app.get("/api/v1/chat/{thread_id}/history")
def get_chat_history(thread_id: str):
    """Retrieve formatted chat history for a given thread ID."""
    config = {"configurable": {"thread_id": thread_id}}
    agent = app.state.agent
    
    try:
        state = agent.get_state(config)
        messages = state.values.get("messages", [])
    except Exception as e:
        print(f"[ERROR] Failed to retrieve agent state for history: {e}")
        messages = []
        
    return {
        "thread_id": thread_id,
        "messages": serialize_messages(messages)
    }


# --- WebSocket Chat Endpoint ---

@app.websocket("/api/v1/chat")
async def chat_websocket(websocket: WebSocket, user_id: Optional[int] = None):
    """WebSocket endpoint for streaming agent conversations with logging and RM personalization.
    
    Protocol:
    - Client sends: {"message": "user query", "thread_id": "optional-id"}
    - Server sends events as they happen:
        - {"type": "tool_call", "name": "tool_name", "args": {...}}
        - {"type": "tool_result", "name": "tool_name", "result": "..."}
        - {"type": "agent_message", "content": "response text"}
        - {"type": "error", "content": "error message"}
        - {"type": "done"}
    """
    await websocket.accept()
    
    # Resolve logged-in user profile details
    from data.database import SessionLocal
    from data.models import User, ChatThread, ExecutionLog
    from langchain_core.messages import SystemMessage
    
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    rm_name = user.full_name if user else "Relationship Manager"
    rm_id = user.assigned_rm_id if user else "RM001"
    db.close()

    try:
        while True:
            # Receive user message
            data = await websocket.receive_text()
            payload = json.loads(data)
            user_message = payload.get("message", "")
            thread_id = payload.get("thread_id", str(uuid.uuid4()))

            if not user_message.strip():
                await websocket.send_json({"type": "error", "content": "Empty message"})
                continue

            # Update chat thread title dynamically if it's new
            db = SessionLocal()
            try:
                thread = db.query(ChatThread).filter(ChatThread.id == thread_id).first()
                if thread and thread.title == "New Conversation":
                    # Truncate first message for the chat list title
                    thread.title = user_message[:35] + ("..." if len(user_message) > 35 else "")
                    db.commit()
            except Exception as e:
                print(f"[ERROR] Failed to update chat title: {e}")
                db.rollback()
            finally:
                db.close()

            execution_flow = []
            input_tokens = 0
            output_tokens = 0
            total_tokens = 0

            try:
                agent = websocket.app.state.agent
                config = {
                    "configurable": {
                        "thread_id": thread_id,
                        "rm_name": rm_name,
                        "rm_id": rm_id,
                        "user_id": user_id
                    }
                }

                # Construct system message specifying the active RM profile
                system_msg = SystemMessage(
                    content=(
                        f"IMPORTANT context: You are assisting Relationship Manager {rm_name} (ID: {rm_id}). "
                        f"Whenever you generate outreach messages or sign off, always do so on behalf of {rm_name}."
                    )
                )

                # Stream agent events asynchronously
                async for event in agent.astream(
                    {"messages": [system_msg, ("user", user_message)]},
                    config=config,
                    stream_mode="updates",
                ):
                    for node_name, node_output in event.items():
                        if node_name == "tools":
                            # Tool execution results
                            messages = node_output.get("messages", [])
                            for msg in messages:
                                tool_name = msg.name if hasattr(msg, "name") else "unknown"
                                tool_result = msg.content if hasattr(msg, "content") else str(msg)
                                await websocket.send_json({
                                    "type": "tool_result",
                                    "name": tool_name,
                                    "result": tool_result,
                                })
                                # Add tool call log
                                execution_flow.append({
                                    "type": "tool",
                                    "name": tool_name,
                                    "status": "success"
                                })

                        elif node_name == "agent":
                            # Agent response or tool calls
                            messages = node_output.get("messages", [])
                            for msg in messages:
                                # Extract token usage metadata from Gemini LLM
                                if hasattr(msg, "usage_metadata") and msg.usage_metadata:
                                    input_tokens += msg.usage_metadata.get("input_tokens", 0)
                                    output_tokens += msg.usage_metadata.get("output_tokens", 0)
                                    total_tokens += msg.usage_metadata.get("total_tokens", 0)

                                # Check for tool calls
                                if hasattr(msg, "tool_calls") and msg.tool_calls:
                                    for tc in msg.tool_calls:
                                        t_name = tc.get("name", "unknown")
                                        await websocket.send_json({
                                            "type": "tool_call",
                                            "name": t_name,
                                            "args": tc.get("args", {}),
                                        })
                                        execution_flow.append({
                                            "type": "agent_call",
                                            "name": t_name
                                        })
                                
                                # Check for text content (final response)
                                if hasattr(msg, "content") and msg.content and not (hasattr(msg, "tool_calls") and msg.tool_calls):
                                    content_str = ""
                                    if isinstance(msg.content, str):
                                        content_str = msg.content
                                    elif isinstance(msg.content, list):
                                        parts = []
                                        for part in msg.content:
                                            if isinstance(part, str):
                                                parts.append(part)
                                            elif isinstance(part, dict):
                                                if part.get("type") == "text" and "text" in part:
                                                    parts.append(part["text"])
                                                elif "text" in part:
                                                    parts.append(part["text"])
                                        content_str = "".join(parts)
                                    else:
                                        content_str = str(msg.content)

                                    await websocket.send_json({
                                        "type": "agent_message",
                                        "content": content_str,
                                    })

                # Fallback to simulated token counts if using MockAgent or token API metadata is missing
                if total_tokens == 0:
                    tool_calls_count = sum(1 for step in execution_flow if step["type"] == "tool")
                    input_tokens = 140 + tool_calls_count * 120 + len(user_message) // 6
                    output_tokens = 60 + tool_calls_count * 40
                    total_tokens = input_tokens + output_tokens

                # Persist the execution log
                db = SessionLocal()
                try:
                    log_entry = ExecutionLog(
                        thread_id=thread_id,
                        user_id=user_id,
                        query=user_message,
                        execution_flow=execution_flow,
                        token_count_input=input_tokens,
                        token_count_output=output_tokens,
                        total_tokens=total_tokens
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception as e:
                    print(f"[ERROR] Failed to save execution log: {e}")
                    db.rollback()
                finally:
                    db.close()

                # Signal completion
                await websocket.send_json({"type": "done", "thread_id": thread_id})

            except Exception as e:
                error_msg = f"Agent error: {str(e)}"
                print(f"[ERROR] {error_msg}")
                traceback.print_exc()
                await websocket.send_json({"type": "error", "content": error_msg})
                await websocket.send_json({"type": "done", "thread_id": thread_id})

    except WebSocketDisconnect:
        print("[*] Client disconnected")
    except Exception as e:
        print(f"[ERROR] WebSocket error: {e}")
        traceback.print_exc()


# --- Run ---

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=True)
