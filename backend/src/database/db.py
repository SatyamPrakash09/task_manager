from motor.motor_asyncio import AsyncIOMotorClient
from src.config.settings import get_setting

setting = get_setting()




async def startup_db_client(app):
    app.mongodb_client = AsyncIOMotorClient(
        setting.MONGODB_URL
    )
    app.mongodb = app.mongodb_client.get_database("task_manager")
    print("MongoDB Connected !!")

async def shutdown_db_client(app):
    app.mongodb_client.close()
    print("Database disconnected !")

