import json
from langchain.chat_models import init_chat_model
from langchain.agents import create_agent
from langchain_core.messages import ToolMessage
from src.config.settings import get_setting
from src.ai_integration.agent_tools import (
    create_task_tool,
    list_task_tool,
    update_task_tool,
    delete_task_tool,
)

setting = get_setting()

llm_kwargs = {
    "model": setting.LLM,
    "model_provider": setting.LLM_PROVIDER,
}
if setting.LLM_API_KEY:
    llm_kwargs["api_key"] = setting.LLM_API_KEY

llm = init_chat_model(**llm_kwargs)

task_agent = create_agent(
    model=llm,
    tools=[create_task_tool, list_task_tool, update_task_tool, delete_task_tool],
    system_prompt="""
        ### Available Capabilities & Tools:
        1. **Create Tasks (`create_task_tool`)**: Use this tool when the user wants to add a new task. Ensure you collect all required fields (such as title, priority, dueDate, tags, etc.) before invoking.
        2. **List Tasks (`list_task_tool`)**: Use this tool to retrieve and display all existing tasks stored in the database. Always use this when a user asks to see their tasks, or when you need to look up a task ID.
        3. **Update Tasks (`update_task_tool`)**: Use this tool to modify existing tasks (e.g., marking tasks as complete, changing titles/descriptions) using the task's unique MongoDB ID.
        4. **Delete Tasks (`delete_task_tool`)**: Use this tool to remove tasks that are completed or no longer needed, using their unique MongoDB ID.

        You are an efficient and helpful Task Management AI Assistant. Your primary goal is to help users organize, track, and manage their tasks and to-do lists seamlessly using the provided tools.

        ### Operational Guidelines:
        - **ID Resolution**: If a user refers to a task by its name or description rather than its unique ID, **always** call `list_task_tool` first to find the correct corresponding ID. Never guess an ID.
        - **Confirmation & Feedback**: After every successful tool execution, provide clear, concise feedback to the user confirming what action was taken (e.g., showing the created task details, confirmation of deletion, or the updated task state).
        - **Error Handling**: If a tool returns an error (such as an invalid ID format or a task not found), explain the issue clearly and politely to the user and offer a way to resolve it (e.g., listing tasks to find a valid ID).
        - **Formatting**: Present lists of tasks cleanly using markdown bullet points, bold text for key attributes (like titles and IDs), and structured layouts for readability.
    """
)


async def send_completion_events(messages, task_agent=task_agent, **kwargs):
    agent = kwargs.get("chat", task_agent)

    # Normalize messages to format expected by the agent
    formatted_messages = []
    if isinstance(messages, str):
        formatted_messages = [("user", messages)]
    elif isinstance(messages, list):
        for msg in messages:
            if isinstance(msg, dict):
                formatted_messages.append((msg.get("role", "user"), msg.get("content", "")))
            elif hasattr(msg, "role") and hasattr(msg, "content"):
                formatted_messages.append((msg.role, msg.content))
            elif isinstance(msg, (list, tuple)) and len(msg) == 2:
                formatted_messages.append(msg)
            else:
                formatted_messages.append(("user", str(msg)))
    else:
        formatted_messages = [("user", str(messages))]

    try:
        async for chunk, _ in agent.astream({"messages": formatted_messages}, stream_mode="messages"):
            if isinstance(chunk, ToolMessage):
                payload = {"type": "tool_result", "name": chunk.name, "content": chunk.content}
                yield f"data: {json.dumps(payload)}\n\n"
                continue

            content = chunk.content
            if content:
                if isinstance(content, str):
                    text = content
                elif isinstance(content, list):
                    text = "".join(
                        part if isinstance(part, str) else part.get("text", "")
                        for part in content
                    )
                else:
                    text = str(content)

                if text:
                    payload = {"type": "llm_chunk", "content": text}
                    yield f"data: {json.dumps(payload)}\n\n"

            tool_calls = getattr(chunk, "tool_calls", None)
            if tool_calls:
                payload = {"type": "tool_call", "tool_calls": tool_calls}
                yield f"data: {json.dumps(payload)}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as e:
        error_payload = {"type": "error", "content": str(e)}
        yield f"data: {json.dumps(error_payload)}\n\n"
