# CriptoEx

Agente de IA especializado en criptomonedas y blockchain, construido con **FastAPI**, **Agno**, **Gemini** y **ChromaDB**.

CriptoEx responde preguntas sobre criptomonedas combinando tres fuentes de información:
búsqueda web en tiempo real, scraping de páginas especializadas y una base de
conocimientos local indexada con vectores.

---

## Características

- **Agente de IA** con modelo Gemini (Google AI Studio)
- **Búsqueda web en tiempo real** con DuckDuckGo
- **Scraping inteligente** de páginas web con WebsiteTools
- **Base de conocimientos local** con ChromaDB y embeddings de Gemini
- **Autenticación JWT** con contraseñas hasheadas (bcrypt)
- **Sesiones persistentes** almacenadas en JSON (sobreviven reinicios del servidor)
- **Historial de conversación** recuperable por sesión
- **Eliminación de sesiones** con confirmación
- **Vistas funcionales**: Chat, Base de Conocimientos y Fuentes consultadas
- **Colecciones temáticas**: filtrado de sesiones por Bitcoin, Ethereum, DeFi y Trading
- **Análisis de fuentes**: detección automática de dominios consultados (CoinMarketCap, CoinGecko, base local)
- **WebSocket** para eventos en tiempo real
- **Interfaz propia** inspirada en diseño minimalista tipo Shelf

---

## Capturas de pantalla

> Sugerencia: crea una carpeta `docs/` con tus capturas y reemplaza estas rutas.

| Login | Dashboard |
|-------|-----------|
| ![Login](docs/login.png) | ![Dashboard](docs/dashboard.png) |

---

## Demo

- **URL local:** http://localhost:8000
- **Usuario:** `admin`
- **Contraseña:** `admin123`

> Las credenciales de demo son solo para fines académicos.

---

## Requisitos

- Python 3.12+
- Conda o venv
- API Key de Google AI Studio (gratuita): https://aistudio.google.com/app/apikey

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Kledydev/CriptoEx.git
cd CriptoEx
```

### 2. Crear y activar entorno virtual

**Con Conda (recomendado):**
```bash
conda create -n criptoex python=3.12 -y
conda activate criptoex
```

**Con venv:**
```bash
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows
```

### 3. Instalar dependencias

```bash
cd backend
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `backend/.env` y agrega tu clave:

```env
GOOGLE_API_KEY=tu_clave_de_google_ai_studio
JWT_SECRET_KEY=genera_una_clave_aleatoria_segura
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

> **Nunca subas el archivo `.env` a GitHub.** Está protegido por `.gitignore`.

### 5. Ejecutar el servidor

```bash
python main.py
```

El servidor quedará disponible en **http://localhost:8000**

---

## Uso

1. Inicia sesión con las credenciales de demo
2. Escribe una pregunta en la barra inferior (estilo ChatGPT)
3. El agente consultará la web, la base local o ambas según la pregunta
4. Explora las vistas superiores: **Chat**, **Conocimiento** y **Fuentes**
5. Filtra sesiones por **colección** (tema) o por **fuente** desde el sidebar
6. Elimina sesiones con el ícono de papelera al pasar el mouse

### Ejemplos de preguntas

- "¿Qué es el halving de Bitcoin?"
- "Precio actual de Ethereum"
- "¿Qué es DeFi y cuáles son sus riesgos?"
- "Noticias recientes sobre criptomonedas"

---

## Arquitectura del proyecto

```
CriptoEx/
├── backend/
│   ├── main.py              # App FastAPI: endpoints, WebSocket y persistencia
│   ├── config.py            # Carga de variables de entorno (.env)
│   ├── auth.py              # Autenticación JWT y hash de contraseñas
│   ├── agent.py             # Definición del agente (Gemini + herramientas + knowledge)
│   ├── models.py            # Modelos Pydantic (Login, Chat, Token)
│   ├── sessions.json        # Persistencia de sesiones (generado automáticamente)
│   ├── requirements.txt     # Dependencias Python
│   ├── .env.example         # Plantilla de variables (sin claves reales)
│   ├── .gitignore           # Protege .env y archivos generados
│   └── knowledge/
│       └── crypto_knowledge.md  # Documentos indexados en ChromaDB
├── frontend/
│   ├── login.html           # Pantalla de acceso (diseño split-screen)
│   ├── dashboard.html       # Interfaz principal del chat
│   ├── css/
│   │   ├── login.css        # Estilos del login
│   │   └── dashboard.css    # Estilos del dashboard
│   └── js/
│       ├── app.js           # Lógica de autenticación
│       └── dashboard.js     # Lógica del chat, sesiones, tabs y filtros
└── README.md
```

---

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Inicia sesión y retorna token JWT | No |

### Agentes

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/agents/chat` | Envía un mensaje al agente y obtiene respuesta | Sí |

