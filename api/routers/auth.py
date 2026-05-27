import datetime
import hashlib
import logging
import uuid
import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from api.database import get_db
from api.models import User, RefreshToken
from api.schemas import (
    UserRegister,
    UserLogin,
    MFAEnableRequest,
    MFALoginVerify,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    UserResponse,
    RegisterResponse,
)
from api.auth_utils import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    create_temp_token,
    decode_token,
    hash_token,
)
from api.limiter import limiter
from api.config import settings

router = APIRouter()
logger = logging.getLogger("grc")

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
def register(request: Request, body: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == body.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Validate role
    allowed_roles = ["Viewer", "GRC Analyst", "Administrator"]
    role = body.role if body.role in allowed_roles else "Viewer"

    # Generate or join tenant
    tenant_id = body.tenant_id if body.tenant_id else str(uuid.uuid4())

    # Create new user
    hashed_pwd = hash_password(body.password)
    otp_secret = pyotp.random_base32()
    # Be creative and come up with the best name for the app: "SecureBank GRC Sentinel"
    otp_uri = pyotp.totp.TOTP(otp_secret).provisioning_uri(
        name=body.email, issuer_name="SecureBank GRC Sentinel"
    )

    new_user = User(
        email=body.email,
        hashed_password=hashed_pwd,
        role=role,
        tenant_id=tenant_id,
        mfa_secret=otp_secret,
        mfa_enabled=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"Registered user {body.email} under tenant {tenant_id} with role {role}")

    return RegisterResponse(
        message="Registration successful. Please set up multi-factor authentication.",
        email=new_user.email,
        tenant_id=new_user.tenant_id,
        role=new_user.role,
        otp_secret=otp_secret,
        otp_uri=otp_uri,
    )

@router.post("/mfa/enable")
@limiter.limit("60/minute")
def mfa_enable(request: Request, body: MFAEnableRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Verify code
    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(body.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code",
        )

    # Generate recovery codes (5 secure alphanumeric codes)
    recovery_codes = [uuid.uuid4().hex[:10].upper() for _ in range(5)]
    hashed_recovery = ",".join([hash_token(code) for code in recovery_codes])

    user.mfa_enabled = True
    user.hashed_recovery_codes = hashed_recovery
    db.commit()

    logger.info(f"MFA enabled for user {body.email}")

    return {
        "message": "MFA enabled successfully.",
        "recovery_codes": recovery_codes,
    }

@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Enforce MFA TOTP Verification
    # Logins require email/password followed by valid MFA TOTP verification
    # Generate temp JWT token for MFA validation step
    temp_token = create_temp_token({"sub": user.email, "tenant_id": user.tenant_id, "role": user.role})

    return {
        "mfa_required": True,
        "temp_token": temp_token,
    }

@router.post("/login/verify", response_model=TokenResponse)
@limiter.limit("10/minute")
def login_verify(request: Request, body: MFALoginVerify, db: Session = Depends(get_db)):
    payload = decode_token(body.temp_token)
    if not payload or payload.get("type") != "temp_mfa" or not payload.get("mfa_pending"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    # Verify TOTP code or recovery code
    verified = False
    is_recovery = False
    
    # 1. Check if standard TOTP matches
    totp = pyotp.TOTP(user.mfa_secret)
    if totp.verify(body.code):
        verified = True
    # 2. Check if a recovery code matches
    elif user.hashed_recovery_codes:
        code_hash = hash_token(body.code)
        recovery_hashes = user.hashed_recovery_codes.split(",")
        if code_hash in recovery_hashes:
            verified = True
            is_recovery = True
            # Consume recovery code
            recovery_hashes.remove(code_hash)
            user.hashed_recovery_codes = ",".join(recovery_hashes) if recovery_hashes else None
            db.commit()

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code",
        )

    # If user successfully verified, ensure mfa_enabled is True
    if not user.mfa_enabled:
        user.mfa_enabled = True
        db.commit()

    # Generate Access and Refresh Tokens
    token_claims = {"sub": user.email, "tenant_id": user.tenant_id, "role": user.role, "user_id": user.id}
    access_token = create_access_token(token_claims)
    refresh_token = create_refresh_token(token_claims)

    # Save hashed refresh token to database (Control 10)
    rf_hash = hash_token(refresh_token)
    db_refresh = RefreshToken(
        token_hash=rf_hash,
        user_id=user.id,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7),
    )
    db.add(db_refresh)
    db.commit()

    logger.info(f"User {email} logged in successfully via MFA (Recovery used: {is_recovery})")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        tenant_id=user.tenant_id,
        email=user.email,
    )

