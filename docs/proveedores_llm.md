# Proveedores de LLM (Ollama / Groq)

Shift Log soporta dos proveedores de inteligencia artificial para interpretar los mensajes del usuario. Se puede cambiar entre ellos **en tiempo real** desde un toggle en la interfaz.

---

## Comparativa

| Criterio | 🏠 Ollama (Local) | ☁️ Groq (Nube) |
|---|---|---|
| **Modelo** | `phi3:mini` (3.8B) | `llama-3.3-70b-versatile` |
| **Velocidad** | 1-3 segundos | ~200ms |
| **Calidad** | Aceptable, requiere fallbacks | Excelente, comprende instrucciones complejas |
| **Privacidad** | ✅ 100% local | ❌ Los mensajes viajan a servidores de Groq |
| **Internet** | ✅ No requiere | ❌ Requiere conexión |
| **Costo** | ✅ Gratis siempre | ✅ Gratis (tier gratuito: ~14,400 req/día) |
| **Setup** | Requiere `ollama serve` | Solo una API Key |

---

## Cómo funciona

### Toggle en la interfaz

En el header de la aplicación, al lado de los botones "Tasks" y "Schedule", hay un switch con dos íconos:

- **🏠** = Ollama (local) — **activo por defecto**
- **☁️** = Groq (nube)

Al hacer clic en el toggle:
1. Si se cambia a **☁️ Groq** por primera vez, aparece un cuadro pidiendo la API Key.
2. La key se guarda en `localStorage` del navegador (nunca se sube a GitHub ni se envía a terceros).
3. El estado del toggle **persiste entre sesiones** gracias a `localStorage`.

### Flujo técnico

```
┌────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend   │────▶│   /api/chat       │────▶│  llm_service.py │
│ (app.js)    │     │   (chat.py)       │     │  (router)       │
└────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                          ┌───────────┴───────────┐
                                          │                       │
                                   ┌──────▼──────┐       ┌───────▼───────┐
                                   │   Ollama     │       │    Groq       │
                                   │ (local:11434)│       │ (api.groq.com)│
                                   └─────────────┘       └───────────────┘
```

---

## Archivos involucrados

### `backend/services/llm_service.py`

**Responsabilidad:** Router central del LLM. Decide a qué proveedor enviar la consulta.

| Función | Descripción |
|---|---|
| `get_provider()` | Devuelve el proveedor activo (`"ollama"` o `"groq"`) |
| `set_provider(provider, api_key)` | Cambia el proveedor y guarda la API key |
| `get_groq_key()` | Devuelve la API key actual de Groq |
| `query_llm(user_message)` | Función principal: rutea al proveedor activo |

**Estado en memoria:** El proveedor activo y la API key se guardan en variables globales del módulo. Se reinician al reiniciar el servidor (el frontend los re-sincroniza al cargar la página).

### `backend/services/ollama_service.py`

**Responsabilidad:** Comunicación con Ollama local.

- Envía al endpoint `http://localhost:11434/api/chat`
- Usa `format: "json"` para forzar respuesta JSON
- Timeout: **60 segundos** (para cold starts del modelo)

### `backend/services/groq_service.py`

**Responsabilidad:** Comunicación con la API de Groq en la nube.

- Envía al endpoint `https://api.groq.com/openai/v1/chat/completions`
- Usa formato **OpenAI-compatible** (`response_format: { type: "json_object" }`)
- Timeout: **15 segundos** (Groq es muy rápido)
- Modelo: `llama-3.3-70b-versatile`

**Manejo de errores específico:**

| Error | Mensaje al usuario |
|---|---|
| `401 Unauthorized` | "API Key de Groq inválida. Verificá tu clave en console.groq.com" |
| `ConnectError` | "No se pudo conectar con Groq. Verificá tu conexión a internet." |
| Otros HTTP errors | Muestra el código de error y un fragmento de la respuesta |

---

## API Endpoints del proveedor

### `GET /api/provider`

Devuelve el proveedor activo y si hay una API key configurada.

**Respuesta:**
```json
{"provider": "ollama", "has_key": false}
```

### `POST /api/provider`

Cambia el proveedor activo.

**Body:**
```json
{"provider": "groq", "api_key": "gsk_tu_clave_aqui"}
```

**Respuesta:**
```json
{"provider": "groq", "status": "ok"}
```

> **Nota:** El campo `api_key` solo es necesario la primera vez o si se quiere actualizar la clave.

---

## Configuración por variable de entorno

Opcionalmente, se puede configurar el proveedor y la clave sin usar el toggle:

```bash
# Arrancar directamente con Groq
LLM_PROVIDER=groq GROQ_API_KEY=gsk_tu_clave python main.py
```

| Variable | Default | Descripción |
|---|---|---|
| `LLM_PROVIDER` | `ollama` | Proveedor inicial (`ollama` o `groq`) |
| `GROQ_API_KEY` | _(vacío)_ | API key de Groq (si se omite, se pide desde la UI) |

---

## Obtener una API Key de Groq

1. Ir a **[console.groq.com](https://console.groq.com)**
2. Iniciar sesión con Google o GitHub
3. Menú izquierdo → **"API Keys"**
4. Clic en **"Create API Key"** → Nombre: "shift-log" → Copiar la clave generada
5. Pegar la clave en el cuadro emergente de Shift Log cuando se active el modo Cloud

> **Importante:** La clave se almacena **únicamente** en el `localStorage` de tu navegador. No se guarda en ningún archivo del proyecto ni se envía a GitHub.

---

## Recomendaciones de uso

- **Para uso diario con WiFi:** Usar **Groq (☁️)**. Respuestas instantáneas y muy precisas.
- **Sin internet o privacidad máxima:** Usar **Ollama (🏠)**. Funciona sin conexión.
- **Si Groq responde errores:** Verificar la key en [console.groq.com](https://console.groq.com) o volver a Ollama temporalmente.
