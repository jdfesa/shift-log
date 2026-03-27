from services.task_service import (
    get_horarios, get_tareas, create_tarea,
    update_tarea_estado, delete_tarea, _day_name_today, check_duplicate_tarea
)
import unicodedata


def format_horarios(horarios: list) -> str:
    """Formatea la lista de horarios para respuesta de chat."""
    if not horarios:
        return "No tenés clases programadas."

    lines = []
    current_dia = None
    for h in horarios:
        if h["dia"] != current_dia:
            current_dia = h["dia"]
            lines.append(f"\n📅 **{current_dia.capitalize()}**")
        tipo_icon = {"teoria": "📖", "practica": "✏️", "laboratorio": "🔬"}.get(h["tipo"], "📌")
        aula = f" — {h['aula']}" if h.get("aula") else ""
        lines.append(f"  {tipo_icon} {h['hora_inicio']} a {h['hora_fin']} · {h['materia']} ({h['institucion']}){aula}")

    return "\n".join(lines)


def format_tareas(tareas: list) -> str:
    """Formatea la lista de tareas para respuesta de chat."""
    if not tareas:
        return "No tenés tareas pendientes. ¡Todo al día! 🎉"

    estado_icons = {
        "pendiente": "⏳",
        "en_proceso": "🔄",
        "completada": "✅",
        "atrasada": "🔴"
    }

    lines = []
    for t in tareas:
        icon = estado_icons.get(t["estado"], "📌")
        materia = f" · {t['materia']}" if t.get("materia") else ""
        fecha = f" — Vence: {t['fecha_limite']}" if t.get("fecha_limite") else ""
        lines.append(f"{icon} **{t['titulo']}** [{t['tipo']}]{materia}{fecha}")

    return "\n".join(lines)


SALUDOS = [
    "¡Hola! ¿En qué te puedo ayudar hoy? Podés preguntarme por tus horarios, tareas pendientes, o decirme si terminaste algo.",
    "¡Buenas! Estoy listo para ayudarte. ¿Querés ver qué tenés pendiente?",
    "¡Hola! Contame, ¿qué necesitás?"
]


async def process_intent(intent: dict) -> str:
    """Procesa la intención parseada por Ollama y ejecuta la acción correspondiente."""
    accion = intent.get("accion", "error")
    datos = intent.get("datos", {})

    if accion == "error":
        return f"⚠️ {datos.get('mensaje', 'Ocurrió un error inesperado.')}"

    if accion == "saludo":
        import random
        return random.choice(SALUDOS)

    if accion == "ayuda":
        return (
            "Puedo ayudarte a gestionar tus estudios. Estas son las cosas que podés pedirme:\n"
            "- 📅 **Ver horarios:** '¿Qué clases tengo hoy?' o 'Horarios de toda la semana'\n"
            "- 📋 **Consultar tareas:** '¿Qué tengo pendiente?' o 'Tareas de esta semana'\n"
            "- ➕ **Agregar tareas:** 'Recordatorio: TP de Base de Datos para mañana' (tp, parcial, recordatorio, otro)\n"
            "- ✅ **Actualizar progreso:** 'Terminé el parcial de Redes'\n"
            "- 🗑️ **Borrar tareas:** 'Eliminar el TP de Algoritmos'"
        )

    if accion == "consultar_horarios":
        dia = datos.get("dia")
        filtro_fecha = datos.get("filtro_fecha")
        raw_msg = intent.get("_raw_message", "")

        # Fallback si el LLM olvidó extraer el día
        if not dia and raw_msg:
            dias_semana = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
            msg_norm = ''.join(c for c in unicodedata.normalize('NFD', raw_msg) if unicodedata.category(c) != 'Mn').lower()
            for d in dias_semana:
                if d in msg_norm:
                    dia = d
                    break

        if filtro_fecha in ["esta_semana", "todos"]:
            dia = None
        elif filtro_fecha == "hoy" or (not dia and not filtro_fecha):
            dia = _day_name_today()

        horarios = get_horarios(dia=dia)
        if dia:
            header = f"📋 **Horarios del {dia.capitalize()}:**\n"
        else:
            header = "📋 **Todos tus horarios:**\n"
        return header + format_horarios(horarios)

    if accion == "consultar_tareas":
        tareas = get_tareas(
            filtro_fecha=datos.get("filtro_fecha"),
            filtro_estado=datos.get("filtro_estado"),
            materia=datos.get("materia")
        )
        filtro_desc = datos.get("filtro_fecha", "")
        if filtro_desc:
            header = f"📋 **Tareas ({filtro_desc}):**\n"
        else:
            header = "📋 **Tus tareas:**\n"
        return header + format_tareas(tareas)

    if accion == "crear_tarea":
        titulo = datos.get("titulo")
        raw_msg = intent.get("_raw_message", "").lower()
        
        # Si el usuario hace una pregunta general de si puede cargar algo
        if not titulo or raw_msg.strip() in ["podes cargar un tp?", "puedes cargar un tp?", "podes cargar una tarea?", "¿podes cargar un tp?", "¿puedes cargar un tp?", "podes cargar un tp", "puedes cargar un tp"]:
            return "¡Sí, claro! Decime qué título tiene (por ejemplo 'TP 2') y para qué materia es, así lo anoto."
            
        # Para evitar el "Sin título" genérico cuando el LLM extrae literalmente "un tp" como título
        if titulo.lower() in ["un tp", "tp", "tarea", "un trabajo", "un parcial"]:
            return f"¡Sí! ¿Para qué materia es ese {titulo} y cuál es el tema o número específico?"
            
        if not titulo or titulo.lower() == "sin título":
            return "Para agregar una tarea necesito que me digas por lo menos el nombre o concepto (ej. 'TP 2 de Base de Datos')."

        materia = datos.get("materia")
        
        # Verificar duplicados
        if check_duplicate_tarea(titulo, materia):
            mat_str = f" para la materia {materia}" if materia else ""
            return f"⚠️ Ya tenés una tarea llamada **{titulo}** cargada{mat_str}."

        result = create_tarea(
            titulo=titulo,
            tipo=datos.get("tipo", "otro"),
            materia=materia,
            fecha_limite=datos.get("fecha_limite"),
            descripcion=datos.get("descripcion"),
            prioridad=datos.get("prioridad", "media")
        )
        return f"✅ Tarea creada: **{result['titulo']}** [{result['tipo']}]"

    if accion == "actualizar_estado":
        nuevo_estado = datos.get("estado", "completada")
        success = update_tarea_estado(
            titulo=datos.get("titulo"),
            materia=datos.get("materia"),
            nuevo_estado=nuevo_estado
        )
        if success:
            estado_msg = {"completada": "completada ✅", "en_proceso": "en proceso 🔄", "pendiente": "pendiente ⏳"}
            return f"✅ Tarea marcada como **{estado_msg.get(nuevo_estado, nuevo_estado)}**"
        else:
            return "⚠️ No encontré esa tarea. ¿Podés darme más detalles?"

    if accion == "eliminar_tarea":
        success = delete_tarea(
            titulo=datos.get("titulo"),
            materia=datos.get("materia")
        )
        if success:
            return "🗑️ Tarea eliminada."
        else:
            return "⚠️ No encontré esa tarea para eliminar."

    return "🤔 No entendí lo que querés hacer. Probá con algo como '¿qué tengo pendiente?' o 'terminé el TP2'."
