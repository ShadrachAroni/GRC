import functools
import asyncio
import json
import logging
import contextvars
from fastapi import Request
from sqlalchemy import event
from sqlalchemy.orm import Session
from api.models import SystemAuditLog, RefreshToken

logger = logging.getLogger("grc")

# Thread/Task-local context variables for audit logs
current_user_email_ctx = contextvars.ContextVar("current_user_email", default=None)
current_user_tenant_ctx = contextvars.ContextVar("current_user_tenant", default=None)
current_user_ip_ctx = contextvars.ContextVar("current_user_ip", default=None)

@event.listens_for(Session, 'before_flush')
def audit_before_flush(session, flush_context, instances):
    # Prevent infinite loop recursion
    if getattr(session, "_in_audit", False):
        return
        
    user_email = getattr(session, "_user_email", None) or current_user_email_ctx.get()
    tenant_id = getattr(session, "_tenant_id", None) or current_user_tenant_ctx.get()
    ip_address = getattr(session, "_client_ip", None) or current_user_ip_ctx.get()
    
    logs_to_add = []
    
    # 1. Handle insertions
    for obj in session.new:
        if isinstance(obj, (SystemAuditLog, RefreshToken)):
            continue
            
        if hasattr(obj, "tenant_id"):
            obj_tenant = tenant_id or getattr(obj, "tenant_id", None) or "system"
            obj_email = user_email or "system@securebank.com"
            action = f"CREATE_{obj.__class__.__name__.upper()}"
            
            details = {}
            for col in obj.__table__.columns:
                if col.name in ["hashed_password", "mfa_secret", "hashed_recovery_codes"]:
                    continue
                details[col.name] = getattr(obj, col.name)
                
            logs_to_add.append(SystemAuditLog(
                tenant_id=obj_tenant,
                user_email=obj_email,
                action=action,
                ip_address=ip_address,
                details=json.dumps(details, default=str)
            ))
            
    # 2. Handle updates
    for obj in session.dirty:
        if isinstance(obj, (SystemAuditLog, RefreshToken)):
            continue
            
        if hasattr(obj, "tenant_id"):
            obj_tenant = tenant_id or getattr(obj, "tenant_id", None) or "system"
            obj_email = user_email or "system@securebank.com"
            action = f"UPDATE_{obj.__class__.__name__.upper()}"
            
            from sqlalchemy.orm import attributes
            details = {}
            for col in obj.__table__.columns:
                if col.name in ["hashed_password", "mfa_secret", "hashed_recovery_codes"]:
                    continue
                hist = attributes.get_history(obj, col.name)
                if hist.has_changes():
                    details[col.name] = {
                        "old": hist.deleted[0] if hist.deleted else None,
                        "new": hist.added[0] if hist.added else getattr(obj, col.name)
                    }
                    
            if details:
                logs_to_add.append(SystemAuditLog(
                    tenant_id=obj_tenant,
                    user_email=obj_email,
                    action=action,
                    ip_address=ip_address,
                    details=json.dumps(details, default=str)
                ))
                
    # 3. Handle deletions
    for obj in session.deleted:
        if isinstance(obj, (SystemAuditLog, RefreshToken)):
            continue
            
        if hasattr(obj, "tenant_id"):
            obj_tenant = tenant_id or getattr(obj, "tenant_id", None) or "system"
            obj_email = user_email or "system@securebank.com"
            action = f"DELETE_{obj.__class__.__name__.upper()}"
            
            details = {}
            for col in obj.__table__.columns:
                if col.name in ["hashed_password", "mfa_secret", "hashed_recovery_codes"]:
                    continue
                details[col.name] = getattr(obj, col.name)
                
            logs_to_add.append(SystemAuditLog(
                tenant_id=obj_tenant,
                user_email=obj_email,
                action=action,
                ip_address=ip_address,
                details=json.dumps(details, default=str)
            ))
            
    if logs_to_add:
        session._in_audit = True
        try:
            for log in logs_to_add:
                session.add(log)
        finally:
            session._in_audit = False


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
