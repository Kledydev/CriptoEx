"""
Configuración global del proyecto CriptoEx
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent

load_dotenv(BASE_DIR / ".env")

ORCA_API_KEY = os.getenv("ORCA_ROUTER_API_KEY")
ORCA_BASE_URL = os.getenv("ORCA_ROUTER_BASE_URL", "https://api.orcarouter.ai/v1")
MODEL_ID = os.getenv("MODEL_ID", "deepseek/deepseek-v4.1-flash-free")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

if not ORCA_API_KEY or ORCA_API_KEY == "tu_api_key_aqui":
    raise ValueError("🚨 Falta ORCA_ROUTER_API_KEY en backend/.env")

if not GOOGLE_API_KEY or GOOGLE_API_KEY == "tu_google_api_key_aqui":
    raise ValueError("🚨 Falta GOOGLE_API_KEY en backend/.env\nObtén una gratis en: https://aistudio.google.com/app/apikey")