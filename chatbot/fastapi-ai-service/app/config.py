from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    groq_api_key: str
    redis_url: str = "redis://localhost:6379"
    spring_boot_url: str = "http://localhost:8081"
    frontend_url: str = "http://localhost:5173"
    session_ttl_seconds: int = 1800
    
    # LLM config
    llm_model: str = "llama-3.3-70b-versatile"
    llm_temperature: float = 0.3      # low temp = consistent entity extraction
    llm_max_tokens: int = 1024
    
    # Matching config
    top_providers_count: int = 3
    fairness_boost_value: float = 0.15
    max_bookings_for_boost: int = 20
    new_provider_days: int = 30
    default_search_radius_miles: float = 25.0

    class Config:
        env_file = ".env"

settings = Settings()