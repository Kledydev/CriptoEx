"""
Módulo del agente CriptoEx
Usa Google Gemini (GRATIS) para chat y embeddings
"""
from pathlib import Path
from agno.agent import Agent
from agno.models.google import Gemini
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.website import WebsiteTools
from agno.knowledge.embedder.google import GeminiEmbedder
from agno.knowledge.knowledge import Knowledge
from agno.vectordb.chroma import ChromaDb
from agno.vectordb.search import SearchType
from config import GOOGLE_API_KEY, BASE_DIR

# Base de conocimientos con ChromaDB + Gemini Embeddings
knowledge = Knowledge(
    name="Base de conocimiento CriptoEx",
    vector_db=ChromaDb(
        collection="criptoex_knowledge",
        path=str(BASE_DIR / "base_vectorial"),
        persistent_client=True,
        search_type=SearchType.hybrid,
        embedder=GeminiEmbedder(
            id="gemini-embedding-001",
            api_key=GOOGLE_API_KEY,
        ),
    ),
)

knowledge.insert(
    path=str(BASE_DIR / "knowledge"),
    skip_if_exists=True,
)

def create_cripto_agent() -> Agent:
    return Agent(
        name="CriptoEx",
        model=Gemini(
            id="gemini-3.6-flash",  # Modelo gratuito de Google
            api_key=GOOGLE_API_KEY,
        ),
        tools=[DuckDuckGoTools(), WebsiteTools()],
        knowledge=knowledge,
        search_knowledge=True,
        add_history_to_context=True,
        num_history_runs=5,
        markdown=True,
        instructions=[
            "Eres CriptoEx, un experto en criptomonedas y blockchain.",
            "Responde en español, con claridad y sin inventar datos.",
            "Busca en la web para obtener precios actuales y noticias recientes.",
            "Consulta la base de conocimiento cuando la pregunta trate sobre conceptos crypto.",
            "Incluye enlaces a las fuentes que realmente consultaste.",
            "Si no puedes confirmar una respuesta, dilo claramente.",
            "No des consejos de inversión, solo información educativa.",
        ],
    )