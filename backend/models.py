"""
Modelos Pydantic para validación de datos
"""
from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # ← CAMBIO CLAVE: ahora es opcional

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str