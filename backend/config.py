"""
Configuración global del proyecto CriptoEx
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent

load_dotenv(BASE_DIR / ".env")

# Solo necesitamos Google API Key ahora
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

if not GOOGLE_API_KEY or GOOGLE_API_KEY == "tu_google_api_key_aqui":
    raise ValueError(
        "Falta GOOGLE_API_KEY en backend/.env\n"
        "Obtén una gratis en: https://aistudio.google.com/app/apikey"
    )