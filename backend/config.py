"""
Configuración global del proyecto CriptoEx
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent

# Cargar variables de entorno desde el archivo .env local
load_dotenv(BASE_DIR / ".env")

# Leer las variables
ORCA_API_KEY = os.getenv("ORCA_ROUTER_API_KEY")
ORCA_BASE_URL = os.getenv("ORCA_ROUTER_BASE_URL", "https://api.orcarouter.ai/v1")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

MODEL_ID = os.getenv("MODEL_ID", "deepseek/deepseek-v4-flash")

# VALIDACIÓN DE SEGURIDAD CRÍTICA

if not ORCA_API_KEY or ORCA_API_KEY == "tu_api_key_aqui":
    raise ValueError(
        "ERROR DE SEGURIDAD: Falta ORCA_ROUTER_API_KEY en el archivo .env\n"
        "1. Asegúrate de tener un archivo llamado '.env' en la carpeta backend/\n"
        "2. Pega tu clave real de OrcaRouter allí.\n"
        "3. NUNCA subas el archivo .env a GitHub."
    )