from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
from api.config import settings
from api.logger import logger
from api.routers import risks, controls, incidents, vendors, audit, auth, dashboard, payments, notifications
from api.database import engine, Base
import api.models  # Ensures models are registered on Base

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Setup SlowAPI Limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from api.limiter import limiter

app = FastAPI(
    title="SecureBank GRC Platform API",
    description="Enterprise Governance, Risk, and Compliance API for FinTech",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Custom Middlewares (Phase 05)

class ContentLengthLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            content_length = request.headers.get("content-length")
            if content_length is not None:
                try:
                    if int(content_length) > 1024 * 1024:  # 1MB
                        return JSONResponse(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            content={"detail": "Payload too large. Maximum size allowed is 1MB."}
                        )
                except ValueError:
                    return JSONResponse(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        content={"detail": "Invalid Content-Length header"}
                    )
        return await call_next(request)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

# Global CORS Configuration (Security Control 1)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_middleware(ContentLengthLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# Global Request/Response Logger
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Standardized Global Exception Handler (Security Control 9)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}",
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."}
    )

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(risks.router, prefix="/api/risks", tags=["Risks"])
app.include_router(controls.router, prefix="/api/controls", tags=["Controls"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(vendors.router, prefix="/api/vendors", tags=["Vendors"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])

@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

@app.get("/api/test-error", include_in_schema=False)
def trigger_error():
    raise ValueError("Test internal error")
