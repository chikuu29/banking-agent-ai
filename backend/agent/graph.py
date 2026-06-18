"""LangGraph agent definition.

Creates a ReAct agent that uses the banking CRM tools to assist
Relationship Managers with customer analysis and outreach.
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from config import GOOGLE_API_KEY, LLM_MODEL
from agent.tools import ALL_TOOLS
from agent.prompts import SYSTEM_PROMPT


def create_agent():
    """Create and return the configured LangGraph ReAct agent.
    
    Returns:
        A compiled LangGraph agent or MockAgent ready to process messages.
    """
    # Check if API key is missing or is a placeholder
    is_missing_key = not GOOGLE_API_KEY or "your_gemini" in GOOGLE_API_KEY.lower() or GOOGLE_API_KEY == ""
    
    if is_missing_key:
        print("[!] GOOGLE_API_KEY not set or is placeholder. Using MockAgent fallback...")
        from agent.mock_agent import MockAgent
        return MockAgent()

    # Initialize LLM
    try:
        llm = ChatGoogleGenerativeAI(
            model=LLM_MODEL,
            google_api_key=GOOGLE_API_KEY,
            temperature=0.3,  # Lower temp for more consistent reasoning
            convert_system_message_to_human=True,
        )

        # Create memory for conversation persistence
        memory = MemorySaver()

        # Create ReAct agent with tools
        agent = create_react_agent(
            model=llm,
            tools=ALL_TOOLS,
            prompt=SYSTEM_PROMPT,
            checkpointer=memory,
        )

        return agent
    except Exception as e:
        print(f"[!] Failed to initialize Gemini LLM ({e}). Falling back to MockAgent...")
        from agent.mock_agent import MockAgent
        return MockAgent()


def get_agent_response(agent, user_message: str, thread_id: str = "default"):
    """Run the agent with a user message and return the full response.
    
    Args:
        agent: The compiled LangGraph agent
        user_message: The user's input message
        thread_id: Conversation thread ID for memory
    
    Yields:
        Event dictionaries containing agent actions and responses
    """
    config = {"configurable": {"thread_id": thread_id}}

    events = agent.stream(
        {"messages": [("user", user_message)]},
        config=config,
        stream_mode="updates",
    )

    for event in events:
        yield event
