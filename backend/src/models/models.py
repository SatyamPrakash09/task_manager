from typing import Optional, List, Union
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from bson import ObjectId


class Task(BaseModel):
    title: str
    complete: bool = False
    createdAt: datetime = Field(default_factory=datetime.now)
    dueDate: Optional[datetime] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)


class TaskResponse(BaseModel):
    id: str = Field(alias="_id")
    title: str
    complete: bool = False
    createdAt: datetime
    dueDate: Optional[datetime] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)

    model_config = {"populate_by_name": True}

    @classmethod
    def from_mongo(cls, doc: dict) -> "TaskResponse":
        doc["_id"] = str(doc["_id"])
        return cls(**doc)


class create_task_response(BaseModel):
    id: Union[str, int]
    title: str
    complete: bool
    createdAt: datetime
    dueDate: Optional[datetime] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    
class update_task(BaseModel):
    title:Optional[str]
    complete:Optional[bool]=False
    