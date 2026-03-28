from fastapi import APIRouter
from models import ChatRequest, ChatResponse
from services.llm_service import query_llm
from services.intent_parser import process_intent

router = APIRouter(prefix="/api")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Endpoint principal del chat. Recibe un mensaje, lo parsea con el LLM activo y ejecuta la acción."""
    msg = request.message.strip().lower()
    
    # 1. Comandos directos (bypass LLM)
    if msg.startswith("/"):
        cmd = msg.split()[0]
        intent = {"_raw_message": request.message, "datos": {}}
        
        if cmd == "/ayuda":
            intent["accion"] = "ayuda"
        elif cmd in ["/horario", "/horarios"]:
            intent["accion"] = "consultar_horarios"
            # Optional: parse day from args
            args = msg.split()[1:]
            if args:
                intent["datos"]["dia"] = args[0]
        elif cmd in ["/tarea", "/tareas"]:
            intent["accion"] = "consultar_tareas"
        elif cmd == "/saludo":
            intent["accion"] = "saludo"
        else:
            intent["accion"] = "error"
            intent["datos"]["mensaje"] = f"Comando no reconocido: {cmd}. Escribí /ayuda para ver los comandos."
            
    else:
        # 2. Enviar mensaje al LLM activo para parsear la intención
        intent = await query_llm(request.message)
        intent["_raw_message"] = request.message

    # 3. Procesar la intención y ejecutar la acción
    response_text = await process_intent(intent)

    return ChatResponse(
        response=response_text,
        action_taken=intent.get("accion"),
        data=intent.get("datos")
    )
