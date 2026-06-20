"""LLM factory — single source of truth for LLM instantiation.

All backend modules that need an LLM (agent graph, message generator, etc.)
import ``create_llm`` from here.  Switching providers is a one-line env change.
"""

import logging

from config import (
    GOOGLE_API_KEY,
    DEEPSEEK_API_KEY,
    LLM_MODEL,
    LLM_PROVIDER,
)

logger = logging.getLogger(__name__)


def create_llm(temperature: float = 0.3):
    """Create a LangChain chat model based on the configured provider.

    Args:
        temperature: Sampling temperature (default 0.3 for deterministic
            agent reasoning; callers like the message generator may pass a
            higher value for creative output).

    Returns:
        A LangChain ``BaseChatModel`` instance.

    Raises:
        ValueError: If the provider is unknown or the API key is missing.
    """
    import time

    provider = LLM_PROVIDER.lower().strip()
    logger.info("┌─── LLM Factory ───────────────────────────────")
    logger.info("│ Configured provider : %s", LLM_PROVIDER)
    logger.info("│ Configured model    : %s", LLM_MODEL)
    logger.info("│ Temperature         : %.2f", temperature)

    start = time.perf_counter()

    if provider == "deepseek":
        if not DEEPSEEK_API_KEY:
            logger.error("│ ✗ DEEPSEEK_API_KEY is missing!")
            raise ValueError("DEEPSEEK_API_KEY is not set. Please set it in your .env file.")

        from langchain_openai import ChatOpenAI

        model_name = LLM_MODEL if "deepseek" in LLM_MODEL.lower() else "deepseek-chat"
        key_preview = DEEPSEEK_API_KEY[:6] + "..." + DEEPSEEK_API_KEY[-4:] if len(DEEPSEEK_API_KEY) > 10 else "***"
        logger.info("│ API key             : %s", key_preview)
        logger.info("│ Resolved model      : %s", model_name)
        logger.info("│ Base URL            : https://api.deepseek.com")

        llm = ChatOpenAI(
            model=model_name,
            api_key=DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com",
            temperature=temperature,
        )

        elapsed = (time.perf_counter() - start) * 1000
        logger.info("│ ✓ DeepSeek LLM created in %.1fms", elapsed)
        logger.info("└────────────────────────────────────────────────")
        return llm

    elif provider == "gemini":
        if not GOOGLE_API_KEY or "your_gemini" in GOOGLE_API_KEY.lower():
            logger.error("│ ✗ GOOGLE_API_KEY is missing or placeholder!")
            raise ValueError("GOOGLE_API_KEY is not set or is a placeholder.")

        from langchain_google_genai import ChatGoogleGenerativeAI

        key_preview = GOOGLE_API_KEY[:6] + "..." + GOOGLE_API_KEY[-4:] if len(GOOGLE_API_KEY) > 10 else "***"
        logger.info("│ API key             : %s", key_preview)
        logger.info("│ Resolved model      : %s", LLM_MODEL)

        llm = ChatGoogleGenerativeAI(
            model=LLM_MODEL,
            google_api_key=GOOGLE_API_KEY,
            temperature=temperature,
            convert_system_message_to_human=True,
        )

        elapsed = (time.perf_counter() - start) * 1000
        logger.info("│ ✓ Gemini LLM created in %.1fms", elapsed)
        logger.info("└────────────────────────────────────────────────")
        return llm

    else:
        logger.error("│ ✗ Unknown provider: '%s'", provider)
        logger.info("└────────────────────────────────────────────────")
        raise ValueError(
            f"Unknown LLM_PROVIDER '{provider}'. Supported: 'gemini', 'deepseek'"
        )
