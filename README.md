# Task Manager

Full-stack Task Manager application with a FastAPI + MongoDB backend and a Vite + React frontend styled with custom CSS and modern UI.

## Project Structure

```
task_manager/
├── backend/                  # FastAPI + MongoDB REST API
│   ├── src/
│   │   ├── config/           # App configuration and settings
│   │   ├── database/         # MongoDB motor async client
│   │   ├── models/           # Pydantic models (Task, TaskResponse, update_task)
│   │   ├── routes/           # API routes (/tasks, /create-task, etc.)
│   │   └── main.py           # FastAPI entrypoint
│   ├── server.py             # Uvicorn server launcher
│   └── pyproject.toml        # uv / Python dependencies
│
└── frontend/                 # Vite + React web application
    ├── src/
    │   ├── api.js            # Axios client with backend endpoints
    │   ├── App.jsx           # Task manager dashboard UI
    │   └── index.css         # Theme tokens and responsive styling
    ├── package.json          # Dependencies & scripts
    └── vite.config.js        # Vite configuration & dev proxy
```

## Getting Started

### 1. Backend

Navigate to the `backend/` directory:
```bash
cd backend
# Run with uv
uv run python server.py
# Or with standard uvicorn
uvicorn src.main:app --host 0.0.0.0 --port 3000 --reload
```

The API will be available at `http://localhost:3000`. API docs can be viewed at `http://localhost:3000/docs`.

### 2. Frontend

In another terminal, navigate to the `frontend/` directory:
```bash
cd frontend
# Install dependencies (using bun or npm)
bun install
# Start dev server
bun run dev
```

The application will be accessible at `http://localhost:5173`.
