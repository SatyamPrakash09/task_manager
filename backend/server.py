from uvicorn import run
from dotenv import load_dotenv
load_dotenv()
from src.config.settings import get_setting

setting = get_setting()
if __name__ == "__main__":
    run(
        "src.main:app",
        host=setting.HOST,
        port=setting.PORT,
        reload=setting.RELOAD,
    )