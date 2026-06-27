"""ChromaDB vector store initialization and management.

Provides persistent vector storage for the banking knowledge base.
The vector store is initialized once and reused across the application.
"""

import logging
import os

from langchain_chroma import Chroma

from config import CHROMA_PERSIST_DIR

logger = logging.getLogger(__name__)

# Collection name in ChromaDB
COLLECTION_NAME = "banking_knowledge_base"

# Module-level cache for vector store instance
_vector_store_instance = None


def get_vector_store(embeddings=None):
    """Get or create the ChromaDB vector store.

    Uses a persistent directory so embeddings survive server restarts.
    The vector store is cached at module level (singleton).

    Args:
        embeddings: An embedding model instance. Required on first call;
                    subsequent calls reuse the cached store.

    Returns:
        A LangChain Chroma vector store instance.
    """
    global _vector_store_instance

    if _vector_store_instance is not None:
        return _vector_store_instance

    if embeddings is None:
        from rag.embeddings import create_embeddings
        embeddings = create_embeddings()

    # Ensure persist directory exists
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

    _vector_store_instance = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
    )

    count = _vector_store_instance._collection.count()
    logger.info(
        "✅ [RAG] ChromaDB vector store ready — collection='%s', "
        "persist_dir='%s', existing_chunks=%d",
        COLLECTION_NAME,
        CHROMA_PERSIST_DIR,
        count,
    )
    return _vector_store_instance


def reset_vector_store():
    """Reset the cached vector store instance (forces re-initialization)."""
    global _vector_store_instance
    _vector_store_instance = None
    logger.info("🔄 [RAG] Vector store cache cleared")


def vector_store_exists() -> bool:
    """Check if the ChromaDB persist directory exists and has data."""
    chroma_path = os.path.join(CHROMA_PERSIST_DIR, "chroma.sqlite3")
    return os.path.exists(chroma_path)
