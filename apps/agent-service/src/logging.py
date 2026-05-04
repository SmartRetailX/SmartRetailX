import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [agent-service] %(message)s",
)

logger = logging.getLogger("agent-service")
