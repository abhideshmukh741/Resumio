import os
from dotenv import load_dotenv
from agno.models.groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
FALLBACK_MODEL = "qwen/qwen3.8-27b"
TEMPERATURE = float(os.getenv("MODEL_TEMPERATURE", "0.2"))

def get_agent_model(model_id: str = None) -> Groq:
    """
    Centralized model factory for Agno agents.
    Allows changing the underlying LLM across all agents seamlessly.
    """
    chosen_id = model_id or DEFAULT_MODEL
    return Groq(
        id=chosen_id,
        api_key=GROQ_API_KEY,
        temperature=TEMPERATURE,
    )