### Sesiones

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/sessions` | Lista todas las sesiones (ordenadas por fecha) | Sí |
| GET | `/api/sessions/{id}` | Obtiene el historial completo de una sesión | Sí |
| DELETE | `/api/sessions/{id}` | Elimina una sesión específica | Sí |
| DELETE | `/api/sessions` | Elimina todas las sesiones | Sí |

### Conocimiento y análisis

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/knowledge` | Secciones indexadas en la base de conocimientos | Sí |
| GET | `/api/sources` | URLs extraídas de las respuestas del agente | Sí |
| GET | `/api/collections` | Sesiones agrupadas por tema (Bitcoin, Ethereum, DeFi, Trading) | Sí |
| GET | `/api/source_stats` | Sesiones agrupadas por fuente consultada | Sí |

### Tiempo real

| Tipo | Endpoint | Descripción | Auth |
|------|----------|-------------|------|
| WS | `/ws/events/{session_id}` | WebSocket para eventos en tiempo real | No |

### Ejemplo de uso con curl

```bash
# 1. Login (guarda el token)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# 2. Enviar mensaje al agente
curl -X POST http://localhost:8000/api/agents/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "¿Qué es el bitcoin?"}'

# 3. Listar sesiones
curl -X GET http://localhost:8000/api/sessions \
  -H "Authorization: Bearer $TOKEN"

# 4. Eliminar una sesión
curl -X DELETE http://localhost:8000/api/sessions/ID_DE_SESION \
  -H "Authorization: Bearer $TOKEN"
```

---

## Cumplimiento de requisitos académicos

| Requisito | Implementación |
|-----------|----------------|
| API de Agentes | Endpoint `/api/agents/chat` con agente Agno |
| API de Sessions | Crear, listar, obtener historial y eliminar sesiones |
| Manejo de eventos | WebSocket `/ws/events/{session_id}` |
| UI propia con autenticación | Login JWT + dashboard custom |
| Búsqueda web | DuckDuckGoTools |
| Scraping | WebsiteTools |
| Base de conocimientos | ChromaDB con embeddings de Gemini |
| Persistencia | `sessions.json` + ChromaDB persistente |

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Agente | Agno, Gemini (Google AI Studio) |
| Herramientas | DuckDuckGoTools, WebsiteTools |
| VectorDB | ChromaDB |
| Embeddings | Gemini Embedder |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Frontend | HTML5, CSS3, JavaScript vanilla |
| Persistencia | JSON (sesiones), SQLite (ChromaDB) |

---

## Seguridad

- Las claves de API se almacenan en `.env` (excluido de Git)
- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración configurable
- Validación de entrada con modelos Pydantic
- El agente no da consejos de inversión (uso educativo)

---

## Roadmap (mejoras futuras)

- [ ] Registro de usuarios nuevos
- [ ] PostgreSQL con pgvector para historial persistente
- [ ] Reintento automático ante límites de cuota (error 429)
- [ ] Exportar sesiones a PDF o Markdown
- [ ] Integración directa con APIs de CoinMarketCap y CoinGecko

---

## Licencia

MIT

---

**Desarrollado como proyecto académico de agentes de IA.**