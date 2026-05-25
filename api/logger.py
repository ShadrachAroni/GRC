import logging
import sys
import json
from datetime import datetime
from api.config import settings

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "funcName": record.funcName,
            "lineNo": record.lineno,
        }
        
        # Include extra attributes if passed in extra dictionary
        if hasattr(record, "requestId"):
            log_data["requestId"] = record.requestId
        if hasattr(record, "userId"):
            log_data["userId"] = record.userId
        if hasattr(record, "tenantId"):
            log_data["tenantId"] = record.tenantId
        if hasattr(record, "action"):
            log_data["action"] = record.action
            
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_data)

def setup_logger():
    logger = logging.getLogger("securebank-grc")
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    logger.handlers = []
    
    handler = logging.StreamHandler(sys.stdout)
    
    if settings.ENVIRONMENT == "production":
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
        )
        
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

logger = setup_logger()
