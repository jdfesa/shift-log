from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    action_taken: Optional[str] = None
    data: Optional[dict] = None

class Materia(BaseModel):
    id: Optional[int] = None
    nombre: str
    institucion: str
    anio: int
    cuatrimestre: int
    created_at: Optional[datetime] = None

class Horario(BaseModel):
    id: Optional[int] = None
    materia_id: int
    dia: str
    hora_inicio: str
    hora_fin: str
    aula: Optional[str] = None
    tipo: str = 'teoria'

class Tarea(BaseModel):
    id: Optional[int] = None
    materia_id: Optional[int] = None
    titulo: str
    tipo: str
    estado: str = 'pendiente'
    fecha_limite: Optional[date] = None
    descripcion: Optional[str] = None
    prioridad: str = 'media'
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
