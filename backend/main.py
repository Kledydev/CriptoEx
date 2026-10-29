"""
CriptoEx - Agente de IA especializado en criptomonedas
Backend con FastAPI + Agno 
"""
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from datetime import datetime
from pathlib import Path
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

# Montar archivos estáticos
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# ============================================
# PERSISTENCIA DE SESIONES EN JSON
# ============================================
SESSIONS_FILE = BASE_DIR / "sessions.json"

def load_sessions():
    """Carga las sesiones desde el archivo JSON"""
    if SESSIONS_FILE.exists():
        try:
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error cargando sesiones: {e}")
    return {}

def save_sessions(sessions):
    """Guarda las sesiones en el archivo JSON"""
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error guardando sesiones: {e}")

# Cargar sesiones al iniciar
sessions_db = load_sessions()
print(f"Sesiones cargadas: {len(sessions_db)}")

# ============================================
# API Auth - Login
# ============================================
@app.post("/api/auth/login", response_model=Token)
async def login(request: LoginRequest):
    user = authenticate_user(request.username, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

# ============================================
# API Agents - Chat
# ============================================
@app.post("/api/agents/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    try:
        agent = create_cripto_agent()
        response = agent.run(request.message)
        session_id = request.session_id or datetime.utcnow().isoformat()
        
        response_text = ""
        if hasattr(response, 'content'):
            response_text = response.content
        elif hasattr(response, 'messages') and response.messages:
            last_msg = response.messages[-1]
            response_text = last_msg.content if hasattr(last_msg, 'content') else str(last_msg)
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
        
        # ACTUALIZAR título con la primera pregunta
        if len(sessions_db[session_id]["messages"]) == 2:
            sessions_db[session_id]["title"] = request.message[:50]
        
        # GUARDAR EN DISCO
        save_sessions(sessions_db)
        
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
# API Sessions - Listar
# ============================================
@app.get("/api/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    # Ordenar por fecha de creación (más reciente primero)
    sorted_sessions = sorted(
        sessions_db.values(),
        key=lambda x: x.get("created_at", ""),
        reverse=True
    )
    return sorted_sessions

# ============================================
# API Sessions - Obtener una
# ============================================
@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return sessions_db[session_id]

# ============================================
# API Sessions - Eliminar
# ============================================
@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    if session_id not in sessions_db:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    del sessions_db[session_id]
    save_sessions(sessions_db)
    return {"message": "Sesión eliminada", "session_id": session_id}

# ============================================
# API Sessions - Limpiar todas
# ============================================
@app.delete("/api/sessions")
async def clear_sessions(current_user: dict = Depends(get_current_user)):
    sessions_db.clear()
    save_sessions(sessions_db)
    return {"message": "Todas las sesiones eliminadas"}

# ============================================
# API Knowledge - Base de conocimientos
# ============================================
@app.get("/api/knowledge")
async def get_knowledge(current_user: dict = Depends(get_current_user)):
    """Devuelve las secciones indexadas en la base de conocimientos"""
    knowledge_file = BASE_DIR / "knowledge" / "crypto_knowledge.md"
    
    if not knowledge_file.exists():
        return {
            "sections": [],
            "total_sections": 0,
            "source": "knowledge/crypto_knowledge.md",
            "vector_collection": "criptoex_knowledge"
        }
    
    content = knowledge_file.read_text(encoding="utf-8")
    sections = []
    current_section = None
    
    for line in content.split("\n"):
        if line.startswith("## "):
            if current_section:
                sections.append(current_section)
            current_section = {"title": line[3:].strip(), "content": []}
        elif line.startswith("# "):
            continue
        elif current_section is not None and line.strip():
            clean_line = line.strip().lstrip("- ").strip()
            current_section["content"].append(clean_line)
    
    if current_section:
        sections.append(current_section)
    
    for section in sections:
        section["content"] = "\n".join(section["content"])
    
    return {
        "sections": sections,
        "total_sections": len(sections),
        "source": "knowledge/crypto_knowledge.md",
        "vector_collection": "criptoex_knowledge"
    }

# ============================================
# API Sources - Fuentes consultadas
# ============================================
@app.get("/api/sources")
async def get_sources(current_user: dict = Depends(get_current_user)):
    """Extrae las URLs consultadas por el agente en todas las sesiones"""
    import re
    from urllib.parse import urlparse
    
    url_pattern = re.compile(r'https?://[^\s<>\)\]]+')
    sources = []
    domains = {}
    
    for session_id, session in sessions_db.items():
        for message in session.get("messages", []):
            if message.get("role") != "assistant":
                continue
            
            content = message.get("content", "")
            urls = url_pattern.findall(content)
            
            for url in urls:
                # Limpiar caracteres sobrantes al final
                url = url.rstrip('.,;:)"\'')
                
                try:
                    parsed = urlparse(url)
                    domain = parsed.netloc.replace("www.", "")
                except Exception:
                    domain = "desconocido"
                
                # Evitar duplicados exactos
                if not any(s["url"] == url for s in sources):
                    sources.append({
                        "url": url,
                        "domain": domain,
                        "session_id": session_id,
                        "session_title": session.get("title", "Sin título"),
                        "timestamp": message.get("timestamp", "")
                    })
                
                # Contar por dominio
                domains[domain] = domains.get(domain, 0) + 1
    
    # Ordenar por más recientes
    sources.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return {
        "sources": sources,
        "total_sources": len(sources),
        "domains": domains
    }

# ============================================
# API Collections - Agrupación por tema
# ============================================
COLLECTIONS = {
    "Bitcoin": ["bitcoin", "btc", "satoshi", "halving"],
    "Ethereum": ["ethereum", "eth ", "vitalik", "smart contract"],
    "DeFi": ["defi", "finanzas descentralizadas", "uniswap", "aave", "liquidez"],
    "Trading": ["trading", "precio", "cotización", "trade", "mercado"]
}

@app.get("/api/collections")
async def get_collections(current_user: dict = Depends(get_current_user)):
    """Cuenta cuántas sesiones pertenecen a cada colección por palabras clave"""
    result = []
    
    for name, keywords in COLLECTIONS.items():
        session_ids = []
        
        for session_id, session in sessions_db.items():
            # Concatenar título y contenido de mensajes para buscar
            text = session.get("title", "").lower()
            text += " " + " ".join(
                m.get("content", "").lower()
                for m in session.get("messages", [])
            )
            
            if any(keyword in text for keyword in keywords):
                session_ids.append(session_id)
        
        result.append({
            "name": name,
            "count": len(session_ids),
            "session_ids": session_ids
        })
    
    return {"collections": result}

# ============================================
# API Source Stats - Uso de fuentes por sesión
# ============================================
SOURCE_FILTERS = {
    "CoinMarketCap": ["coinmarketcap.com"],
    "CoinGecko": ["coingecko.com"],
}

@app.get("/api/source_stats")
async def get_source_stats(current_user: dict = Depends(get_current_user)):
    """Determina qué sesiones usaron cada fuente de información"""
    import re
    url_pattern = re.compile(r'https?://[^\s<>\)\]]+')
    
    stats = []
    
    # Fuentes web externas
    for name, domains in SOURCE_FILTERS.items():
        session_ids = []
        for session_id, session in sessions_db.items():
            for message in session.get("messages", []):
                if message.get("role") != "assistant":
                    continue
                content = message.get("content", "").lower()
                if any(domain in content for domain in domains):
                    if session_id not in session_ids:
                        session_ids.append(session_id)
                    break
        stats.append({
            "name": name,
            "count": len(session_ids),
            "session_ids": session_ids
        })
    
    # Base local: respuestas sin URLs externas
    local_ids = []
    for session_id, session in sessions_db.items():
        has_assistant = False
        has_url = False
        for message in session.get("messages", []):
            if message.get("role") != "assistant":
                continue
            has_assistant = True
            if url_pattern.search(message.get("content", "")):
                has_url = True
        if has_assistant and not has_url:
            local_ids.append(session_id)
    
    stats.append({
        "name": "Base local",
        "count": len(local_ids),
        "session_ids": local_ids
    })
    
    return {"sources": stats}

# ============================================
# WebSocket - Eventos en tiempo real
# ============================================
@app.websocket("/ws/events/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        agent = create_cripto_agent()
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            await websocket.send_json({
                "type": "status",
                "content": "Procesando..."
            })
            
            response = agent.run(message.get("message", ""))
            
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
    with open("../frontend/login.html", "r") as f:
        return f.read()

@app.get("/dashboard", response_class=HTMLResponse)
async def serve_dashboard():
    with open("../frontend/dashboard.html", "r") as f:
        return f.read()

# ============================================
# Punto de entrada
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)