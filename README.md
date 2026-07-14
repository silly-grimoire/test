# Taskade Clone

A productivity dashboard inspired by Taskade, designed to help you organize tasks across multiple time horizons with a clean, dark-themed interface.

## 🚀 Features

-   **Multi-Column Layout:** Organizes tasks into "Weeklies", "Dailies", and "Other / long term".
-   **Hierarchical Tasks:** Supports Sections, Parent Tasks, and Subtasks.
-   **Alert System:** Visual indicators for high-priority or alert-status tasks.
-   **CSV Persistence:** Lightweight data management using a `tasks.csv` file.
-   **Modern UI:** Dark-themed dashboard built with React and Bootstrap.

## 🛠️ Tech Stack

-   **Frontend:** [React](https://reactjs.org/), [React-Bootstrap](https://react-bootstrap.github.io/), [Axios](https://axios-http.com/)
-   **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python)
-   **Data Storage:** CSV

## 📂 Project Structure

```text
├── backend/
│   ├── main.py          # FastAPI application logic
│   ├── tasks.csv        # Data storage
│   └── core/            # Backend utilities
├── frontend/
│   ├── src/             # React components and styling
│   ├── public/          # Static assets
│   └── package.json     # Frontend dependencies
└── README.md
```

## ⚙️ Setup Instructions

### Prerequisites

-   Python 3.8+
-   Node.js & npm

### Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  (Optional) Create and activate a virtual environment in the project root:
    ```bash
    cd ..
    python -m venv .venv
    # On Windows:
    .venv\Scripts\activate
    # On macOS/Linux:
    source .venv/bin/activate
    cd backend
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Start the FastAPI server:
    ```bash
    uvicorn main:app --reload
    ```
    The backend will be running at `http://127.0.0.1:8000`.

### Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the React development server:
    ```bash
    npm start
    ```
    The application will be accessible at `http://localhost:3000`.

## 📊 Data Configuration

The tasks are managed via `backend/tasks.csv`. The columns are:

-   `column`: The dashboard column (Weeklies, Dailies, Other / long term).
-   `category`: Section header or parent task name.
-   `task_name`: The name of the task.
-   `is_subtask`: Boolean (TRUE/FALSE) indicating if it's a subtask.
-   `parent_task`: The name of the parent task if it's a subtask.
-   `is_alert`: Boolean (TRUE/FALSE) for highlighting the task.

## 📝 License

MIT
