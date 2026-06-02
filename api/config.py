from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./grcdb.db"
    JWT_SECRET_KEY: str = "your-default-256-bit-key-must-change-in-production-12345"
    STRIPE_WEBHOOK_SECRET: str = "whsec_mock"
    FLUTTERWAVE_SECRET_KEY: str = "FLWSECK_mock"
    FLUTTERWAVE_WEBHOOK_SECRET: str = "flwsec_mock"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # CORS Configurations
    DEV_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    PROD_ORIGINS: str = "https://myapp.com,https://www.myapp.com"
    ALLOWED_REDIRECT_URIS: str = "http://localhost:3000/auth/callback,http://localhost:3000/login,http://localhost:3000/"
    
    # Redis
    REDIS_URL: Optional[str] = None

    @property
    def cors_origins(self) -> List[str]:
        if self.ENVIRONMENT == "production":
            return [origin.strip() for origin in self.PROD_ORIGINS.split(",") if origin.strip()]
        # Default dev origins + split any dynamic configs
        dev_list = [origin.strip() for origin in self.DEV_ORIGINS.split(",") if origin.strip()]
        return dev_list


settings = Settings()
