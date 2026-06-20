"""Centralized logging configuration for the Banking CRM backend.

Call `setup_logging()` once at application startup (in main.py lifespan)
to configure all loggers. Individual modules should use:

    import logging
    logger = logging.getLogger(__name__)
"""

import logging
import sys
import os


def setup_logging() -> None:
    """Configure the root logger with a rich console format.

    Reads LOG_LEVEL from the environment (default: INFO).
    All existing handlers on the root logger are replaced.
    """
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    formatter = logging.Formatter(
        fmt="[%(asctime)s] %(levelname)-8s | %(name)-28s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)

    # Remove any pre-existing handlers to avoid duplicate output
    root.handlers.clear()
    root.addHandler(console_handler)

    # Quieten noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("langchain").setLevel(logging.WARNING)
    logging.getLogger("langsmith").setLevel(logging.WARNING)
