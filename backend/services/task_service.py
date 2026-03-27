from datetime import date, timedelta
from database import get_db_connection


def _rows_to_dicts(rows):
    """Convierte filas de sqlite3.Row a lista de diccionarios."""
    return [dict(row) for row in rows]


def mark_overdue_tasks():
    """Marca como 'atrasada' cualquier tarea cuya fecha_limite haya pasado."""
    conn = get_db_connection()
    conn.execute("""
        UPDATE tareas
        SET estado = 'atrasada', updated_at = datetime('now', 'localtime')
        WHERE fecha_limite < date('now', 'localtime')
          AND estado IN ('pendiente', 'en_proceso')
    """)
    conn.commit()
    conn.close()


def get_horarios(dia: str = None):
    """Obtiene horarios. Si se pasa un día, filtra por ese día."""
    conn = get_db_connection()
    if dia:
        rows = conn.execute("""
            SELECT h.*, m.nombre AS materia, m.institucion
            FROM horarios h
            JOIN materias m ON h.materia_id = m.id
            WHERE LOWER(h.dia) = LOWER(?)
            ORDER BY h.hora_inicio
        """, (dia,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT h.*, m.nombre AS materia, m.institucion
            FROM horarios h
            JOIN materias m ON h.materia_id = m.id
            ORDER BY
                CASE LOWER(h.dia)
                    WHEN 'lunes' THEN 1
                    WHEN 'martes' THEN 2
                    WHEN 'miercoles' THEN 3
                    WHEN 'jueves' THEN 4
                    WHEN 'viernes' THEN 5
                    WHEN 'sabado' THEN 6
                    WHEN 'domingo' THEN 7
                END,
                h.hora_inicio
        """).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


def _resolve_date_filter(filtro: str) -> tuple:
    """Convierte filtros de fecha textuales a rango SQL."""
    today = date.today()
    if filtro == "hoy":
        return str(today), str(today)
    elif filtro == "mañana":
        tomorrow = today + timedelta(days=1)
        return str(tomorrow), str(tomorrow)
    elif filtro == "esta_semana":
        start = today
        end = today + timedelta(days=(6 - today.weekday()))
        return str(start), str(end)
    elif filtro == "proxima_semana":
        start = today + timedelta(days=(7 - today.weekday()))
        end = start + timedelta(days=6)
        return str(start), str(end)
    else:
        # Asumir fecha específica YYYY-MM-DD
        return filtro, filtro


def _day_name_today() -> str:
    """Devuelve el nombre del día actual en español."""
    days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
    return days[date.today().weekday()]


def get_tareas(filtro_fecha: str = None, filtro_estado: str = None, materia: str = None):
    """Consulta tareas con filtros opcionales."""
    mark_overdue_tasks()

    query = """
        SELECT t.*, m.nombre AS materia
        FROM tareas t
        LEFT JOIN materias m ON t.materia_id = m.id
        WHERE 1=1
    """
    params = []

    if filtro_fecha:
        date_start, date_end = _resolve_date_filter(filtro_fecha)
        query += " AND t.fecha_limite BETWEEN ? AND ?"
        params.extend([date_start, date_end])

    if filtro_estado:
        query += " AND t.estado = ?"
        params.append(filtro_estado)
    else:
        query += " AND t.estado != 'completada'"

    if materia:
        query += " AND m.nombre LIKE ?"
        params.append(f"%{materia}%")

    query += " ORDER BY t.fecha_limite ASC NULLS LAST"

    conn = get_db_connection()
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return _rows_to_dicts(rows)


def create_tarea(titulo: str, tipo: str, materia: str = None,
                 fecha_limite: str = None, descripcion: str = None,
                 prioridad: str = "media"):
    """Crea una nueva tarea."""
    conn = get_db_connection()
    materia_id = None

    if materia:
        row = conn.execute(
            "SELECT id FROM materias WHERE nombre LIKE ?", (f"%{materia}%",)
        ).fetchone()
        if row:
            materia_id = row["id"]

    conn.execute("""
        INSERT INTO tareas (materia_id, titulo, tipo, estado, fecha_limite, descripcion, prioridad)
        VALUES (?, ?, ?, 'pendiente', ?, ?, ?)
    """, (materia_id, titulo, tipo, fecha_limite, descripcion, prioridad))
    conn.commit()
    conn.close()
    return {"titulo": titulo, "tipo": tipo, "estado": "pendiente"}


def update_tarea_estado(titulo: str = None, materia: str = None, nuevo_estado: str = "completada"):
    """Actualiza el estado de una tarea buscando por título y/o materia."""
    conn = get_db_connection()

    query = """
        UPDATE tareas
        SET estado = ?, updated_at = datetime('now', 'localtime')
        WHERE id IN (
            SELECT t.id FROM tareas t
            LEFT JOIN materias m ON t.materia_id = m.id
            WHERE 1=1
    """
    params = [nuevo_estado]

    if titulo:
        query += " AND t.titulo LIKE ?"
        params.append(f"%{titulo}%")
    if materia:
        query += " AND m.nombre LIKE ?"
        params.append(f"%{materia}%")

    query += " LIMIT 1)"

    cursor = conn.execute(query, params)
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0


def delete_tarea(titulo: str = None, materia: str = None):
    """Elimina una tarea buscando por título y/o materia."""
    conn = get_db_connection()

    query = """
        DELETE FROM tareas WHERE id IN (
            SELECT t.id FROM tareas t
            LEFT JOIN materias m ON t.materia_id = m.id
            WHERE 1=1
    """
    params = []
    if titulo:
        query += " AND t.titulo LIKE ?"
        params.append(f"%{titulo}%")
    if materia:
        query += " AND m.nombre LIKE ?"
        params.append(f"%{materia}%")

    query += " LIMIT 1)"

    cursor = conn.execute(query, params)
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0
