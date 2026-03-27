# Lógica Conversacional

## Visión general

Shift Log utiliza un LLM local (vía Ollama) para interpretar mensajes en lenguaje natural y convertirlos en acciones sobre la base de datos. El flujo completo es:

```
┌───────────┐     ┌──────────┐     ┌──────────────┐     ┌────────┐     ┌──────────┐
│  Usuario  │────▶│ FastAPI  │────▶│   Ollama     │────▶│ Parser │────▶│  SQLite  │
│ (mensaje) │     │ /api/chat│     │ (LLM local)  │     │(intent)│     │ (query)  │
└───────────┘     └──────────┘     └──────────────┘     └────────┘     └──────────┘
                                                                              │
┌───────────┐     ┌──────────┐                                                │
│  Usuario  │◀────│ FastAPI  │◀───────────────────────────────────────────────┘
│(respuesta)│     │(formatea)│
└───────────┘     └──────────┘
```

---

## El System Prompt

El system prompt es la instrucción que se le da al LLM para que entienda su rol. Se encuentra en `backend/config.py` y es el componente más crítico del sistema.

### Objetivos del prompt

1. **Restringir la salida a JSON**: El LLM no debe responder con texto libre, solo con un JSON estructurado.
2. **Definir acciones válidas**: El LLM solo puede clasificar el mensaje en un conjunto finito de acciones.
3. **Definir vocabulario válido**: Tipos de tarea, estados, prioridades y filtros de fecha están explícitamente enumerados.
4. **Baja temperatura (0.1)**: Hace las respuestas determinísticas y consistentes.

### Estructura del prompt

```
"Sos un asistente de gestión de tareas académicas.
Tu trabajo es interpretar mensajes en español y devolver ÚNICAMENTE un JSON
con la intención del usuario. No respondas con texto, solo JSON."
```

Luego se enumeran:

- **Acciones posibles**: `consultar_horarios`, `consultar_tareas`, `crear_tarea`, `actualizar_estado`, `eliminar_tarea`, `saludo`, `ayuda`
- **Tipos de tarea**: `tp`, `parcial`, `recordatorio`, `otro`
- **Estados**: `pendiente`, `en_proceso`, `completada`
- **Prioridades**: `alta`, `media`, `baja`
- **Filtros de fecha**: `hoy`, `mañana`, `esta_semana`, `proxima_semana`, `todos`, `YYYY-MM-DD`

### Formato de respuesta esperado

```json
{
    "accion": "<accion>",
    "datos": {
        "titulo": "<título si aplica>",
        "tipo": "<tipo si aplica>",
        "materia": "<nombre parcial de materia>",
        "estado": "<nuevo estado>",
        "fecha_limite": "<fecha>",
        "prioridad": "<prioridad>",
        "descripcion": "<descripción>",
        "filtro_fecha": "<filtro temporal>",
        "filtro_estado": "<filtro de estado>",
        "dia": "<día de la semana>"
    }
}
```

> **Importante:** El prompt pide que se omitan las claves que no apliquen. Esto evita recibir campos vacíos innecesarios.

---

## Archivos involucrados

### `backend/services/ollama_service.py`

**Responsabilidad:** Comunicación con Ollama.

Envía el mensaje del usuario junto con el system prompt al modelo vía HTTP POST a `http://localhost:11434/api/chat`. Recibe la respuesta del LLM y la parsea como JSON.

**Parámetros de la llamada:**

| Parámetro | Valor | Razón |
|---|---|---|
| `stream` | `false` | Se espera la respuesta completa, no streaming |
| `format` | `"json"` | Fuerza al modelo a responder en JSON |
| `temperature` | `0.1` | Respuestas consistentes y predecibles |
| `num_predict` | `256` | Limita tokens de salida (el JSON es corto) |
| `timeout` | `30s` | Tiempo máximo de espera |

**Manejo de errores:**

| Error | Respuesta |
|---|---|
| `ConnectError` | `"No se pudo conectar con Ollama. ¿Está corriendo el servidor?"` |
| `JSONDecodeError` | `"No se pudo interpretar la respuesta del modelo."` |
| Cualquier otro | `"Error inesperado: {detalle}"` |

---

### `backend/services/intent_parser.py`

**Responsabilidad:** Traducir la intención del LLM a una acción concreta.

Recibe el JSON parseado y determina qué función de `task_service.py` ejecutar. Luego formatea el resultado para el chat.

**Mapeo acción → función:**

| Acción | Función |
|---|---|
| `consultar_horarios` | `get_horarios(dia)` |
| `consultar_tareas` | `get_tareas(filtro_fecha, filtro_estado, materia)` |
| `crear_tarea` | `create_tarea(titulo, tipo, materia, fecha, prioridad)` |
| `actualizar_estado` | `update_tarea_estado(titulo, materia, nuevo_estado)` |
| `eliminar_tarea` | `delete_tarea(titulo, materia)` |
| `saludo` | Respuesta aleatoria de bienvenida |
| `ayuda` | Guía rápida de comandos e instrucciones |

### Mecanismos de Robustez Conversacional

- **Extracción de Día (Fallback):** Si el LLM no logra extraer el día de la semana de un mensaje corto (ej: "y el sabado?"), el `intent_parser` realiza un escaneo manual del mensaje original para identificar el día mencionado.
- **Validación de Información Incompleta:** Si el usuario pide cargar una tarea pero no especifica un título, el sistema solicita los detalles faltantes en lugar de crear un registro vacío.
- **Detección de Duplicados:** Antes de crear una tarea, se verifica en la base de datos si ya existe una tarea pendiente con el mismo nombre y materia para evitar redundancias.

