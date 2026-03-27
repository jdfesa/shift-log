from fastapi import APIRouter, HTTPException
from models import Tarea, Materia, Horario
from services.task_service import get_tareas, create_tarea, update_tarea_estado, delete_tarea, get_horarios
from database import get_db_connection

router = APIRouter(prefix="/api")


# ── Materias ────────────────────────────────────

@router.get("/materias")
def list_materias():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM materias ORDER BY institucion, nombre").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/materias")
def add_materia(materia: Materia):
    conn = get_db_connection()
    cursor = conn.execute(
        "INSERT INTO materias (nombre, institucion, anio, cuatrimestre) VALUES (?, ?, ?, ?)",
        (materia.nombre, materia.institucion, materia.anio, materia.cuatrimestre)
    )
    conn.commit()
    materia_id = cursor.lastrowid
    conn.close()
    return {"id": materia_id, "mensaje": f"Materia '{materia.nombre}' creada."}


# ── Horarios ────────────────────────────────────

@router.get("/horarios")
def list_horarios(dia: str = None):
    return get_horarios(dia=dia)


@router.post("/horarios")
def add_horario(horario: Horario):
    conn = get_db_connection()
    cursor = conn.execute(
        "INSERT INTO horarios (materia_id, dia, hora_inicio, hora_fin, aula, tipo) VALUES (?, ?, ?, ?, ?, ?)",
        (horario.materia_id, horario.dia.lower(), horario.hora_inicio, horario.hora_fin, horario.aula, horario.tipo)
    )
    conn.commit()
    horario_id = cursor.lastrowid
    conn.close()
    return {"id": horario_id, "mensaje": "Horario agregado."}


# ── Tareas ──────────────────────────────────────

@router.get("/tareas")
def list_tareas(estado: str = None, fecha: str = None, materia: str = None):
    return get_tareas(filtro_fecha=fecha, filtro_estado=estado, materia=materia)


@router.post("/tareas")
def add_tarea(tarea: Tarea):
    result = create_tarea(
        titulo=tarea.titulo,
        tipo=tarea.tipo,
        materia=None,
        fecha_limite=str(tarea.fecha_limite) if tarea.fecha_limite else None,
        descripcion=tarea.descripcion,
        prioridad=tarea.prioridad
    )
    return {"mensaje": f"Tarea '{result['titulo']}' creada.", **result}


@router.delete("/tareas/{tarea_id}")
def remove_tarea(tarea_id: int):
    conn = get_db_connection()
    cursor = conn.execute("DELETE FROM tareas WHERE id = ?", (tarea_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    if affected == 0:
        raise HTTPException(status_code=404, detail="Tarea no encontrada.")
    return {"mensaje": "Tarea eliminada."}
