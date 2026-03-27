import httpx
import json
from config import SYSTEM_PROMPT

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


async def query_groq(user_message: str, api_key: str) -> dict:
    """Envía el mensaje del usuario a Groq Cloud y devuelve la intención parseada."""
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        "temperature": 0.1,
        "max_tokens": 256,
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                GROQ_API_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()

            result = response.json()
            content = result["choices"][0]["message"]["content"]

            parsed = json.loads(content)
            return parsed

    except httpx.ConnectError:
        return {
            "accion": "error",
            "datos": {"mensaje": "No se pudo conectar con Groq. Verificá tu conexión a internet."}
        }
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            return {
                "accion": "error",
                "datos": {"mensaje": "API Key de Groq inválida. Verificá tu clave en console.groq.com"}
            }
        return {
            "accion": "error",
            "datos": {"mensaje": f"Error de Groq ({e.response.status_code}): {e.response.text[:100]}"}
        }
    except json.JSONDecodeError:
        return {
            "accion": "error",
            "datos": {"mensaje": "No se pudo interpretar la respuesta de Groq."}
        }
    except Exception as e:
        return {
            "accion": "error",
            "datos": {"mensaje": f"Error inesperado con Groq: {str(e)}"}
        }
