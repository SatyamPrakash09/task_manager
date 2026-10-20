from fastapi import FastAPI, status
import httpx
from contextlib import asynccontextmanager
from src.database.db import startup_db_client, shutdown_db_client
from src.routes.task_routes import task_router

@asynccontextmanager
async def lifespan(app:FastAPI):
    await startup_db_client(app)
    yield
    await shutdown_db_client(app)

app =  FastAPI(lifespan=lifespan)

@app.get("/")
async def root() -> dict:
    return {"message":"Serve is running !!", "status":"ok", "running":True}

app.include_router(
    task_router,
    tags=["task"]
)


