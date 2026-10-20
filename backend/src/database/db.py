from motor.motor_asyncio import AsyncIOMotorClient
from src.config.settings import get_setting

setting = get_setting()




client: AsyncIOMotorClient = None
db = None

async def startup_db_client(app):
    global client, db
    client = AsyncIOMotorClient(setting.MONGODB_URL)
    db = client.get_database("task_manager")
    app.mongodb_client = client
    app.mongodb = db
    print("MongoDB Connected !!")

async def shutdown_db_client(app):
    global client
    if client:
        client.close()
    print("Database disconnected !")

def get_database():
    global client, db
    if db is None:
        client = AsyncIOMotorClient(setting.MONGODB_URL)
        db = client.get_database("task_manager")
    return db

