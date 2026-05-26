from pydantic import BaseModel, Field
from typing import Optional, List

class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    tenant_id: Optional[str] = None
    role: Optional[str] = "Viewer"  # Viewer, GRC Analyst, Administrator

    class Config:
        extra = "forbid"

class UserLogin(BaseModel):
    email: str
    password: str

    class Config:
        extra = "forbid"

class MFAEnableRequest(BaseModel):
    email: str
    code: str

    class Config:
        extra = "forbid"

class MFALoginVerify(BaseModel):
    temp_token: str
    code: str

    class Config:
        extra = "forbid"

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: str
    email: str

class PasswordResetRequest(BaseModel):
    email: str
    redirect_uri: Optional[str] = None

    class Config:
        extra = "forbid"

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

    class Config:
        extra = "forbid"

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    tenant_id: str
    mfa_enabled: bool

    class Config:
        from_attributes = True

class RegisterResponse(BaseModel):
    message: str
    email: str
    tenant_id: str
    role: str
    otp_secret: str
    otp_uri: str
