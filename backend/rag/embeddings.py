"""Embedding model factory for the RAG pipeline.

Primary: Google Generative AI Embeddings (uses existing GOOGLE_API_KEY).
Fallback: HuggingFace sentence-transformers (local, no API needed).
"""

import logging

from config import GOOGLE_API_KEY, EMBEDDING_MODEL

logger = logging.getLogger(__name__)

# Module-level cache for the embedding model (singleton)
_embeddings_instance = None


def create_embeddings():
    """Create or return cached embedding model with automatic fallback.

    Tries Google Generative AI Embeddings first (requires GOOGLE_API_KEY).
    Falls back to HuggingFace sentence-transformers if Google is unavailable.

    Returns:
        An embedding model compatible with LangChain's Embeddings interface.
    """
    global _embeddings_instance

    if _embeddings_instance is not None:
        return _embeddings_instance

    # --- Primary: Google Generative AI Embeddings ---
    if GOOGLE_API_KEY:
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings

            _embeddings_instance = GoogleGenerativeAIEmbeddings(
                model=EMBEDDING_MODEL,
                google_api_key=GOOGLE_API_KEY,
            )
            # Quick smoke-test to validate the API key works for embeddings
            _embeddings_instance.embed_query("test")
            logger.info(
                "✅ [RAG] Embedding model initialized: Google GenAI (%s)",
                EMBEDDING_MODEL,
            )
            return _embeddings_instance
        except Exception as e:
            logger.warning(
                "⚠️ [RAG] Google GenAI embeddings failed: %s. Trying fallback...", e
            )
            _embeddings_instance = None

    # --- Fallback: HuggingFace sentence-transformers (local) ---
    try:
        from langchain_huggingface import HuggingFaceEmbeddings

        fallback_model = "all-MiniLM-L6-v2"
        _embeddings_instance = HuggingFaceEmbeddings(model_name=fallback_model)
        logger.info(
            "✅ [RAG] Embedding model initialized: HuggingFace (%s) [fallback]",
            fallback_model,
        )
        return _embeddings_instance
    except Exception as e:
        logger.error("❌ [RAG] All embedding models failed: %s", e)
        raise RuntimeError(
            "Cannot initialize any embedding model. "
            "Please set GOOGLE_API_KEY or install sentence-transformers."
        ) from e
