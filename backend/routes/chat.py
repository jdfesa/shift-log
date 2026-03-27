from fastapi import APIRouter
from models import ChatRequest, ChatResponse
from services.llm_service import query_llm
from services.intent_parser import process_intent

router = APIRouter(prefix="/api")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Endpoint principal del chat. Recibe un mensaje, lo parsea con el LLM activo y ejecuta la acción."""
    # 1. Enviar mensaje al LLM activo para parsear la intención
    intent = await query_llm(request.message)
    intent["_raw_message"] = request.message

    # 2. Procesar la intención y ejecutar la acción
    response_text = await process_intent(intent)

    return ChatResponse(
        response=response_text,
        action_taken=intent.get("accion"),
        data=intent.get("datos")
    )
