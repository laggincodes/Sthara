import logging
import sys
from app.core.config import settings


def setup_logging() -> logging.Logger:
    """Configures structured standard logging for the application."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    log_format = (
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s"
    )
    date_format = "%Y-%m-%d %H:%M:%S"

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        datefmt=date_format,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    # Silence overly verbose third-party loggers if needed
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    logger = logging.getLogger("3d_cadastre")
    logger.setLevel(log_level)
    return logger


logger = setup_logging()
