"""Servicio unificado de LLM — rutea entre Ollama (local) y Groq (cloud)."""

import os

# Estado global del proveedor (en memoria, se puede cambiar en runtime)
_current_provider = os.getenv("LLM_PROVIDER", "ollama")
_groq_api_key = os.getenv("GROQ_API_KEY", "")


def get_provider() -> str:
    return _current_provider


def set_provider(provider: str, api_key: str = None):
    global _current_provider, _groq_api_key
    if provider not in ("ollama", "groq"):
        raise ValueError("Provider must be 'ollama' or 'groq'")
    _current_provider = provider
    if api_key:
        _groq_api_key = api_key


def get_groq_key() -> str:
    return _groq_api_key


async def query_llm(user_message: str) -> dict:
    """Rutea la consulta al proveedor activo."""
    if _current_provider == "groq":
        if not _groq_api_key:
            return {
                "accion": "error",
                "datos": {"mensaje": "No se configuró la API Key de Groq. Ingresala desde el toggle en la app."}
            }
        from services.groq_service import query_groq
        return await query_groq(user_message, _groq_api_key)
    else:
        from services.ollama_service import query_ollama
        return await query_ollama(user_message)
