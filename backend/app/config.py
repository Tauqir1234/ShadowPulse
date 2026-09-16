"""
ShadowPulse Backend Configuration
Loads settings from environment variables / .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "ShadowPulse API"
    APP_VERSION: str = "1.0.0"
    ENV: str = "development"

    # --- MongoDB ---
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "shadowpulse"

    # --- Auth / Security ---
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_use_a_long_random_string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    # --- Agent ingest auth ---
    AGENT_API_KEY: str = "CHANGE_ME_AGENT_SHARED_SECRET"

    # --- CORS ---
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # --- ML / Threat scoring ---
    ANOMALY_CONTAMINATION: float = 0.05
    THREAT_THRESHOLD_ALERT: float = 60.0  # threat score above which an alert is raised
    MODEL_PATH: str = "app/ml/model_store/isolation_forest.joblib"
    SCALER_PATH: str = "app/ml/model_store/scaler.joblib"

    # --- SMS Notification ---
    SMS_ENABLED: bool = False
    SMS_MODE: str = "mock"
    SMS_PROVIDER: str = "twilio"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    ALERT_PHONE_NUMBER: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
