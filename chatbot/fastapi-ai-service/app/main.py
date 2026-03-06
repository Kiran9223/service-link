from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import chat

app = FastAPI(
    title="ServiceLink AI Service",
    description="LangChain-powered conversational booking agent",
    version="1.0.0"
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/ai", tags=["chat"])

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": settings.llm_model,
        "service": "ServiceLink AI"
    }