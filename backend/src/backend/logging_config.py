"""Application logging setup.

Uvicorn already prints its own access/startup lines to stdout, which Azure Container Apps
captures into Log Analytics (`ContainerAppConsoleLogs_CL`) — but nothing in the app itself ever
called `logging`, so there was never anything beyond those sparse default lines to see. This
gives the app its own logger, configured to also go to stdout (the only thing Container Apps
collects — there's no persistent volume to write files to).
"""
import logging
import sys

_CONFIGURED = False


def configure_logging(level: str = "INFO") -> None:
    """Idempotent: safe to call multiple times (e.g. once from main.py, once from tests)."""
    global _CONFIGURED
    if _CONFIGURED:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
