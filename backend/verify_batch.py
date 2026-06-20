import os
import sys
import json
import logging

# Set up paths and environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ["API_BASE_URL"] = "http://localhost:8000"

from agent.tools import (
    get_customer_profile,
    get_customer_transactions,
    get_credit_score,
    check_product_eligibility,
    score_lead_conversion,
    generate_outreach_message
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VerifyBatch")

def verify():
    # Test customer IDs that are known to exist in the database (typically 1, 2, 3)
    cids_str = "1, 2"
    logger.info("Testing get_customer_profile with customer_ids='%s'", cids_str)
    profiles_json = get_customer_profile(customer_ids=cids_str)
    profiles = json.loads(profiles_json)
    assert isinstance(profiles, list), f"Expected list, got {type(profiles)}"
    assert len(profiles) == 2, f"Expected 2 profiles, got {len(profiles)}"
    assert profiles[0]["id"] == 1
    assert profiles[1]["id"] == 2
    logger.info("✓ get_customer_profile passed batch check!")

    logger.info("Testing get_customer_transactions with customer_ids='%s'", cids_str)
    tx_json = get_customer_transactions(customer_ids=cids_str, months=3)
    tx = json.loads(tx_json)
    assert isinstance(tx, list), f"Expected list, got {type(tx)}"
    assert len(tx) == 2, f"Expected 2 transaction responses, got {len(tx)}"
    logger.info("✓ get_customer_transactions passed batch check!")

    logger.info("Testing get_credit_score with customer_ids='%s'", cids_str)
    scores_json = get_credit_score(customer_ids=cids_str)
    scores = json.loads(scores_json)
    assert isinstance(scores, list), f"Expected list, got {type(scores)}"
    assert len(scores) == 2, f"Expected 2 score responses, got {len(scores)}"
    logger.info("✓ get_credit_score passed batch check!")

    logger.info("Testing check_product_eligibility with customer_ids='%s'", cids_str)
    elig_json = check_product_eligibility(customer_ids=cids_str)
    elig = json.loads(elig_json)
    assert isinstance(elig, list), f"Expected list, got {type(elig)}"
    assert len(elig) == 2, f"Expected 2 eligibility responses, got {len(elig)}"
    logger.info("✓ check_product_eligibility passed batch check!")

    logger.info("Testing score_lead_conversion with customer_ids='%s'", cids_str)
    conversion_json = score_lead_conversion(customer_ids=cids_str, product_type="personal_loan")
    conversions = json.loads(conversion_json)
    assert isinstance(conversions, list), f"Expected list, got {type(conversions)}"
    assert len(conversions) == 2, f"Expected 2 conversion scores, got {len(conversions)}"
    logger.info("✓ score_lead_conversion passed batch check!")

    logger.info("Testing generate_outreach_message with customer_ids='%s'", cids_str)
    msgs_json = generate_outreach_message(customer_ids=cids_str, product_type="personal_loan", channel="whatsapp")
    msgs = json.loads(msgs_json)
    assert isinstance(msgs, list), f"Expected list, got {type(msgs)}"
    assert len(msgs) == 2, f"Expected 2 generated messages, got {len(msgs)}"
    logger.info("✓ generate_outreach_message passed batch check!")

    logger.info("ALL BATCH TOOL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    try:
        verify()
    except Exception as e:
        logger.error("Verification failed: %s", e)
        sys.exit(1)
