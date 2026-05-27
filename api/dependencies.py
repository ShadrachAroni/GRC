from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from api.database import get_db
from api.models import User
from api.auth_utils import decode_token
from api.audit_logging import current_user_email_ctx, current_user_tenant_ctx, current_user_ip_ctx
from typing import List

security = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session is inactive or not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Set context variables for auditing
    current_user_email_ctx.set(user.email)
    current_user_tenant_ctx.set(user.tenant_id)
    
    ip = None
    if request and request.client:
        ip = request.client.host
    current_user_ip_ctx.set(ip)

    # Attach to db session object to guarantee cross-thread propagation
    db._user_email = user.email
    db._tenant_id = user.tenant_id
    db._client_ip = ip

    return user


def get_tenant_id(current_user: User = Depends(get_current_user)) -> str:
    return current_user.tenant_id

def get_tenant_filter(current_user: User = Depends(get_current_user)) -> str:
    return current_user.tenant_id

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Insufficient privileges",
            )
        return current_user
