"""Knowledge base retrieval interface for the RAG pipeline.

Provides similarity search over the ChromaDB vector store,
used by the agent's query_knowledge_base tool.
"""

import logging
from typing import Optional

from rag.embeddings import create_embeddings
from rag.vector_store import get_vector_store

logger = logging.getLogger(__name__)


def query_knowledge(
    query: str,
    top_k: int = 5,
    category: Optional[str] = None,
) -> list[dict]:
    """Retrieve relevant knowledge chunks for a natural language query.

    Performs similarity search against the ChromaDB vector store and returns
    the top-k most relevant document chunks with metadata.

    Args:
        query: Natural language search query.
        top_k: Number of top results to return (default: 5).
        category: Optional category filter — 'rbi_rules', 'product_catalog',
                  'eligibility', 'special_offers'. If None, searches all.

    Returns:
        List of dicts, each containing:
            - content: The text content of the matched chunk
            - source: Source filename
            - category: Knowledge category
            - relevance_score: Similarity score (0-1, higher = more relevant)
    """
    embeddings = create_embeddings()
    vector_store = get_vector_store(embeddings)

    # Check if store has any documents
    doc_count = vector_store._collection.count()
    if doc_count == 0:
        logger.warning("⚠️ [RAG] Vector store is empty — no knowledge base ingested")
        return [{
            "content": "Knowledge base is empty. Please ingest documents first.",
            "source": "system",
            "category": "error",
            "relevance_score": 0.0,
        }]

    # Build filter dict for category-based filtering
    filter_dict = None
    if category:
        filter_dict = {"category": category}
        logger.info(
            "🔍 [RAG] Querying knowledge base: query='%s', top_k=%d, category='%s'",
            query[:80], top_k, category,
        )
    else:
        logger.info(
            "🔍 [RAG] Querying knowledge base: query='%s', top_k=%d, category=ALL",
            query[:80], top_k,
        )

    try:
        # Similarity search with relevance scores
        results = vector_store.similarity_search_with_relevance_scores(
            query,
            k=top_k,
            filter=filter_dict,
        )
    except Exception as e:
        logger.error("❌ [RAG] Similarity search failed: %s", e)
        # Try without filter as fallback
        if filter_dict:
            logger.info("🔄 [RAG] Retrying without category filter...")
            try:
                results = vector_store.similarity_search_with_relevance_scores(
                    query, k=top_k
                )
            except Exception as e2:
                logger.error("❌ [RAG] Fallback search also failed: %s", e2)
                return []
        else:
            return []

    # Format results
    formatted = []
    for doc, score in results:
        formatted.append({
            "content": doc.page_content,
            "source": doc.metadata.get("source_file", "unknown"),
            "category": doc.metadata.get("category", "general"),
            "relevance_score": round(float(score), 4),
        })

    logger.info(
        "🔍 [RAG] Retrieved %d results (scores: %s)",
        len(formatted),
        [r["relevance_score"] for r in formatted],
    )

    return formatted


def get_knowledge_base_stats() -> dict:
    """Get statistics about the knowledge base.

    Returns:
        Dict with total_chunks, categories, and source_files.
    """
    try:
        embeddings = create_embeddings()
        vector_store = get_vector_store(embeddings)
        collection = vector_store._collection

        total = collection.count()

        # Get all metadata to compute stats
        if total > 0:
            all_data = collection.get(include=["metadatas"])
            metadatas = all_data.get("metadatas", [])

            categories = {}
            source_files = set()
            for meta in metadatas:
                cat = meta.get("category", "unknown")
                categories[cat] = categories.get(cat, 0) + 1
                source_files.add(meta.get("source_file", "unknown"))
        else:
            categories = {}
            source_files = set()

        return {
            "status": "ready" if total > 0 else "empty",
            "total_chunks": total,
            "categories": categories,
            "source_files": sorted(source_files),
        }
    except Exception as e:
        logger.error("❌ [RAG] Failed to get KB stats: %s", e)
        return {
            "status": "error",
            "total_chunks": 0,
            "categories": {},
            "source_files": [],
            "error": str(e),
        }
