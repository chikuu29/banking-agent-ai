"""Mock LangGraph agent for fallback when Google API Key is not configured.

Simulates the agent reasoning process, tool execution, and response generation,
making it look like a fully functioning LangGraph ReAct agent to the client.
"""

import logging
import asyncio
import json
import re
import time
from typing import AsyncGenerator, Dict, Any, List

logger = logging.getLogger(__name__)

class MockAIMessage:
    def __init__(self, content="", tool_calls=None, usage_metadata=None):
        self.content = content
        self.tool_calls = tool_calls or []
        self.usage_metadata = usage_metadata or {
            "input_tokens": 120 + len(content) // 6 + (200 if tool_calls else 0),
            "output_tokens": 30 + len(content) // 6 + (50 if tool_calls else 0),
            "total_tokens": 150 + len(content) // 3 + (250 if tool_calls else 0)
        }

class MockToolMessage:
    def __init__(self, name, content):
        self.name = name
        self.content = content

class MockAgent:
    """Simulates LangGraph agent execution flow by invoking actual tool functions.
    
    This keeps the UI's tool call visualization active and functional even without
    an LLM API key.
    """
    
    def __init__(self):
        # Lazy imports of tools to avoid circular dependencies
        from agent.tools import (
            search_customers,
            get_customer_profile,
            get_customer_transactions,
            get_credit_score,
            check_product_eligibility,
            score_lead_conversion,
            generate_outreach_message
        )
        self.tools = {
            "search_customers": search_customers,
            "get_customer_profile": get_customer_profile,
            "get_customer_transactions": get_customer_transactions,
            "get_credit_score": get_credit_score,
            "check_product_eligibility": check_product_eligibility,
            "score_lead_conversion": score_lead_conversion,
            "generate_outreach_message": generate_outreach_message,
        }
        self.state_db = {}

    def get_state(self, config: dict):
        thread_id = config.get("configurable", {}).get("thread_id", "default")
        messages = self.state_db.get(thread_id, [])
        class MockState:
            def __init__(self, messages):
                self.values = {"messages": messages}
        return MockState(messages)

    async def _run_tool(self, name: str, args: dict) -> str:
        """Run a tool in a separate thread to avoid blocking the event loop."""
        logger.info("  🔧 [MockAgent] Simulating tool execution: %s with args=%s", name, args)
        start = time.perf_counter()
        tool = self.tools.get(name)
        if not tool:
            logger.warning("  ✗ [MockAgent] Tool %s not found!", name)
            return json.dumps({"error": f"Tool {name} not found"})
        try:
            # Execute the tool's invoke method in a thread pool
            result = await asyncio.to_thread(tool.invoke, args)
            elapsed = (time.perf_counter() - start) * 1000
            logger.info("  ✓ [MockAgent] Simulated tool %s success in %.1fms (response size: %d bytes)",
                        name, elapsed, len(result))
            return result
        except Exception as e:
            elapsed = (time.perf_counter() - start) * 1000
            logger.error("  ✗ [MockAgent] Simulated tool %s failed in %.1fms: %s", name, elapsed, e)
            return json.dumps({"error": str(e)})

    def _record_event_in_history(self, thread_id: str, event: dict):
        from langchain_core.messages import AIMessage, ToolMessage
        
        if thread_id not in self.state_db:
            self.state_db[thread_id] = []
        state_msgs = self.state_db[thread_id]
        
        if "agent" in event:
            agent_data = event["agent"]
            for msg in agent_data.get("messages", []):
                # Check if it has tool calls
                tool_calls = []
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    for tc in msg.tool_calls:
                        tool_calls.append({
                            "name": tc.get("name"),
                            "args": tc.get("args"),
                            "id": tc.get("id") or f"call_{tc.get('name')}_{len(state_msgs)}"
                        })
                # Check if we should append
                state_msgs.append(AIMessage(
                    content=msg.content, 
                    tool_calls=tool_calls, 
                    usage_metadata=getattr(msg, "usage_metadata", None)
                ))
                
        elif "tools" in event:
            tools_data = event["tools"]
            for msg in tools_data.get("messages", []):
                # Find the corresponding tool call in the state messages to get the id
                name = getattr(msg, "name", "unknown")
                content = getattr(msg, "content", "")
                
                # Search backwards for the most recent AIMessage that had a tool call with this name
                tool_call_id = f"tool_{name}_{len(state_msgs)}"
                for m in reversed(state_msgs):
                    if isinstance(m, AIMessage) and m.tool_calls:
                        matching_tc = next((tc for tc in m.tool_calls if tc.get("name") == name), None)
                        if matching_tc:
                            tool_call_id = matching_tc.get("id")
                            break
                            
                state_msgs.append(ToolMessage(content=content, name=name, tool_call_id=tool_call_id))

    async def astream(self, input_data: Dict[str, Any], config: Dict[str, Any] = None, stream_mode: str = "updates") -> AsyncGenerator[Dict[str, Any], None]:
        thread_id = config.get("configurable", {}).get("thread_id", "default") if config else "default"
        if thread_id not in self.state_db:
            self.state_db[thread_id] = []

        # Record user message
        messages = input_data.get("messages", [])
        user_message_text = ""
        if messages:
            user_msg = messages[-1]
            user_message_text = user_msg[1] if isinstance(user_msg, tuple) else getattr(user_msg, "content", str(user_msg))
            state_msgs = self.state_db[thread_id]
            if not state_msgs or state_msgs[-1].content != user_message_text:
                from langchain_core.messages import HumanMessage
                state_msgs.append(HumanMessage(content=user_message_text))

        logger.info("[MockAgent] Starting streaming response for thread=%s, query='%s'", thread_id, user_message_text[:80])

        # We will wrap the internal generator to capture yielded events
        event_count = 0
        async for event in self._astream_internal(input_data, config, stream_mode):
            event_count += 1
            # Record events into history
            self._record_event_in_history(thread_id, event)
            yield event

        logger.info("[MockAgent] Stream complete for thread=%s — %d events yielded", thread_id, event_count)

    async def _astream_internal(self, input_data: Dict[str, Any], config: Dict[str, Any] = None, stream_mode: str = "updates") -> AsyncGenerator[Dict[str, Any], None]:
        """Async generator simulating agent stream execution."""
        messages = input_data.get("messages", [])
        if not messages:
            logger.warning("[MockAgent] No messages provided to stream execution.")
            yield {"agent": {"messages": [MockAIMessage(content="Hello! How can I assist you today?")]}}
            return

        # Resolve RM Name and RM ID from DB
        thread_id = config.get("configurable", {}).get("thread_id", "default") if config else "default"
        rm_name = "Relationship Manager"
        rm_id = "RM001"
        if thread_id and thread_id != "default":
            from data.database import SessionLocal
            from data.models import User, ChatThread
            db = SessionLocal()
            try:
                thread = db.query(ChatThread).filter(ChatThread.id == thread_id).first()
                if thread:
                    user = db.query(User).filter(User.id == thread.user_id).first()
                    if user:
                        rm_name = user.full_name
                        rm_id = user.assigned_rm_id
            except Exception as e:
                logger.error("[MockAgent] Failed to query RM for thread %s: %s", thread_id, e)
            finally:
                db.close()

        # Get last user message
        user_msg = messages[-1]
        user_message_text = user_msg[1] if isinstance(user_msg, tuple) else getattr(user_msg, "content", str(user_msg))
        user_message_text_lower = user_message_text.lower()

        # Check for Use Case 2: Deep Customer Analysis for specific customer ID
        match_id = re.search(r'(?:customer id|customer|id|#)\s*(\d+)', user_message_text_lower)
        
        if match_id:
            customer_id = int(match_id.group(1))
            logger.info("[MockAgent] Query matched 'Deep Customer Analysis' (customer_id=%d) for thread %s", customer_id, thread_id)
            async for event in self._stream_customer_analysis(customer_id, rm_name, rm_id):
                yield event
            return

        # Check for Use Case 1: Personal Loan Campaign
        if "personal loan" in user_message_text_lower or "loan" in user_message_text_lower:
            logger.info("[MockAgent] Query matched 'Personal Loan Campaign' for thread %s", thread_id)
            async for event in self._stream_personal_loan_campaign(rm_name, rm_id):
                yield event
            return

        # Check for Use Case 3: Credit Card Campaign
        if "credit card" in user_message_text_lower or "card" in user_message_text_lower:
            tier = "Gold" if "gold" in user_message_text_lower else None
            city = "Mumbai" if "mumbai" in user_message_text_lower else None
            logger.info("[MockAgent] Query matched 'Credit Card Campaign' (tier=%s, city=%s) for thread %s", tier, city, thread_id)
            async for event in self._stream_credit_card_campaign(rm_name, rm_id, tier=tier, city=city):
                yield event
            return

        # General/fallback case
        logger.info("[MockAgent] Query did not match predefined scenario, showing fallback help for thread %s", thread_id)
        async for event in self._stream_fallback_response():
            yield event

    def stream(self, input_data: Dict[str, Any], config: Dict[str, Any] = None, stream_mode: str = "updates"):
        """Synchronous version of stream, yielding events by wrapping astream."""
        # Standard synchronous wrapper for the async generator using a new event loop
        loop = asyncio.new_event_loop()
        async_gen = self.astream(input_data, config, stream_mode)
        try:
            while True:
                try:
                    event = loop.run_until_complete(async_gen.__anext__())
                    yield event
                except StopAsyncIteration:
                    break
        finally:
            loop.close()

    async def _stream_personal_loan_campaign(self, rm_name: str = "Relationship Manager", rm_id: str = "RM001") -> AsyncGenerator[Dict[str, Any], None]:
        """Simulate the multi-step reasoning and tool call flow for loan campaign."""
        logger.info("[MockAgent] Starting Personal Loan Campaign simulation. RM='%s' (ID: %s)", rm_name, rm_id)
        # 1. search_customers
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content="Let's find high-income customers with good credit scores who don't already have a personal loan.",
                        tool_calls=[{
                            "name": "search_customers",
                            "args": {"min_income": 800000, "min_credit_score": 700, "without_product": "personal_loan", "limit": 3}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(1.2)

        search_args = {"min_income": 800000, "min_credit_score": 700, "without_product": "personal_loan", "limit": 3}
        search_res = await self._run_tool("search_customers", search_args)
        yield {"tools": {"messages": [MockToolMessage("search_customers", search_res)]}}
        await asyncio.sleep(0.8)

        # Parse customers
        try:
            customers = json.loads(search_res)
        except Exception:
            customers = []

        logger.info("[MockAgent] Personal Loan Campaign: found %d high-income customers matching criteria", len(customers))

        if not customers:
            logger.warning("[MockAgent] Personal Loan Campaign: no candidates found. Terminating simulation.")
            yield {
                "agent": {
                    "messages": [
                        MockAIMessage(content="No customers matched the criteria for a personal loan campaign.")
                    ]
                }
            }
            return

        # Let's score the candidates and generate messages in batch
        cust_ids_str = ", ".join(str(c.get("id")) for c in customers[:3])
        cust_names_str = ", ".join(c.get("name") for c in customers[:3])
        
        # 2. score_lead_conversion (batched)
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content=f"Scoring lead conversion probability for candidates: {cust_names_str} (IDs: {cust_ids_str}).",
                        tool_calls=[{
                            "name": "score_lead_conversion",
                            "args": {"customer_ids": cust_ids_str, "product_type": "personal_loan"}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(1.0)
        score_res = await self._run_tool("score_lead_conversion", {"customer_ids": cust_ids_str, "product_type": "personal_loan"})
        yield {"tools": {"messages": [MockToolMessage("score_lead_conversion", score_res)]}}
        await asyncio.sleep(0.8)

        # 3. generate_outreach_message (batched)
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content=f"Generating personalized WhatsApp outreach for candidates: {cust_names_str}.",
                        tool_calls=[{
                            "name": "generate_outreach_message",
                            "args": {"customer_ids": cust_ids_str, "product_type": "personal_loan", "channel": "whatsapp"}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(1.0)
        msg_res = await self._run_tool("generate_outreach_message", {"customer_ids": cust_ids_str, "product_type": "personal_loan", "channel": "whatsapp"})
        yield {"tools": {"messages": [MockToolMessage("generate_outreach_message", msg_res)]}}
        await asyncio.sleep(0.8)

        top_candidates = []
        try:
            scores_data = json.loads(score_res)
            msgs_data = json.loads(msg_res)
            for idx, customer in enumerate(customers[:3]):
                cust_id = customer.get("id")
                cust_name = customer.get("name")
                
                score_item = scores_data[idx] if idx < len(scores_data) else {}
                msg_item = msgs_data[idx] if idx < len(msgs_data) else {}
                
                top_candidates.append({
                    "id": cust_id,
                    "name": cust_name,
                    "income": customer.get("annual_income"),
                    "credit_score": customer.get("credit_score"),
                    "score": score_item.get("score", 0),
                    "label": score_item.get("label", "Medium"),
                    "reasons": score_item.get("factors", [])[:2],
                    "message": msg_item.get("message", "")
                })
        except Exception as e:
            logger.error("[MockAgent] Failed to parse batch results in personal loan campaign: %s", e)

        # Final Summary
        logger.info("[MockAgent] Personal Loan Campaign: simulation complete. Generated outreach for %d candidates", len(top_candidates))
        summary_md = "### 🎯 Personal Loan Target Campaign Summary\n\n"
        summary_md += "I have successfully searched, scored, and generated personalized outreach for the top high-potential personal loan candidates:\n\n"
        summary_md += "| ID | Name | Annual Income | Credit Score | Conversion Score | Status |\n"
        summary_md += "|---|---|---|---|---|---|\n"
        for tc in top_candidates:
            summary_md += f"| {tc['id']} | **{tc['name']}** | ₹{tc['income']:,.0f} | {tc['credit_score']} | **{tc['score']}/100** | `{tc['label']}` |\n"
        
        summary_md += "\n---\n\n"
        for tc in top_candidates:
            summary_md += f"#### 👤 {tc['name']} (Score: {tc['score']}/100 - {tc['label']})\n"
            summary_md += f"- **Key Factors**: " + ", ".join([f"{f['name']} (Score: {f['score']}/100)" for f in tc['reasons']]) + "\n"
            summary_md += f"- **Proposed WhatsApp Message**:\n"
            summary_md += f"  ```text\n  {tc['message']}\n  ```\n\n"

        summary_md += f"\n*Note: These recommendations are prepared by {rm_name} ({rm_id}) based on income eligibility, credit history, and recent account activity.*"

        yield {
            "agent": {
                "messages": [
                    MockAIMessage(content=summary_md)
                ]
            }
        }

    async def _stream_customer_analysis(self, customer_id: int, rm_name: str = "Relationship Manager", rm_id: str = "RM001") -> AsyncGenerator[Dict[str, Any], None]:
        """Simulate deep-dive analysis for a single customer ID."""
        logger.info("[MockAgent] Starting Customer Analysis simulation for customer ID %d. RM='%s' (ID: %s)", customer_id, rm_name, rm_id)
        # 1. get_customer_profile
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content=f"Fetching profile for customer ID {customer_id}...",
                        tool_calls=[{
                            "name": "get_customer_profile",
                            "args": {"customer_id": customer_id}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(1.0)
        profile_res = await self._run_tool("get_customer_profile", {"customer_id": customer_id})
        yield {"tools": {"messages": [MockToolMessage("get_customer_profile", profile_res)]}}
        await asyncio.sleep(0.6)

        try:
            profile = json.loads(profile_res)
            cust_name = profile.get("name", f"Customer #{customer_id}")
            logger.info("[MockAgent] Customer Analysis: profile retrieved for customer name '%s'", cust_name)
        except Exception:
            logger.error("[MockAgent] Customer Analysis: failed to parse profile for ID %d", customer_id)
            yield {
                "agent": {
                    "messages": [
                        MockAIMessage(content=f"Error: Customer with ID {customer_id} could not be found.")
                    ]
                }
            }
            return

        # 2. get_customer_transactions
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content=f"Analyzing transaction history for {cust_name}...",
                        tool_calls=[{
                            "name": "get_customer_transactions",
                            "args": {"customer_id": customer_id, "months": 6}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(1.0)
        tx_res = await self._run_tool("get_customer_transactions", {"customer_id": customer_id, "months": 6})
        yield {"tools": {"messages": [MockToolMessage("get_customer_transactions", tx_res)]}}
        await asyncio.sleep(0.6)

        # 3. get_credit_score
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content=f"Retrieving credit score details for {cust_name}...",
                        tool_calls=[{
                            "name": "get_credit_score",
                            "args": {"customer_id": customer_id}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(0.8)
        credit_res = await self._run_tool("get_credit_score", {"customer_id": customer_id})
        yield {"tools": {"messages": [MockToolMessage("get_credit_score", credit_res)]}}
        await asyncio.sleep(0.6)

        # 4. check_product_eligibility
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content=f"Checking product eligibility and cross-sell fit...",
                        tool_calls=[{
                            "name": "check_product_eligibility",
                            "args": {"customer_id": customer_id}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(0.8)
        elig_res = await self._run_tool("check_product_eligibility", {"customer_id": customer_id})
        yield {"tools": {"messages": [MockToolMessage("check_product_eligibility", elig_res)]}}
        await asyncio.sleep(0.6)

        # Parse summaries
        try:
            tx = json.loads(tx_res)
            credit = json.loads(credit_res)
            elig = json.loads(elig_res)
            
            tx_summary = tx.get("summary", {})
            avg_balance = profile.get("average_balance", 0)
        except Exception:
            tx_summary = {}
            credit = {}
            elig = []
            avg_balance = 0

        # Construct Markdown report
        summary_md = f"### 📊 Deep-Dive Customer Portfolio Analysis: {cust_name} (ID: {customer_id})\n\n"
        summary_md += f"Here is the complete financial and relationship overview for **{cust_name}**:\n\n"
        
        summary_md += "#### 👥 Demographics & Relationship Summary\n"
        summary_md += f"- **Age/Gender**: {profile.get('age')} / {profile.get('gender', 'N/A')}\n"
        summary_md += f"- **Occupation**: {profile.get('occupation')}\n"
        summary_md += f"- **City/State**: {profile.get('city')}, {profile.get('state')}\n"
        summary_md += f"- **Relationship Tier**: `{profile.get('relationship_tier')}` (Tenure: {profile.get('account_tenure_years')} years)\n"
        summary_md += f"- **Assigned RM ID**: {profile.get('assigned_rm_id')} (Analyzed by: {rm_name})\n"
        summary_md += f"- **Existing Products**: " + ", ".join([p.replace('_', ' ').title() for p in profile.get('existing_products', [])]) + "\n\n"

        summary_md += "#### 💵 Financial Health & Spend Analysis\n"
        summary_md += f"- **Annual Income**: ₹{profile.get('annual_income'):,.0f}\n"
        summary_md += f"- **Average Account Balance**: ₹{avg_balance:,.0f}\n"
        summary_md += f"- **6-Month Summary**: Debits: ₹{tx_summary.get('total_debits', 0):,.0f} | Credits: ₹{tx_summary.get('total_credits', 0):,.0f}\n"
        summary_md += f"- **Credit Score**: **{credit.get('score')}** ({credit.get('rating')})\n\n"

        summary_md += "#### 💡 Eligible Product Opportunities\n"
        summary_md += "| Product | Status | Fit Score | Reasons |\n"
        summary_md += "|---|---|---|---|\n"
        for p in elig[:4]:
            status_str = "Eligible" if p.get("eligible") else "Ineligible"
            summary_md += f"| {p.get('product_name')} | `{status_str}` | **{p.get('fit_score')}/100** | {', '.join(p.get('reasons', []))} |\n"

        summary_md += "\n#### 🚀 Recommended Action Plan\n"
        best_product = next((p for p in elig if p.get("eligible")), None)
        if best_product:
            summary_md += f"The highest fit product is **{best_product.get('product_name')}** (Fit Score: {best_product.get('fit_score')}/100).\n"
            summary_md += f"I recommend initiating outreach for this product. You can do this by typing: *'Generate outreach for customer {customer_id} for {best_product.get('product_type')}'*."
        else:
            summary_md += "Maintain regular engagement. Customer currently qualifies for savings and basic relationship maintenance."

        logger.info("[MockAgent] Customer Analysis simulation complete for customer ID %d (name: '%s')", customer_id, cust_name)
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(content=summary_md)
                ]
            }
        }

    async def _stream_credit_card_campaign(self, rm_name: str = "Relationship Manager", rm_id: str = "RM001", tier: str = None, city: str = None) -> AsyncGenerator[Dict[str, Any], None]:
        """Simulate credit card campaign for Gold tier in Mumbai."""
        tier_val = tier or "Gold"
        city_val = city or "Mumbai"
        logger.info("[MockAgent] Starting Credit Card Campaign simulation (tier=%s, city=%s). RM='%s' (ID: %s)", tier_val, city_val, rm_name, rm_id)

        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content=f"Searching for {tier_val} tier customers in {city_val} without credit cards...",
                        tool_calls=[{
                            "name": "search_customers",
                            "args": {"tier": tier_val, "city": city_val, "without_product": "credit_card", "limit": 3}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(1.2)
        search_res = await self._run_tool("search_customers", {"tier": tier_val, "city": city_val, "without_product": "credit_card", "limit": 3})
        yield {"tools": {"messages": [MockToolMessage("search_customers", search_res)]}}
        await asyncio.sleep(0.8)

        try:
            customers = json.loads(search_res)
        except Exception:
            customers = []

        logger.info("[MockAgent] Credit Card Campaign: initial search found %d customers", len(customers))

        if not customers:
            # Fallback if specific search yielded nothing
            logger.info("[MockAgent] Credit Card Campaign: no initial candidates found. Running fallback search for tier %s only.", tier_val)
            yield {
                "agent": {
                    "messages": [
                        MockAIMessage(content=f"No {tier_val} customers in {city_val} found without credit cards. Listing all Gold customers instead.")
                    ]
                }
            }
            await asyncio.sleep(0.5)
            search_res = await self._run_tool("search_customers", {"tier": tier_val, "limit": 3})
            try:
                customers = json.loads(search_res)
                logger.info("[MockAgent] Credit Card Campaign: fallback search found %d customers", len(customers))
            except Exception:
                customers = []

        if not customers:
            yield {
                "agent": {
                    "messages": [
                        MockAIMessage(content="No customers found matching the criteria.")
                    ]
                }
            }
            return

        cust_ids_str = ", ".join(str(c.get("id")) for c in customers[:2])
        cust_names_str = ", ".join(c.get("name") for c in customers[:2])

        # 2. score_lead_conversion (batched)
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content=f"Scoring credit card upgrade conversion for candidates: {cust_names_str} (IDs: {cust_ids_str}).",
                        tool_calls=[{
                            "name": "score_lead_conversion",
                            "args": {"customer_ids": cust_ids_str, "product_type": "credit_card"}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(1.0)
        score_res = await self._run_tool("score_lead_conversion", {"customer_ids": cust_ids_str, "product_type": "credit_card"})
        yield {"tools": {"messages": [MockToolMessage("score_lead_conversion", score_res)]}}
        await asyncio.sleep(0.8)

        # 3. generate_outreach_message (batched)
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(
                        content=f"Generating Credit Card upgrade WhatsApp messages for candidates: {cust_names_str}.",
                        tool_calls=[{
                            "name": "generate_outreach_message",
                            "args": {"customer_ids": cust_ids_str, "product_type": "credit_card", "channel": "whatsapp"}
                        }]
                    )
                ]
            }
        }
        await asyncio.sleep(1.0)
        msg_res = await self._run_tool("generate_outreach_message", {"customer_ids": cust_ids_str, "product_type": "credit_card", "channel": "whatsapp"})
        yield {"tools": {"messages": [MockToolMessage("generate_outreach_message", msg_res)]}}
        await asyncio.sleep(0.8)

        top_candidates = []
        try:
            scores_data = json.loads(score_res)
            msgs_data = json.loads(msg_res)
            for idx, customer in enumerate(customers[:2]):
                cust_id = customer.get("id")
                cust_name = customer.get("name")
                
                score_item = scores_data[idx] if idx < len(scores_data) else {}
                msg_item = msgs_data[idx] if idx < len(msgs_data) else {}
                
                top_candidates.append({
                    "id": cust_id,
                    "name": cust_name,
                    "city": customer.get("city"),
                    "income": customer.get("annual_income"),
                    "score": score_item.get("score", 0),
                    "label": score_item.get("label", "Medium"),
                    "message": msg_item.get("message", "")
                })
        except Exception as e:
            logger.error("[MockAgent] Failed to parse batch results in credit card campaign: %s", e)

        summary_md = f"### 💳 Credit Card Upgrade Campaign: {tier_val} Tier ({city_val})\n\n"
        summary_md += "Targeting Gold/Platinum customers with credit card upgrade options based on salary growth and credit rating:\n\n"
        for tc in top_candidates:
            summary_md += f"#### 👤 {tc['name']} (ID: {tc['id']} - {tc['city']})\n"
            summary_md += f"- **Income**: ₹{tc['income']:,.0f} | **Conversion Probability**: **{tc['score']}/100** (`{tc['label']}`)\n"
            summary_md += f"- **Proposed WhatsApp Outreach**:\n"
            summary_md += f"  ```text\n  {tc['message']}\n  ```\n\n"

        summary_md += f"\n*Signed off by: {rm_name} ({rm_id})*"

        logger.info("[MockAgent] Credit Card Upgrade Campaign simulation complete. Generated outreach for %d candidates", len(top_candidates))
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(content=summary_md)
                ]
            }
        }

    async def _stream_fallback_response(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Provide a helpful response listing available commands and scenarios."""
        help_md = (
            "Hello! I am your AI Relationship Manager Assistant. 🏦\n\n"
            "Because the Google Gemini API Key is not currently configured in the environment, "
            "I have loaded in **Resilient Mock Mode**. I will still dynamically retrieve real "
            "live data from your database and perform rule-based calculations!\n\n"
            "Here are three interactive scenarios you can test right now:\n\n"
            "1. **🎯 Target Campaign Pipeline**:\n"
            "   - *Query*: 'Find high-value customers likely to convert for a personal loan this month and generate WhatsApp messages'\n"
            "   - *Demonstrates*: DB Search → Credit Scoring → Personalized Outreach Message Generation.\n\n"
            "2. **👤 Deep-Dive Account Analysis**:\n"
            "   - *Query*: 'Show me a detailed analysis of customer ID 5'\n"
            "   - *Demonstrates*: Demographics → Spending History → Credit Score Analysis → Product Compatibility matrix.\n\n"
            "3. **💳 Regional Credit Card Upgrades**:\n"
            "   - *Query*: 'Which Gold tier customers in Mumbai should I target for credit card upgrades?'\n"
            "   - *Demonstrates*: Segment filtering → Conversion Scoring → Tailored Messaging.\n\n"
            "Feel free to type any of the queries above or click one of the **Quick Action** buttons in the sidebar!"
        )
        yield {
            "agent": {
                "messages": [
                    MockAIMessage(content=help_md)
                ]
            }
        }