@router.post("/refresh")
@limiter.limit("60/minute")
def refresh(request: Request, body: dict, db: Session = Depends(get_db)):
    refresh_token = body.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing refresh token",
        )

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("user_id")
    email = payload.get("sub")
    rf_hash = hash_token(refresh_token)

    # Search for token hash in DB
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == rf_hash).first()

    # Control 10: JWT Rotation & Refresh Token Rotation
    # Replay detection: If a refresh token is used but not found or revoked,
    # it implies potential leakage or reuse! Revoke all tokens for the user.
    if not db_token or db_token.is_revoked or db_token.expires_at < datetime.datetime.utcnow():
        # Revoke all sessions for this user ID
        db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
        db.commit()
        logger.warning(f"Replay attack / invalid refresh token detected for user {email}! Revoked all tokens.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token - session revoked",
        )

    # Retrieve user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    # Rotate tokens: Revoke/delete the used one and issue a new pair
    db.delete(db_token)
    db.commit()

    token_claims = {"sub": user.email, "tenant_id": user.tenant_id, "role": user.role, "user_id": user.id}
    new_access_token = create_access_token(token_claims)
    new_refresh_token = create_refresh_token(token_claims)

    new_rf_hash = hash_token(new_refresh_token)
    new_db_refresh = RefreshToken(
        token_hash=new_rf_hash,
        user_id=user.id,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7),
    )
    db.add(new_db_refresh)
    db.commit()

    logger.info(f"Rotated tokens for user {email}")

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }

@router.post("/logout")
@limiter.limit("60/minute")
def logout(request: Request, body: dict, db: Session = Depends(get_db)):
    refresh_token = body.get("refresh_token")
    if refresh_token:
        rf_hash = hash_token(refresh_token)
        db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == rf_hash).first()
        if db_token:
            db.delete(db_token)
            db.commit()
    return {"message": "Logged out successfully."}

@router.post("/password-reset/request")
@limiter.limit("3/hour")
def password_reset_request(request: Request, body: PasswordResetRequest, db: Session = Depends(get_db)):
    # Control 2: Redirect URL Validation - Restrict redirect flows to exact static strings
    if body.redirect_uri:
        allowed_uris = [uri.strip() for uri in settings.ALLOWED_REDIRECT_URIS.split(",") if uri.strip()]
        if body.redirect_uri not in allowed_uris:
            logger.warning(f"Unauthorized password reset redirect_uri blocked: {body.redirect_uri}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Redirect URI not authorized",
            )

    user = db.query(User).filter(User.email == body.email).first()
    if user:
        # Generate password reset token (5-minute expiration)
        reset_claims = {"sub": user.email, "type": "reset"}
        reset_token = create_access_token(reset_claims, expires_delta=datetime.timedelta(minutes=5))
        
        # Log the reset token securely for testing/audit purposes (simulates sending email)
        logger.info(f"[SECURITY AUDIT] Password reset requested for {body.email}. Token: {reset_token}")

    # Control 8: Limit reset triggers using slowapi, returning generic feedback strings
    # Standardize generic anti-enumeration response (returns same message whether user exists or not)
    return {
        "message": "If the email address is registered, a password reset link has been sent."
    }

@router.post("/password-reset/confirm")
@limiter.limit("60/minute")
def password_reset_confirm(request: Request, body: PasswordResetConfirm, db: Session = Depends(get_db)):
    payload = decode_token(body.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Update password and revoke all active refresh tokens for the user as a safety precaution
    user.hashed_password = hash_password(body.new_password)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    db.commit()

    logger.info(f"Password reset successfully for user {email}")

    return {"message": "Password has been reset successfully."}
