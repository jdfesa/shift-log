import httpx
import json
from config import OLLAMA_BASE_URL, OLLAMA_MODEL, SYSTEM_PROMPT

async def query_ollama(user_message: str) -> dict:
    """Envía el mensaje del usuario a Ollama y devuelve la intención parseada."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,  # Baja temperatura para respuestas consistentes
            "num_predict": 256
        }
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload
            )
            response.raise_for_status()

            result = response.json()
            content = result.get("message", {}).get("content", "{}")

            # Parsear el JSON de la respuesta del LLM
            parsed = json.loads(content)
            return parsed

    except httpx.ConnectError:
        return {
            "accion": "error",
            "datos": {"mensaje": "No se pudo conectar con Ollama. ¿Está corriendo el servidor?"}
        }
    except json.JSONDecodeError:
        return {
            "accion": "error",
            "datos": {"mensaje": "No se pudo interpretar la respuesta del modelo."}
        }
    except Exception as e:
        return {
            "accion": "error",
            "datos": {"mensaje": f"Error inesperado: {str(e)}"}
        }
