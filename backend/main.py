import sys
import os
from contextlib import asynccontextmanager

# Agregar el directorio del backend al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import init_db
from routes.chat import router as chat_router
from routes.tasks import router as tasks_router
from services.llm_service import get_provider, set_provider, get_groq_key
from config import HOST, PORT


@asynccontextmanager
async def lifespan(app):
    """Inicializa la base de datos al arrancar el servidor."""
    init_db()
    print("🚀 Shift Log corriendo en http://{}:{}".format(HOST, PORT))
    yield


app = FastAPI(
    title="Shift Log",
    description="Gestor personal de tiempo y tareas conversacional",
    version="1.0.0",
    lifespan=lifespan
)

# Registrar routers
app.include_router(chat_router)
app.include_router(tasks_router)


@app.get("/api/provider")
async def get_current_provider():
    """Devuelve el proveedor LLM activo."""
    return {"provider": get_provider(), "has_key": bool(get_groq_key())}


@app.post("/api/provider")
async def switch_provider(body: dict):
    """Cambia el proveedor LLM activo."""
    provider = body.get("provider", "ollama")
    api_key = body.get("api_key")
    try:
        set_provider(provider, api_key)
        return {"provider": get_provider(), "status": "ok"}
    except ValueError as e:
        return {"error": str(e)}

# Servir archivos estáticos del frontend
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


@app.get("/")
async def serve_frontend():
    """Sirve el index.html del frontend."""
    return FileResponse(os.path.join(frontend_dir, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
