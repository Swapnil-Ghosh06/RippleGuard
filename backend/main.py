import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Ensure backend root is on sys.path regardless of launch directory
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from api.routes.analyze import router as analyze_router
from api.routes.simulate import router as simulate_router
from api.routes.compare import router as compare_router
from api.routes.export import router as export_router

load_dotenv()

app = FastAPI(
    title="RippleGuard API",
    description="Compromise propagation simulator for open source supply chains (Manipal Hackathon 2026)",
    version="1.0.0"
)

# CORS Configuration per docs/TDD.md Section 6.3
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API route modules
app.include_router(analyze_router)
app.include_router(simulate_router)
app.include_router(compare_router)
app.include_router(export_router)


# Health check endpoint per docs/TDD.md Section 2.4
@app.get("/health", tags=["health"], summary="Service health and version check")
async def health_check():
    """Uptime health check route returning API operational status and version."""
    return {"status": "ok", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
