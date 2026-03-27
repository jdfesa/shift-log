# Esquema de Base de Datos

## Motor

**SQLite 3** — Base de datos relacional embebida. El archivo se ubica en `data/shift_log.db` y se crea automáticamente al iniciar el servidor por primera vez.

---

## Diagrama de relaciones

```
┌──────────────────────┐
│      materias         │
├──────────────────────┤
│ id (PK)              │
│ nombre               │
│ institucion          │     ┌──────────────────────┐
│ anio                 │     │      horarios         │
│ cuatrimestre         │     ├──────────────────────┤
│ created_at           │◄────│ materia_id (FK)      │
└──────────────────────┘     │ id (PK)              │
         ▲                   │ dia                  │
         │                   │ hora_inicio          │
         │                   │ hora_fin             │
         │                   │ aula                 │
         │                   │ tipo                 │
         │                   └──────────────────────┘
         │
         │              ┌──────────────────────┐
         │              │       tareas          │
         │              ├──────────────────────┤
         └──────────────│ materia_id (FK, NULL) │
                        │ id (PK)              │
                        │ titulo               │
                        │ tipo                 │
                        │ estado               │
                        │ fecha_limite         │
                        │ descripcion          │
                        │ prioridad            │
                        │ created_at           │
                        │ updated_at           │
                        └──────────────────────┘
```

---

## Tablas

### `materias`

Almacena las materias/asignaturas de cada institución educativa. Son datos de **ciclo largo** que se mantienen fijos durante todo el semestre.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | `INTEGER` | No | Auto-increment | Clave primaria |
| `nombre` | `TEXT` | No | — | Nombre completo de la materia |
| `institucion` | `TEXT` | No | — | "UNSa" o "IES 6023" |
| `anio` | `INTEGER` | Sí | — | Año lectivo (ej: 2026) |
| `cuatrimestre` | `INTEGER` | Sí | — | 1 (primer cuatrimestre) o 2 (segundo) |
| `created_at` | `DATETIME` | Sí | `datetime('now', 'localtime')` | Fecha de creación del registro |

```sql
CREATE TABLE materias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    institucion TEXT NOT NULL,
    anio INTEGER,
    cuatrimestre INTEGER,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
);
```

---

### `horarios`

Cada fila representa un bloque horario de una materia en un día de la semana. Son datos de **ciclo largo**, vinculados a una materia.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | `INTEGER` | No | Auto-increment | Clave primaria |
| `materia_id` | `INTEGER` | No | — | FK → `materias.id` |
| `dia` | `TEXT` | No | — | Día de la semana en minúsculas |
| `hora_inicio` | `TEXT` | No | — | Hora de inicio en formato "HH:MM" |
| `hora_fin` | `TEXT` | No | — | Hora de fin en formato "HH:MM" |
| `aula` | `TEXT` | Sí | — | Aula o lugar (ej: "Aula 3B") |
| `tipo` | `TEXT` | Sí | `'teoria'` | "teoria", "practica", o "laboratorio" |

**Valores válidos para `dia`:** `lunes`, `martes`, `miercoles`, `jueves`, `viernes`, `sabado`, `domingo`

**Valores válidos para `tipo`:** `teoria`, `practica`, `laboratorio`

```sql
CREATE TABLE horarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materia_id INTEGER NOT NULL,
    dia TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fin TEXT NOT NULL,
    aula TEXT,
    tipo TEXT DEFAULT 'teoria',
    FOREIGN KEY (materia_id) REFERENCES materias(id)
);
```

---

### `tareas`

Todo lo dinámico: trabajos prácticos, parciales, recordatorios. Datos de **ciclo corto** que mutan constantemente.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | `INTEGER` | No | Auto-increment | Clave primaria |
| `materia_id` | `INTEGER` | Sí | — | FK → `materias.id` (NULL si no tiene materia) |
| `titulo` | `TEXT` | No | — | Título descriptivo de la tarea |
| `tipo` | `TEXT` | No | — | Tipo de tarea |
| `estado` | `TEXT` | Sí | `'pendiente'` | Estado actual del ciclo de vida |
| `fecha_limite` | `DATE` | Sí | — | Fecha de vencimiento (formato YYYY-MM-DD) |
| `descripcion` | `TEXT` | Sí | — | Detalles adicionales |
| `prioridad` | `TEXT` | Sí | `'media'` | Nivel de prioridad |
| `created_at` | `DATETIME` | Sí | `datetime('now', 'localtime')` | Fecha de creación |
| `updated_at` | `DATETIME` | Sí | `datetime('now', 'localtime')` | Fecha de última actualización |

**Valores válidos para `tipo`:** `tp`, `parcial`, `recordatorio`, `otro`

**Valores válidos para `estado`:** `pendiente`, `en_proceso`, `completada`, `atrasada`

**Valores válidos para `prioridad`:** `alta`, `media`, `baja`

```sql
CREATE TABLE tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materia_id INTEGER,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    fecha_limite DATE,
    descripcion TEXT,
    prioridad TEXT DEFAULT 'media',
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (materia_id) REFERENCES materias(id)
);
```

---

## Ciclo de vida de las tareas

```
              ┌─────────────┐
  Creación ──▶│  pendiente   │
              └──────┬──────┘
                     │
          usuario inicia trabajo
                     │
              ┌──────▼──────┐
              │  en_proceso  │
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        │                         │
  usuario completa          vence la fecha
        │                         │
  ┌─────▼───────┐          ┌──────▼──────┐
  │ completada  │          │  atrasada   │
  └─────────────┘          └─────────────┘
```

- **`pendiente`**: Estado inicial al crear una tarea.
- **`en_proceso`**: El usuario indicó que empezó a trabajar en ella.
- **`completada`**: El usuario la marcó como terminada.
- **`atrasada`**: El sistema la marcó automáticamente porque `fecha_limite < hoy` y seguía en `pendiente` o `en_proceso`.

La detección de tareas atrasadas se ejecuta automáticamente antes de cada consulta en `task_service.py`:

```sql
UPDATE tareas
SET estado = 'atrasada', updated_at = datetime('now', 'localtime')
WHERE fecha_limite < date('now', 'localtime')
  AND estado IN ('pendiente', 'en_proceso');
```

---

## Queries de ejemplo

### ¿Qué clases tengo hoy?

```sql
SELECT m.nombre, h.hora_inicio, h.hora_fin, h.aula, h.tipo
FROM horarios h
JOIN materias m ON h.materia_id = m.id
WHERE LOWER(h.dia) = 'viernes'
ORDER BY h.hora_inicio;
```

### ¿Qué tareas tengo pendientes esta semana?

```sql
SELECT t.titulo, t.tipo, t.estado, t.fecha_limite, m.nombre AS materia
FROM tareas t
LEFT JOIN materias m ON t.materia_id = m.id
WHERE t.fecha_limite BETWEEN date('now', 'localtime') AND date('now', 'localtime', '+6 days')
  AND t.estado != 'completada'
ORDER BY t.fecha_limite ASC;
```

### Marcar un TP como completado

```sql
UPDATE tareas
SET estado = 'completada', updated_at = datetime('now', 'localtime')
WHERE titulo LIKE '%TP2%'
  AND materia_id = (SELECT id FROM materias WHERE nombre LIKE '%Algoritmos%');
```

### Ver todas las tareas atrasadas

```sql
SELECT t.titulo, t.tipo, t.fecha_limite, m.nombre AS materia
FROM tareas t
LEFT JOIN materias m ON t.materia_id = m.id
WHERE t.estado = 'atrasada'
ORDER BY t.fecha_limite ASC;
```
