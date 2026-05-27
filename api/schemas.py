from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List

class UserRegister(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    email: str
    password: str = Field(..., min_length=8)
    tenant_id: Optional[str] = None
    role: Optional[str] = "Viewer"  # Viewer, GRC Analyst, Administrator

class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    email: str
    password: str

class MFAEnableRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    email: str
    code: str

class MFALoginVerify(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    temp_token: str
    code: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: str
    email: str

class PasswordResetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    email: str
    redirect_uri: Optional[str] = None

class PasswordResetConfirm(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    token: str
    new_password: str = Field(..., min_length=8)

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str
    role: str
    tenant_id: str
    mfa_enabled: bool

class RegisterResponse(BaseModel):
    message: str
    email: str
    tenant_id: str
    role: str
    otp_secret: str
    otp_uri: str