**Formateo de respuestas:**

- Los horarios se agrupan por día y muestran íconos según el tipo (📖 teoría, ✏️ práctica, 🔬 laboratorio).
- Las tareas muestran íconos según el estado (⏳ pendiente, 🔄 en proceso, ✅ completada, 🔴 atrasada).
- Los textos usan **negrita** (Markdown) para títulos y nombres de materia.

---

### `backend/services/task_service.py`

**Responsabilidad:** Lógica de negocio y queries SQL.

**Funciones principales:**

| Función | Descripción |
|---|---|
| `mark_overdue_tasks()` | Detecta y marca tareas atrasadas. Se ejecuta antes de CADA consulta |
| `get_horarios(dia)` | Consulta horarios, opcionalmente filtrados por día |
| `get_tareas(filtro_fecha, filtro_estado, materia)` | Consulta tareas con filtros combinables |
| `create_tarea(...)` | Crea una tarea, vinculándola a materia si se menciona |
| `update_tarea_estado(...)` | Busca una tarea por título/materia y actualiza su estado |
| `delete_tarea(...)` | Busca y elimina una tarea por título/materia |

**Resolución de filtros de fecha:**

| Filtro del usuario | Rango SQL resultante |
|---|---|
| `"hoy"` | `date('now')` a `date('now')` |
| `"mañana"` | `date('now', '+1 day')` a idem |
| `"esta_semana"` | `date('now')` a fin de semana actual |
| `"proxima_semana"` | Inicio próxima semana a fin de próxima semana |
| `"2026-04-15"` | `2026-04-15` a `2026-04-15` |

**Búsqueda flexible:** Las búsquedas de materia y título usan `LIKE '%término%'`, permitiendo matches parciales. Ej: "algoritmos" matchea "Algoritmos y Estructuras de Datos".

---

## Ejemplos de flujo completo

### Ejemplo 1: Consultar horarios

**Mensaje del usuario:**
```
¿Qué clases tengo hoy?
```

**Ollama responde:**
```json
{"accion": "consultar_horarios", "datos": {"filtro_fecha": "hoy"}}
```

**Intent parser:**
1. Detecta `filtro_fecha = "hoy"` → resuelve `dia = "viernes"` (día actual)
2. Llama a `get_horarios(dia="viernes")`
3. Formatea resultado con íconos y estructura

**Respuesta al usuario:**
```
📋 Horarios del Viernes:

📅 Viernes
  📖 08:00 a 10:00 · Algoritmos y Estructuras de Datos (UNSa) — Aula 3B
  ✏️ 14:00 a 16:00 · Redes de Computadoras (IES 6023)
```

---

### Ejemplo 2: Marcar tarea como completada

**Mensaje del usuario:**
```
Terminé el TP2 de Algoritmos
```

**Ollama responde:**
```json
{
    "accion": "actualizar_estado",
    "datos": {
        "titulo": "TP2",
        "materia": "Algoritmos",
        "estado": "completada"
    }
}
```

**Intent parser:**
1. Llama a `update_tarea_estado(titulo="TP2", materia="Algoritmos", nuevo_estado="completada")`
2. SQL interno: `UPDATE tareas SET estado = 'completada' WHERE titulo LIKE '%TP2%' AND materia_id = (...)`
3. Si `rowcount > 0`: éxito

**Respuesta al usuario:**
```
✅ Tarea marcada como completada ✅
```

---

### Ejemplo 3: Crear tarea nueva

**Mensaje del usuario:**
```
Tengo parcial de Redes el 2026-04-15
```

**Ollama responde:**
```json
{
    "accion": "crear_tarea",
    "datos": {
        "titulo": "Parcial de Redes",
        "tipo": "parcial",
        "materia": "Redes",
        "fecha_limite": "2026-04-15"
    }
}
```

**Intent parser:**
1. Busca materia con `LIKE '%Redes%'`
2. Llama a `create_tarea(titulo="Parcial de Redes", tipo="parcial", materia="Redes", fecha_limite="2026-04-15")`
3. Inserta en SQLite con `estado = 'pendiente'`

**Respuesta al usuario:**
```
✅ Tarea creada: Parcial de Redes [parcial]
```

---

## Modelo recomendado

| Modelo | Parámetros | RAM | Velocidad | Español |
|---|---|---|---|---|
| **Phi-3 Mini** | 3.8B | ~3 GB | ⚡ Rápido | ✅ Bueno |
| **Gemma 2 2B** | 2B | ~2 GB | ⚡⚡ Muy rápido | ⚠️ Aceptable |
| **Mistral 7B** | 7B | ~5 GB | 🔄 Medio | ✅ Muy bueno |

**Recomendación:** Empezar con `phi3:mini`. Si las respuestas en español no son consistentes, probar `mistral`.

---

## Consideraciones

1. **El LLM no tiene memoria de la conversación.** Cada mensaje se envía de forma independiente. El historial visible en el chat es solo visual (frontend).

2. **El system prompt define el comportamiento.** Si el modelo parsea mal una intención, la solución es ajustar el system prompt en `config.py`, no el código.

3. **La temperatura baja (0.1) es intencional.** Para parsing de intenciones, queremos respuestas predecibles, no creativas.

4. **El formato `"json"` en la llamada a Ollama** fuerza al modelo a responder solo con JSON válido, evitando texto adicional.
