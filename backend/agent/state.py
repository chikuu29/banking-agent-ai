"""Agent state definition for LangGraph."""

from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """State maintained throughout the agent's conversation.
    
    Uses LangGraph's message-based state with automatic message accumulation.
    The `messages` field stores the full conversation history including
    user messages, agent responses, and tool call results.
    """
    messages: Annotated[list, add_messages]
