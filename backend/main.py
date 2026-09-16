import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Ensure backend root is on sys.path regardless of launch directory
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from api.routes.analyze import router as analyze_router
from api.routes.simulate import router as simulate_router
from api.routes.compare import router as compare_router
from api.routes.export import router as export_router
from api.routes.attacks import router as attacks_router
from api.routes.health import router as health_router


app = FastAPI(
    title="RippleGuard API",
    description="Compromise propagation simulator for open source supply chains (Manipal Hackathon 2026)",
    version="1.0.0"
)

# CORS Configuration - supports CORS_ORIGINS env var and wildcard local dev
cors_env = os.environ.get("CORS_ORIGINS", "*")
if cors_env and cors_env != "*":
    origins = [o.strip() for o in cors_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_origin_regex=r"https?://.*",
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API route modules
app.include_router(health_router)
app.include_router(analyze_router)
app.include_router(simulate_router)
app.include_router(compare_router)
app.include_router(export_router)
app.include_router(attacks_router, prefix="/api")
app.include_router(attacks_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

