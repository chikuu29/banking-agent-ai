"""LangGraph agent definition.

Creates a ReAct agent that uses the banking CRM tools to assist
Relationship Managers with customer analysis and outreach.
"""

import logging

from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from agent.llm_factory import create_llm
from agent.tools import ALL_TOOLS
from agent.prompts import SYSTEM_PROMPT

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Agent Factory
# ---------------------------------------------------------------------------

def create_agent():
    """Create and return the configured LangGraph ReAct agent.

    Returns:
        A compiled LangGraph agent or MockAgent ready to process messages.
    """
    import time

    logger.info("╔═══ Agent Initialization ═══════════════════════")
    logger.info("║ Loading system prompt (%d chars)", len(SYSTEM_PROMPT))
    logger.info("║ Binding %d tools: %s", len(ALL_TOOLS), [t.name for t in ALL_TOOLS])

    try:
        start = time.perf_counter()
        llm = create_llm(temperature=0.3)
        llm_elapsed = (time.perf_counter() - start) * 1000
        logger.info("║ LLM created in %.1fms", llm_elapsed)

        # Create memory for conversation persistence
        memory = MemorySaver()
        logger.info("║ MemorySaver checkpointer initialized")

        # Create ReAct agent with tools
        agent_start = time.perf_counter()
        agent = create_react_agent(
            model=llm,
            tools=ALL_TOOLS,
            prompt=SYSTEM_PROMPT,
            checkpointer=memory,
        )
        agent_elapsed = (time.perf_counter() - agent_start) * 1000
        logger.info("║ ReAct agent compiled in %.1fms", agent_elapsed)

        total_elapsed = (time.perf_counter() - start) * 1000
        logger.info("║ ✓ Agent ready (total: %.1fms)", total_elapsed)
        logger.info("╚═══════════════════════════════════════════════")
        return agent
    except Exception as e:
        logger.warning("╠═══ FALLBACK ═══════════════════════════════════")
        logger.warning("║ Failed to initialize LLM: %s", e)
        logger.warning("║ Falling back to MockAgent")
        logger.warning("╚═══════════════════════════════════════════════")
        from agent.mock_agent import MockAgent
        return MockAgent()


# ---------------------------------------------------------------------------
# Agent Runner (sync streaming helper)
# ---------------------------------------------------------------------------

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
    logger.info("[AgentRunner] Streaming response for thread=%s, message='%s'",
                thread_id, user_message[:80])

    events = agent.stream(
        {"messages": [("user", user_message)]},
        config=config,
        stream_mode="updates",
    )

    event_count = 0
    for event in events:
        event_count += 1
        for node_name in event:
            logger.debug("[AgentRunner] Event #%d from node '%s'", event_count, node_name)
        yield event

    logger.info("[AgentRunner] Stream complete — %d events yielded", event_count)
