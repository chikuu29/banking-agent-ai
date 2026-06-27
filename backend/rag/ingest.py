"""Document ingestion pipeline for the RAG knowledge base.

Loads markdown files from the knowledge_base/ directory, splits them into
chunks, classifies by category, and stores embeddings in ChromaDB.
"""

import logging
import os
import re

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import KNOWLEDGE_BASE_DIR, RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP
from rag.embeddings import create_embeddings
from rag.vector_store import get_vector_store, reset_vector_store, COLLECTION_NAME

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Category Classification
# ---------------------------------------------------------------------------

# Map filename patterns to knowledge categories
_CATEGORY_MAP = {
    "rbi_rules": "rbi_rules",
    "regulations": "rbi_rules",
    "product_catalog": "product_catalog",
    "eligibility": "eligibility",
    "special_offers": "special_offers",
    "edge_cases": "special_offers",
}


def _classify_document(source_path: str) -> str:
    """Classify a document into a knowledge category based on its filename.

    Args:
        source_path: The file path of the source document.

    Returns:
        A category string (e.g., 'rbi_rules', 'product_catalog').
    """
    basename = os.path.basename(source_path).lower()
    for pattern, category in _CATEGORY_MAP.items():
        if pattern in basename:
            return category
    return "general"


def _classify_chunk(chunk_content: str, file_category: str) -> str:
    """Refine category for a specific chunk based on its content.

    If the file-level category is too broad, inspect the content for
    more specific classification signals.

    Args:
        chunk_content: The text content of the chunk.
        file_category: The category assigned at file level.

    Returns:
        The refined category string.
    """
    content_lower = chunk_content.lower()

    # Content-based overrides for mixed documents
    if any(kw in content_lower for kw in ["rbi", "circular", "regulation", "compliance", "npa", "aml", "kyc guideline"]):
        return "rbi_rules"
    if any(kw in content_lower for kw in ["eligibility matrix", "rejection criteria", "minimum age", "minimum credit score", "employment type"]):
        return "eligibility"
    if any(kw in content_lower for kw in ["special offer", "festival", "diwali", "women-specific", "senior citizen", "nri-specific", "edge case", "exception"]):
        return "special_offers"
    if any(kw in content_lower for kw in ["product details", "interest rate", "processing fee", "loan amount", "tenure", "product id"]):
        return "product_catalog"

    return file_category


# ---------------------------------------------------------------------------
# Ingestion Pipeline
# ---------------------------------------------------------------------------

def ingest_knowledge_base(force_reingest: bool = False) -> int:
    """Load markdown files, split into chunks, embed and store in ChromaDB.

    Args:
        force_reingest: If True, clears existing data before ingesting.

    Returns:
        Number of chunks ingested.
    """
    kb_dir = KNOWLEDGE_BASE_DIR

    if not os.path.exists(kb_dir):
        logger.error("❌ [RAG] Knowledge base directory not found: %s", kb_dir)
        return 0

    md_files = [f for f in os.listdir(kb_dir) if f.endswith(".md")]
    if not md_files:
        logger.warning("⚠️ [RAG] No markdown files found in %s", kb_dir)
        return 0

    logger.info("╔═══ RAG Ingestion Pipeline ═══════════════════════")
    logger.info("║ Knowledge base directory: %s", kb_dir)
    logger.info("║ Markdown files found: %d (%s)", len(md_files), ", ".join(md_files))
    logger.info("║ Chunk size: %d chars, overlap: %d chars", RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP)

    # --- Step 1: Load documents ---
    loader = DirectoryLoader(
        kb_dir,
        glob="**/*.md",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
        show_progress=False,
    )
    documents = loader.load()
    logger.info("║ Loaded %d documents", len(documents))

    # --- Step 2: Split into chunks ---
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=RAG_CHUNK_SIZE,
        chunk_overlap=RAG_CHUNK_OVERLAP,
        separators=[
            "\n## ",     # Major section headers
            "\n### ",    # Subsection headers  
            "\n---",     # Horizontal rules
            "\n\n",      # Paragraph breaks
            "\n",        # Line breaks
            " ",         # Word breaks
        ],
        keep_separator=True,
        strip_whitespace=True,
    )
    chunks = splitter.split_documents(documents)
    logger.info("║ Split into %d chunks", len(chunks))

    # --- Step 3: Enrich metadata ---
    for i, chunk in enumerate(chunks):
        source = chunk.metadata.get("source", "")
        file_category = _classify_document(source)
        content_category = _classify_chunk(chunk.page_content, file_category)

        chunk.metadata["category"] = content_category
        chunk.metadata["chunk_index"] = i
        chunk.metadata["source_file"] = os.path.basename(source)

    # Log category distribution
    category_counts = {}
    for chunk in chunks:
        cat = chunk.metadata["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1
    logger.info("║ Category distribution: %s", category_counts)

    # --- Step 4: Initialize embeddings and store ---
    embeddings = create_embeddings()

    if force_reingest:
        logger.info("║ Force re-ingest: clearing existing vector store...")
        reset_vector_store()
        # Delete the collection and recreate
        import chromadb
        client = chromadb.PersistentClient(path=os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "chroma_db")
        ))
        try:
            client.delete_collection(COLLECTION_NAME)
            logger.info("║ Deleted existing collection '%s'", COLLECTION_NAME)
        except Exception:
            pass  # Collection didn't exist

    vector_store = get_vector_store(embeddings)

    # Check if already populated (avoid duplicate ingestion)
    existing_count = vector_store._collection.count()
    if existing_count > 0 and not force_reingest:
        logger.info("║ Vector store already has %d chunks — skipping ingestion", existing_count)
        logger.info("║ (Use force_reingest=True to re-ingest)")
        logger.info("╚═══════════════════════════════════════════════")
        return existing_count

    # --- Step 5: Embed and store ---
    logger.info("║ Embedding and storing %d chunks...", len(chunks))
    vector_store.add_documents(chunks)

    final_count = vector_store._collection.count()
    logger.info("║ ✅ Ingestion complete — %d chunks stored in ChromaDB", final_count)
    logger.info("╚═══════════════════════════════════════════════")

    return final_count
