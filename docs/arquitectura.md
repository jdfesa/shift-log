# Arquitectura y Stack Tecnológico

## Visión general

Shift Log es un gestor personal de tiempo y tareas con interfaz conversacional. Está diseñado para un solo usuario, corriendo localmente en una máquina principal (Hackintosh), con acceso opcional desde dispositivos móviles vía red local.

### Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTE                                │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  Navegador (Desktop / Mobile)                        │      │
│   │  ┌────────────────┐ ┌─────────┐ ┌────────────────┐  │      │
│   │  │  index.html     │ │ app.js  │ │  style.css     │  │      │
│   │  │  (estructura)   │ │ (lógica)│ │  (dark mode)   │  │      │
│   │  └────────────────┘ └────┬────┘ └────────────────┘  │      │
│   └──────────────────────────┼───────────────────────────┘      │
│                              │ HTTP fetch (JSON)                 │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                          SERVIDOR                                │
│                              ▼                                   │
│   ┌──────────────────────────────────────────────────────┐      │
│   │  FastAPI (main.py) — puerto 8000                     │      │
│   │                                                      │      │
│   │  ┌─────────────┐    ┌──────────────────────────┐     │      │
│   │  │ routes/      │    │ services/                │     │      │
│   │  │  chat.py     │───▶│  ollama_service.py       │─────┼──┐  │
│   │  │  tasks.py    │    │  intent_parser.py        │     │  │  │
│   │  └─────────────┘    │  task_service.py          │     │  │  │
│   │                      └──────────┬───────────────┘     │  │  │
│   │                                 │                     │  │  │
│   │                      ┌──────────▼───────────────┐     │  │  │
│   │                      │  SQLite (shift_log.db)   │     │  │  │
│   │                      │  ┌─────────┐ ┌────────┐  │     │  │  │
│   │                      │  │materias │ │horarios│  │     │  │  │
│   │                      │  └─────────┘ └────────┘  │     │  │  │
│   │                      │  ┌─────────┐             │     │  │  │
│   │                      │  │ tareas  │             │     │  │  │
│   │                      │  └─────────┘             │     │  │  │
│   │                      └──────────────────────────┘     │  │  │
│   └──────────────────────────────────────────────────────┘  │  │
│                                                              │  │
│   ┌──────────────────────────────────────────────────────┐  │  │
│   │  Ollama — puerto 11434                               │◀─┘  │
│   │  Modelo: phi3:mini (3.8B) o similar                  │     │
│   └──────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

---

## Stack tecnológico

### Base de datos — SQLite

**Elegido sobre:** TinyDB

| Criterio | SQLite | TinyDB |
|---|---|---|
| Filtrado por fechas | ✅ `date('now')`, `strftime()` nativos | ❌ Lógica manual en Python |
| Filtrado por estados | ✅ `WHERE estado = 'atrasada'` | ⚠️ Sin índices ni optimización |
| Detección de atraso automático | ✅ Un solo query SQL | ❌ Iterar toda la DB |
| Escalabilidad | ✅ Miles de registros sin problema | ❌ Carga todo en memoria |
| Flexibilidad de esquema | ✅ Columnas JSON + `ALTER TABLE` | ✅ Schemaless nativo |
| Dependencias | ✅ Incluido en Python (`sqlite3`) | ⚠️ `pip install tinydb` |

**Justificación:** El corazón de Shift Log es filtrar tareas por fechas y estados. SQLite tiene funciones de fecha nativas (`date()`, `strftime()`, comparaciones directas) que hacen estas operaciones triviales. TinyDB requeriría cargar toda la base en memoria y comparar manualmente. Para un gestor de tareas con lógica temporal, SQLite es la herramienta correcta.

---

### Backend — FastAPI

**Elegido sobre:** Flask

| Criterio | FastAPI | Flask |
|---|---|---|
| Async nativo | ✅ `async/await` para llamadas a Ollama | ❌ Sincrónico por defecto |
| Validación automática | ✅ Pydantic integrado | ❌ Manual o con extensiones |
| Documentación auto-generada | ✅ Swagger UI en `/docs` | ❌ Requiere extensiones |
| Rendimiento | ✅ Alto (Starlette + Uvicorn) | ⚠️ Medio (WSGI) |

**Justificación:** Las llamadas a Ollama pueden tardar 1-3 segundos. FastAPI maneja esto sin bloquear el servidor gracias a su soporte nativo de `async/await`. Además, Pydantic valida automáticamente cada request, reduciendo código defensivo. La documentación Swagger auto-generada (`/docs`) facilita la carga de datos iniciales.

