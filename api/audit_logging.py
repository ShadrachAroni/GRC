import functools
import asyncio
import json
import logging
from fastapi import Request
from sqlalchemy.orm import Session
from api.models import SystemAuditLog

logger = logging.getLogger("grc")

def audit_log(action: str):
    """
    Decorator to audit log mutation actions in FastAPI endpoints.
    Requires the decorated function to have 'db', 'current_user' (or similar model),
    and optionally 'request' in its keyword arguments.
    """
    def decorator(func):
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                response = await func(*args, **kwargs)
                try:
                    _log_mutation(db=kwargs.get("db"), 
                                  current_user=kwargs.get("current_user"), 
                                  request=kwargs.get("request"), 
                                  action=action, 
                                  kwargs=kwargs)
                except Exception as e:
                    logger.error(f"Audit log failed in async wrapper: {e}", exc_info=True)
                return response
            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                response = func(*args, **kwargs)
                try:
                    _log_mutation(db=kwargs.get("db"), 
                                  current_user=kwargs.get("current_user"), 
                                  request=kwargs.get("request"), 
                                  action=action, 
                                  kwargs=kwargs)
                except Exception as e:
                    logger.error(f"Audit log failed in sync wrapper: {e}", exc_info=True)
                return response
            return sync_wrapper
    return decorator

def _log_mutation(db, current_user, request, action, kwargs):
    if not db or not current_user:
        return

    ip = None
    if request and request.client:
        ip = request.client.host

    details_dict = {}
    
    # Extract request payload or parameters to store in details
    if "body" in kwargs:
        body = kwargs["body"]
        if hasattr(body, "model_dump"):
            details_dict["payload"] = body.model_dump()
        elif hasattr(body, "dict"):
            details_dict["payload"] = body.dict()
        else:
            try:
                details_dict["payload"] = str(body)
            except Exception:
                pass
    
    # Extract path parameters like risk_id if available
    for key in ["risk_id", "control_id", "incident_id"]:
        if key in kwargs:
            details_dict[key] = kwargs[key]

    details_json = None
    if details_dict:
        try:
            details_json = json.dumps(details_dict, default=str)
        except Exception:
            details_json = str(details_dict)

    log_entry = SystemAuditLog(
        tenant_id=current_user.tenant_id,
        user_email=current_user.email,
        action=action,
        ip_address=ip,
        details=details_json
    )
    db.add(log_entry)
    db.commit()
    logger.info(f"Audit log created: {action} by {current_user.email} (Tenant: {current_user.tenant_id})")
