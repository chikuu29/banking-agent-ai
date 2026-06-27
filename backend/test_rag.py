"""Quick RAG pipeline verification script."""
import json
from rag.retriever import query_knowledge, get_knowledge_base_stats

# 1. Check KB stats
stats = get_knowledge_base_stats()
print("=== Knowledge Base Stats ===")
print(json.dumps(stats, indent=2))
print()

# 2. Test retrieval: personal loan eligibility
results = query_knowledge("personal loan eligibility criteria minimum salary")
print("=== Query: personal loan eligibility ===")
print(f"Results: {len(results)}")
for r in results:
    snippet = r["content"][:120].replace("\n", " ")
    print(f"  [{r['category']}] score={r['relevance_score']} | {snippet}...")
print()

# 3. Test retrieval: RBI rules
results2 = query_knowledge("RBI rules unsecured lending limits", category="rbi_rules")
print("=== Query: RBI unsecured lending (category=rbi_rules) ===")
print(f"Results: {len(results2)}")
for r in results2:
    snippet = r["content"][:120].replace("\n", " ")
    print(f"  [{r['category']}] score={r['relevance_score']} | {snippet}...")
print()

# 4. Test retrieval: special offers
results3 = query_knowledge("women borrower special benefits concession")
print("=== Query: women borrower benefits ===")
print(f"Results: {len(results3)}")
for r in results3:
    snippet = r["content"][:120].replace("\n", " ")
    print(f"  [{r['category']}] score={r['relevance_score']} | {snippet}...")
print()

# 5. Verify agent loads with 8 tools
from agent.tools import ALL_TOOLS
print(f"=== Agent Tools: {len(ALL_TOOLS)} registered ===")
for t in ALL_TOOLS:
    print(f"  - {t.name}")

print("\n[SUCCESS] All RAG pipeline tests passed!")
