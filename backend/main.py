"""FastAPI application entry point.

Serves the mock banking APIs and the WebSocket chat endpoint
for the LangGraph agent.
"""

import json
import uuid
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

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
async def chat_websocket(websocket: WebSocket):
    """WebSocket endpoint for streaming agent conversations.
    
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

            try:
                agent = websocket.app.state.agent
                config = {"configurable": {"thread_id": thread_id}}

                # Stream agent events asynchronously
                async for event in agent.astream(
                    {"messages": [("user", user_message)]},
                    config=config,
                    stream_mode="updates",
                ):
                    # Process different event types
                    for node_name, node_output in event.items():
                        if node_name == "tools":
                            # Tool execution results
                            messages = node_output.get("messages", [])
                            for msg in messages:
                                await websocket.send_json({
                                    "type": "tool_result",
                                    "name": msg.name if hasattr(msg, "name") else "unknown",
                                    "result": msg.content if hasattr(msg, "content") else str(msg),
                                })

                        elif node_name == "agent":
                            # Agent response or tool calls
                            messages = node_output.get("messages", [])
                            for msg in messages:
                                # Check for tool calls
                                if hasattr(msg, "tool_calls") and msg.tool_calls:
                                    for tc in msg.tool_calls:
                                        await websocket.send_json({
                                            "type": "tool_call",
                                            "name": tc.get("name", "unknown"),
                                            "args": tc.get("args", {}),
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
