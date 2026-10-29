"""
CriptoEx - Agente de IA especializado en criptomonedas
Backend con FastAPI + Agno + DeepSeek (vía OrcaRouter)
"""
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from datetime import datetime
import json
import os

# Importaciones locales
from config import BASE_DIR
from auth import authenticate_user, create_access_token, get_current_user
from agent import create_cripto_agent
from models import LoginRequest, Token, ChatRequest, ChatResponse

# FastAPI App
app = FastAPI(title="CriptoEx API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos (frontend)
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Almacenamiento en memoria para sesiones
sessions_db = {}

# ============================================
# API Auth - Login
# ============================================
@app.post("/api/auth/login", response_model=Token)
async def login(request: LoginRequest):
    """Autentica al usuario y retorna un token JWT"""
    user = authenticate_user(request.username, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

# ============================================
# API Agents - Chat con el agente
# ============================================
@app.post("/api/agents/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """Envía un mensaje al agente CriptoEx y retorna la respuesta"""
    try:
        agent = create_cripto_agent()
        response = agent.run(request.message)
        session_id = request.session_id or datetime.utcnow().isoformat()
        
        # Manejar diferentes formatos de respuesta de Agno
        if hasattr(response, 'content'):
            response_text = response.content
        elif hasattr(response, 'messages') and response.messages:
            response_text = response.messages[-1].content if hasattr(response.messages[-1], 'content') else str(response.messages[-1])
        else:
            response_text = str(response)
        
        # Crear sesión si no existe
        if session_id not in sessions_db:
            sessions_db[session_id] = {
                "id": session_id,
                "title": request.message[:50],
                "created_at": datetime.utcnow().isoformat(),
                "messages": []
            }
        
        # Guardar mensajes
        sessions_db[session_id]["messages"].append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.utcnow().isoformat()
        })
        sessions_db[session_id]["messages"].append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return ChatResponse(
            response=response_text,
            session_id=session_id,
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(f"ERROR en chat: {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)
# ============================================
# API Sessions - Listar sesiones
# ============================================
@app.get("/api/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """Lista todas las sesiones del usuario"""
    return list(sessions_db.values())

# ============================================
# API Sessions - Obtener sesión específica
# ============================================
@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Obtiene los mensajes de una sesión específica"""
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return sessions_db[session_id]

# ============================================
# WebSocket - Manejo de eventos en tiempo real
# ============================================
@app.websocket("/ws/events/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket para eventos en tiempo real"""
    await websocket.accept()
    try:
        agent = create_cripto_agent()
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Evento: procesando
            await websocket.send_json({
                "type": "status",
                "content": "Procesando..."
            })
            
            # Procesar mensaje
            response = agent.run(message.get("message", ""))
            
            # Evento: respuesta
            await websocket.send_json({
                "type": "response",
                "content": response.content if hasattr(response, 'content') else str(response),
                "session_id": session_id
            })
    except WebSocketDisconnect:
        print(f"Cliente desconectado: {session_id}")

# ============================================
# Servir frontend
# ============================================
@app.get("/", response_class=HTMLResponse)
async def serve_login():
    """Sirve la página de login"""
    with open("../frontend/login.html", "r") as f:
        return f.read()

@app.get("/dashboard", response_class=HTMLResponse)
async def serve_dashboard():
    """Sirve el dashboard"""
    with open("../frontend/dashboard.html", "r") as f:
        return f.read()

# ==============================================
# API Sessions - Eliminar sesión
@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Elimina una sesión específica"""
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    del sessions_db[session_id]
    return {"message": "Sesión eliminada", "session_id": session_id}

# ============================================
# Punto de entrada
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)