---

### Motor conversacional — Ollama (LLM local)

**Elegido sobre:** OpenAI API, parsing con reglas/regex

| Criterio | Ollama (local) | OpenAI API | Parsing con reglas |
|---|---|---|---|
| Lenguaje natural | ✅ Completo | ✅ Completo | ❌ Comandos rígidos |
| Privacidad | ✅ 100% local | ❌ Datos salen a la nube | ✅ Local |
| Costo | ✅ Gratis | ❌ Pago por token | ✅ Gratis |
| Dependencia de internet | ✅ No requiere | ❌ Requiere conexión | ✅ No requiere |
| Modelo recomendado | Phi-3 Mini (3.8B), ~3 GB RAM | — | — |

**Justificación:** Un LLM local permite escribir "terminé el TP2 de algo" y que el sistema entienda la intención sin comandos específicos. Al ser personal, la privacidad es importante: horarios, parciales y tareas nunca salen de la máquina. Modelos chicos (2-4B parámetros) son suficientes para parsear intenciones simples en español.

---

### Frontend — Vanilla HTML/CSS/JS

**Elegido sobre:** React, Vue, Svelte

| Criterio | Vanilla | Framework |
|---|---|---|
| Complejidad de la app | 1 pantalla (chat) | Diseñados para SPAs complejas |
| Build step | ✅ Ninguno | ❌ npm, webpack, bundler |
| Dependencias | ✅ Zero | ❌ node_modules |
| Control del diseño | ✅ Total | ⚠️ Mediado por componentes |
| Rendimiento | ✅ Carga instantánea | ⚠️ Bundle JS de 100KB+ |

**Justificación:** Shift Log es una sola pantalla de chat. No hay rutas ni navegación compleja. Un framework añadiría complejidad innecesaria (build tools, node_modules, bundling) sin beneficio real. CSS puro permite replicar la estética Obsidian/Notion con control al píxel.

---

### Comunicación — HTTP fetch

**Elegido sobre:** WebSockets

| Criterio | HTTP fetch | WebSockets |
|---|---|---|
| Patrón de uso | Request → Response (perfecto para chat) | Bidireccional (innecesario aquí) |
| Complejidad | ✅ `fetch()` y listo | ❌ Reconexiones, heartbeats |
| Estado de conexión | ✅ Sin estado | ❌ Hay que mantener la conexión |

**Justificación:** El chat de Shift Log sigue un patrón estricto de pregunta → respuesta. No hay notificaciones push ni mensajes del servidor sin que el usuario pregunte. HTTP es suficiente para la v1. Si en el futuro se necesitan alertas proactivas, se puede migrar a WebSockets.

---

## Diseño visual

### Paleta de colores (Obsidian/Notion dark mode)

| Token CSS | Color | Uso |
|---|---|---|
| `--bg-primary` | `#1e1e1e` | Fondo principal |
| `--bg-secondary` | `#262626` | Fondo de burbujas/cards |
| `--bg-input` | `#2d2d2d` | Campo de entrada |
| `--text-primary` | `#e0e0e0` | Texto principal |
| `--text-secondary` | `#a0a0a0` | Texto secundario |
| `--accent` | `#7c5bf0` | Botones, badges, acentos |
| `--success` | `#4caf50` | Estado: completada |
| `--warning` | `#ff9800` | Estado: en proceso |
| `--danger` | `#ef5350` | Estado: atrasada |

### Tipografía

**Inter** (Google Fonts) — La misma familia que usan Notion y varias interfaces modernas. Pesos utilizados: 300 (light), 400 (regular), 500 (medium), 600 (semibold).

### Animaciones

- **messageIn**: Entrada suave de mensajes con fade + translate
- **typingBounce**: Indicador de escritura con 3 puntos animados
- **Transiciones**: 180ms ease en inputs, botones y bordes

---

## Despliegue

| Fase | Host | Acceso | Configuración |
|---|---|---|---|
| **Fase 1** | `127.0.0.1:8000` | Solo máquina local | `HOST = "127.0.0.1"` en `config.py` |
| **Fase 2** | `0.0.0.0:8000` | Red local (celular, tablet) | `HOST = "0.0.0.0"` en `config.py` |

Para acceder desde el celular (Fase 2), abrir `http://<IP-del-hackintosh>:8000` en el navegador del teléfono, estando conectado a la misma red WiFi.
