"""
Módulo del agente CriptoEx
"""
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.website import WebsiteTools
from config import ORCA_API_KEY, ORCA_BASE_URL, MODEL_ID

def create_cripto_agent() -> Agent:
    """Crea y retorna el agente CriptoEx"""
    return Agent(
        name="CriptoEx",
        model=OpenAIChat(
            id=MODEL_ID,
            api_key=ORCA_API_KEY,
            base_url=ORCA_BASE_URL,
            temperature=0.7,
        ),
        tools=[DuckDuckGoTools(), WebsiteTools()],
        search_knowledge=True,
        add_history_to_context=True,
        num_history_runs=5,
        markdown=True,
        instructions=[
            "Eres CriptoEx, un experto en criptomonedas y blockchain.",
            "Responde en español, con claridad y sin inventar datos.",
            "Busca en la web para obtener precios actuales y noticias recientes.",
            "Incluye enlaces a las fuentes que realmente consultaste.",
            "Si no puedes confirmar una respuesta, dilo claramente.",
            "No des consejos de inversión, solo información educativa.",
        ],
    )