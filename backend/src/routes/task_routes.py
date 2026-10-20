from fastapi import APIRouter, Request, status, HTTPException
from src.models.models import create_task_response, Task, TaskResponse, update_task
from typing import List
from bson import ObjectId

task_router = APIRouter(prefix="/api/v1/task")

@task_router.get("/")
def greet():
    return {"messages": "Inside Task Router", "status": True}


@task_router.post("/create-task", response_model=create_task_response, status_code=status.HTTP_201_CREATED)
async def create_task_route(task: Task, request: Request):
    task_dict = task.model_dump()
    if not task_dict:
        raise HTTPException(status_code=400, detail="Invalid Request !!")
    result = await request.app.mongodb["tasks"].insert_one(task_dict)
    return {
        "id": str(result.inserted_id),
        **task_dict
    }


@task_router.get("/list-task", response_model=List[TaskResponse], status_code=status.HTTP_200_OK)
async def list_task_route(request: Request):
    result = await request.app.mongodb["tasks"].find().to_list(None)
    return [TaskResponse.from_mongo(doc) for doc in result]


@task_router.delete("/delete-task/{id}", response_model=dict, status_code=status.HTTP_200_OK)
async def delete_task_route(id: str, request: Request):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    delete_result = await request.app.mongodb["tasks"].delete_one({"_id": ObjectId(id)})
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task doesn't exist")
    return {"message": f"Task {id} deleted Successfully !!"}

@task_router.patch('/update-task/{id}', response_model=TaskResponse, status_code=status.HTTP_200_OK)
async def update_task_route(id: str, request: Request, body: update_task):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid task ID format")

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    updated_result = await request.app.mongodb["tasks"].update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    if updated_result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task doesn't exist")

    updated_task = await request.app.mongodb["tasks"].find_one({"_id": ObjectId(id)})
    return TaskResponse.from_mongo(updated_task)
    
