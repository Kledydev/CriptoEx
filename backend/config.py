"""
Configuración global del proyecto CriptoEx
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent

# 1. Cargar variables de entorno desde el archivo .env local
load_dotenv(BASE_DIR / ".env")

# 2. Leer las variables (SIN valores por defecto que sean claves reales)
ORCA_API_KEY = os.getenv("ORCA_ROUTER_API_KEY")
ORCA_BASE_URL = os.getenv("ORCA_ROUTER_BASE_URL", "https://api.orcarouter.ai/v1")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

MODEL_ID = os.getenv("MODEL_ID", "deepseek/deepseek-v4-flash")


    )