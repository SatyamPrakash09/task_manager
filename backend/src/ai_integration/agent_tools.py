from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from langchain.tools import tool
from src.database.db import get_database


@tool
async def create_task_tool(
    title: str,
    priority: Optional[str] = None,
    dueDate: Optional[str] = None,
    tags: Optional[List[str]] = None,
    complete: bool = False
) -> dict:
    """Create a new task in the database.

    Args:
        title: The title or description of the task (required).
        priority: Priority level of the task ('low', 'medium', or 'high').
        dueDate: Optional due date as an ISO string (e.g. '2026-10-25').
        tags: Optional list of tags (e.g. ['work', 'urgent']).
        complete: Whether the task is already completed (defaults to False).
    """
    if not title or not title.strip():
        return {"error": "Task title is required."}

    parsed_due_date = None
    if dueDate:
        try:
            parsed_due_date = datetime.fromisoformat(dueDate.replace("Z", "+00:00"))
        except Exception:
            parsed_due_date = None

    task_dict = {
        "title": title.strip(),
        "complete": bool(complete),
        "createdAt": datetime.now(),
        "dueDate": parsed_due_date,
        "priority": priority,
        "tags": tags if tags is not None else []
    }

    db = get_database()
    result = await db["tasks"].insert_one(task_dict)

    return {
        "id": str(result.inserted_id),
        "title": task_dict["title"],
        "complete": task_dict["complete"],
        "createdAt": task_dict["createdAt"].isoformat(),
        "dueDate": task_dict["dueDate"].isoformat() if task_dict["dueDate"] else None,
        "priority": task_dict["priority"],
        "tags": task_dict["tags"]
    }


@tool
async def list_task_tool() -> List[dict]:
    """Retrieve and list all existing tasks from the database."""
    db = get_database()
    result = await db["tasks"].find().to_list(None)
    tasks = []
    for doc in result:
        created_at = doc.get("createdAt")
        due_date = doc.get("dueDate")
        tasks.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", ""),
            "complete": doc.get("complete", False),
            "createdAt": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or ""),
            "dueDate": due_date.isoformat() if isinstance(due_date, datetime) else str(due_date or "") if due_date else None,
            "priority": doc.get("priority"),
            "tags": doc.get("tags", [])
        })
    return tasks


@tool
async def delete_task_tool(id: str) -> dict:
    """Delete a task by its 24-character hexadecimal MongoDB ID.

    Args:
        id: The unique MongoDB ObjectId string of the task to delete.
    """
    if not ObjectId.is_valid(id):
        return {"error": f"Invalid task ID format '{id}'. Must be a 24-character hexadecimal string."}

    db = get_database()
    delete_result = await db["tasks"].delete_one({"_id": ObjectId(id)})
    if delete_result.deleted_count == 0:
        return {"error": f"Task with ID '{id}' was not found."}
    return {"message": f"Task {id} deleted successfully."}


@tool
async def update_task_tool(
    id: str,
    title: Optional[str] = None,
    complete: Optional[bool] = None,
    priority: Optional[str] = None,
    dueDate: Optional[str] = None,
    tags: Optional[List[str]] = None
) -> dict:
    """Update an existing task by its unique MongoDB ID.

    Args:
        id: The 24-character hexadecimal MongoDB ID of the task.
        title: Optional new title.
        complete: Optional boolean indicating if the task is completed.
        priority: Optional priority ('low', 'medium', 'high').
        dueDate: Optional due date string in ISO format.
        tags: Optional list of tags.
    """
    if not ObjectId.is_valid(id):
        return {"error": f"Invalid task ID format '{id}'. Must be a 24-character hexadecimal string."}

    update_data = {}
    if title is not None:
        update_data["title"] = title
    if complete is not None:
        update_data["complete"] = bool(complete)
    if priority is not None:
        update_data["priority"] = priority
    if dueDate is not None:
        try:
            update_data["dueDate"] = datetime.fromisoformat(dueDate.replace("Z", "+00:00"))
        except Exception:
            update_data["dueDate"] = dueDate
    if tags is not None:
        update_data["tags"] = tags

    if not update_data:
        return {"error": "No fields provided to update."}

    db = get_database()
    updated_result = await db["tasks"].update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    if updated_result.matched_count == 0:
        return {"error": f"Task with ID '{id}' was not found."}

    updated_task = await db["tasks"].find_one({"_id": ObjectId(id)})
    created_at = updated_task.get("createdAt")
    due = updated_task.get("dueDate")
    return {
        "id": str(updated_task["_id"]),
        "title": updated_task.get("title", ""),
        "complete": updated_task.get("complete", False),
        "createdAt": created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or ""),
        "dueDate": due.isoformat() if isinstance(due, datetime) else str(due or "") if due else None,
        "priority": updated_task.get("priority"),
        "tags": updated_task.get("tags", [])
    }
