# Referencia de API

## Base URL

```
http://127.0.0.1:8000
```

Documentación interactiva (Swagger UI) disponible en: `http://127.0.0.1:8000/docs`

---

## Endpoints

### Chat

#### `POST /api/chat`

Endpoint principal. Recibe un mensaje en lenguaje natural, lo parsea con Ollama, ejecuta la acción correspondiente y devuelve la respuesta formateada.

**Request:**

```json
{
    "message": "¿qué tengo pendiente esta semana?"
}
```

**Response (200):**

```json
{
    "response": "📋 **Tareas (esta_semana):**\n⏳ **TP3 Redes** [tp] · Redes de Computadoras — Vence: 2026-04-02",
    "action_taken": "consultar_tareas",
    "data": {
        "filtro_fecha": "esta_semana",
        "filtro_estado": "pendiente"
    }
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `response` | `string` | Texto formateado para mostrar en el chat |
| `action_taken` | `string \| null` | Acción que se ejecutó internamente |
| `data` | `object \| null` | Datos parseados por el LLM |

**Acciones posibles en `action_taken`:**

| Acción | Descripción |
|---|---|
| `consultar_horarios` | Se consultaron horarios de cursada |
| `consultar_tareas` | Se consultaron tareas |
| `crear_tarea` | Se creó una tarea nueva |
| `actualizar_estado` | Se cambió el estado de una tarea |
| `eliminar_tarea` | Se eliminó una tarea |
| `saludo` | El usuario saludó |
| `error` | Ocurrió un error |

---

### Materias

#### `GET /api/materias`

Lista todas las materias registradas.

**Response (200):**

```json
[
    {
        "id": 1,
        "nombre": "Algoritmos y Estructuras de Datos",
        "institucion": "UNSa",
        "anio": 2026,
        "cuatrimestre": 1,
        "created_at": "2026-03-27 05:30:00"
    }
]
```

---

#### `POST /api/materias`

Crea una materia nueva.

**Request:**

```json
{
    "nombre": "Algoritmos y Estructuras de Datos",
    "institucion": "UNSa",
    "anio": 2026,
    "cuatrimestre": 1
}
```

**Response (200):**

```json
{
    "id": 1,
    "mensaje": "Materia 'Algoritmos y Estructuras de Datos' creada."
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `nombre` | `string` | ✅ | Nombre completo de la materia |
| `institucion` | `string` | ✅ | "UNSa" o "IES 6023" |
| `anio` | `integer` | ✅ | Año lectivo |
| `cuatrimestre` | `integer` | ✅ | 1 o 2 |

---

### Horarios

#### `GET /api/horarios`

Lista todos los horarios. Acepta filtro por día.

**Parámetros query:**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `dia` | `string` | No | Filtrar por día (ej: `lunes`, `martes`) |

**Ejemplo:** `GET /api/horarios?dia=lunes`

**Response (200):**

```json
[
    {
        "id": 1,
        "materia_id": 1,
        "dia": "lunes",
        "hora_inicio": "08:00",
        "hora_fin": "10:00",
        "aula": "Aula 3B",
        "tipo": "teoria",
        "materia": "Algoritmos y Estructuras de Datos",
        "institucion": "UNSa"
    }
]
```

---

#### `POST /api/horarios`

Agrega un horario a una materia.

**Request:**

```json
{
    "materia_id": 1,
    "dia": "lunes",
    "hora_inicio": "08:00",
    "hora_fin": "10:00",
    "aula": "Aula 3B",
    "tipo": "teoria"
}
```

**Response (200):**

```json
{
    "id": 1,
    "mensaje": "Horario agregado."
}
```

| Campo | Tipo | Requerido | Default | Descripción |
|---|---|---|---|---|
| `materia_id` | `integer` | ✅ | — | ID de la materia |
| `dia` | `string` | ✅ | — | Día de la semana (minúsculas) |
| `hora_inicio` | `string` | ✅ | — | Formato "HH:MM" |
| `hora_fin` | `string` | ✅ | — | Formato "HH:MM" |
| `aula` | `string` | No | `null` | Aula o lugar |
| `tipo` | `string` | No | `"teoria"` | "teoria", "practica", "laboratorio" |

---

### Tareas

#### `GET /api/tareas`

Lista tareas con filtros opcionales.

**Parámetros query:**

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `estado` | `string` | No | Filtrar por estado (`pendiente`, `en_proceso`, `completada`, `atrasada`) |
| `fecha` | `string` | No | Filtro de fecha (`hoy`, `mañana`, `esta_semana`, `proxima_semana`, o `YYYY-MM-DD`) |
| `materia` | `string` | No | Búsqueda parcial del nombre de materia |

**Ejemplo:** `GET /api/tareas?estado=pendiente&fecha=esta_semana`

**Response (200):**

```json
[
    {
        "id": 1,
        "materia_id": 1,
        "titulo": "TP2 - Listas enlazadas",
        "tipo": "tp",
        "estado": "pendiente",
        "fecha_limite": "2026-04-15",
        "descripcion": null,
        "prioridad": "media",
        "created_at": "2026-03-27 05:30:00",
        "updated_at": "2026-03-27 05:30:00",
        "materia": "Algoritmos y Estructuras de Datos"
    }
]
```

---

#### `POST /api/tareas`

Crea una tarea nueva.

**Request:**

```json
{
    "titulo": "TP2 - Listas enlazadas",
    "tipo": "tp",
    "fecha_limite": "2026-04-15",
    "descripcion": "Implementar lista simplemente enlazada",
    "prioridad": "alta"
}
```

**Response (200):**

```json
{
    "mensaje": "Tarea 'TP2 - Listas enlazadas' creada.",
    "titulo": "TP2 - Listas enlazadas",
    "tipo": "tp",
    "estado": "pendiente"
}
```

| Campo | Tipo | Requerido | Default | Descripción |
|---|---|---|---|---|
| `titulo` | `string` | ✅ | — | Título de la tarea |
| `tipo` | `string` | ✅ | — | `tp`, `parcial`, `recordatorio`, `otro` |
| `estado` | `string` | No | `"pendiente"` | Estado inicial |
| `fecha_limite` | `string (date)` | No | `null` | Formato `YYYY-MM-DD` |
| `descripcion` | `string` | No | `null` | Detalles adicionales |
| `prioridad` | `string` | No | `"media"` | `alta`, `media`, `baja` |

---

#### `DELETE /api/tareas/{tarea_id}`

Elimina una tarea por su ID.

**Ejemplo:** `DELETE /api/tareas/3`

**Response (200):**

```json
{
    "mensaje": "Tarea eliminada."
}
```

**Response (404):**

```json
{
    "detail": "Tarea no encontrada."
}
```

---

## Códigos de estado HTTP

| Código | Significado |
|---|---|
| `200` | Operación exitosa |
| `404` | Recurso no encontrado |
| `422` | Error de validación (datos inválidos) |
| `500` | Error interno del servidor |
