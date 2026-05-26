from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.config import settings
from api.logger import logger
from api.routers import risks, controls, incidents, vendors, audit, auth
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

# Global CORS Configuration (Security Control 1)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

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

@app.get("/health")
def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

