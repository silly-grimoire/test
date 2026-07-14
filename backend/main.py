import csv
import os
import logging
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel, ConfigDict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s', handlers=[logging.StreamHandler()])

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), "tasks.csv")
MATERIALS_FILE_PATH = os.path.join(os.path.dirname(__file__), "materials.csv")

# --- Models ---
class TaskUpdate(BaseModel):
    is_done: bool = None
    amount_now: int = None
    amount_total: int = None

class NewTask(BaseModel):
    column: str
    task_name: str
    category: str = ""
    is_subtask: bool = False
    parent_task: str = ""
    is_alert: bool = False
    task_type: str = "checklist"
    amount_now: int = 0
    amount_total: int = 1

class TaskReorder(BaseModel):
    id: str
    category: str = ""

class ReorderTasks(BaseModel):
    tasks: list[TaskReorder]

class MaterialUpdate(BaseModel):
    amount_now: int = None
    amount_total: int = None
    new_name: str = None

class MaterialRow(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: str
    amount_total: str | int = "0"
    amount_now: str | int = "0"

class ReorderMaterials(BaseModel):
    materials: list[MaterialRow]

# --- Utilities ---
def parse_boolean(val: str) -> bool:
    return val.strip().upper() == "TRUE"

def save_tasks_to_csv(rows):
    fieldnames = ["id", "column", "category", "task_name", "is_subtask", "parent_task", "is_alert", "is_done", "last_done_date", "task_type", "amount_now", "amount_total", "order"]
    with open(CSV_FILE_PATH, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

def load_tasks_from_csv():
    dashboard = {
        "Weeklies": [],
        "Dailies": [],
        "Other / long term": [],
        "Materials": []
    }

    if not os.path.exists(CSV_FILE_PATH):
        return dashboard

    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    last_monday = now - timedelta(days=now.weekday())
    last_monday_date = last_monday.date()

    rows = []
    updated = False

    with open(CSV_FILE_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        # Sort rows by column, category, and order to group them correctly
        rows.sort(key=lambda x: (x["column"], x["category"], int(x.get("order", 0))))

    for row in rows:
        is_done = parse_boolean(row["is_done"])
        last_done_str = row["last_done_date"]
        col = row["column"]
        if is_done and last_done_str:
            last_done_date = datetime.strptime(last_done_str, "%Y-%m-%d").date()
            if col == "Dailies" and last_done_str != today_str:
                row["is_done"] = "FALSE"
                if row.get("task_type") == "progress":
                    row["amount_now"] = "0"
                updated = True
            elif col == "Weeklies" and last_done_date < last_monday_date:
                row["is_done"] = "FALSE"
                if row.get("task_type") == "progress":
                    row["amount_now"] = "0"
                updated = True
    if updated:
        save_tasks_to_csv(rows)

    current_sections = {"Weeklies": None, "Dailies": None, "Other / long term": None, "Materials": None}
    parent_registry = {}

    # First pass: Register all non-subtasks so they are available as parents
    for idx, row in enumerate(rows):
        col = row["column"]
        task_name = row["task_name"]
        is_subtask = parse_boolean(row["is_subtask"])
        is_alert = parse_boolean(row["is_alert"])
        is_done = parse_boolean(row["is_done"])
        category = row["category"]
        task_type = row.get("task_type", "checklist")
        amount_now = int(row.get("amount_now", 0))
        amount_total = int(row.get("amount_total", 1))
        order = int(row.get("order", 0))
        
        logging.info(f"Processing row: {row}")

        if col not in dashboard: 
            logging.warning(f"Skipping task {task_name} due to unknown column: '{col}' (length: {len(col)})")
            continue

        if not is_subtask:
            if category and current_sections[col] != category:
                current_sections[col] = category
                dashboard[col].append({
                    "id": f"sec_{col}_{category.replace(' ', '_')}_{idx}",
                    "name": category,
                    "isSectionTitle": True,
                    "order": order
                })

            new_task = {
                "id": row.get("id"),
                "name": task_name,
                "isHeader": (task_name == category) or (col == "Weeklies" and category != ""),
                "isAlert": is_alert,
                "is_done": is_done,
                "task_type": task_type,
                "amount_now": amount_now,
                "amount_total": amount_total,
                "order": order,
                "subtasks": []
            }
            parent_registry[f"{col}_{task_name}"] = new_task
            dashboard[col].append(new_task)
        
    # Second pass: Process subtasks and attach to registered parents
    for idx, row in enumerate(rows):
        col = row["column"]
        task_name = row["task_name"]
        is_subtask = parse_boolean(row["is_subtask"])
        parent_name = row["parent_task"]
        is_alert = parse_boolean(row["is_alert"])
        is_done = parse_boolean(row["is_done"])
        task_type = row.get("task_type", "checklist")
        amount_now = int(row.get("amount_now", 0))
        amount_total = int(row.get("amount_total", 1))
        order = int(row.get("order", 0))

        if is_subtask:
            registry_key = f"{col}_{parent_name}"
            if registry_key in parent_registry:
                parent_registry[registry_key]["subtasks"].append({
                    "id": row.get("id"),
                    "name": task_name,
                    "isAlert": is_alert,
                    "is_done": is_done,
                    "task_type": task_type,
                    "amount_now": amount_now,
                    "amount_total": amount_total,
                    "order": order
                })

    # Sort subtasks by order as well
    for col in dashboard:
        for task in dashboard[col]:
            if not task.get("isSectionTitle") and task.get("subtasks"):
                task["subtasks"].sort(key=lambda x: x.get("order", 0))

    return dashboard

@app.get("/api/tasks")
def get_tasks():
    return load_tasks_from_csv()

@app.post("/api/tasks")
def create_task(task: NewTask):
    fieldnames = ["id", "column", "category", "task_name", "is_subtask", "parent_task", "is_alert", "is_done", "last_done_date", "task_type", "amount_now", "amount_total", "order"]
    
    # Load rows to find max order
    rows = []
    if os.path.exists(CSV_FILE_PATH):
        with open(CSV_FILE_PATH, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    
    max_order = -1
    for r in rows:
        if r["column"] == task.column and r["category"] == task.category:
            max_order = max(max_order, int(r.get("order", 0)))
    
    new_row = {
        "id": str(uuid.uuid4()),
        "column": task.column,
        "category": task.category,
        "task_name": task.task_name,
        "is_subtask": "TRUE" if task.is_subtask else "FALSE",
        "parent_task": task.parent_task,
        "is_alert": "TRUE" if task.is_alert else "FALSE",
        "is_done": "FALSE",
        "last_done_date": "",
        "task_type": task.task_type,
        "amount_now": str(task.amount_now),
        "amount_total": str(task.amount_total),
        "order": str(max_order + 1)
    }
    file_exists = os.path.exists(CSV_FILE_PATH)
    with open(CSV_FILE_PATH, mode="a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(new_row)
    return {"success": True}

@app.post("/api/tasks/reorder")
def reorder_tasks(update: ReorderTasks):
    rows = []
    if not os.path.exists(CSV_FILE_PATH):
        return {"error": "File not found"}
        
    with open(CSV_FILE_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    task_map = {t.id: {"order": i, "category": t.category} for i, t in enumerate(update.tasks)}
    
    found_any = False
    for row in rows:
        tid = row.get("id")
        if tid in task_map:
            row["order"] = str(task_map[tid]["order"])
            row["category"] = task_map[tid]["category"]
            found_any = True
            
    if found_any:
        save_tasks_to_csv(rows)
        return {"success": True}
    return {"error": "No tasks found to reorder"}

@app.post("/api/tasks/rename")
def rename_task(task_index: str, new_name: str):
    rows = []
    with open(CSV_FILE_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    found = False
    for row in rows:
        if ("id" in row and row["id"] == task_index) or (str(rows.index(row)) == task_index.split("_")[-1]):
            old_name = row["task_name"]
            row["task_name"] = new_name
            found = True
            for sub in rows:
                if sub["is_subtask"] == "TRUE" and sub["parent_task"] == old_name:
                    sub["parent_task"] = new_name
            break
    if found:
        save_tasks_to_csv(rows)
        return {"success": True}
    return {"error": "Task not found"}

@app.post("/api/tasks/toggle")
def toggle_task(task_index: str, update: TaskUpdate):
    rows = []
    with open(CSV_FILE_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    found = False
    for row in rows:
        if ("id" in row and row["id"] == task_index) or (str(rows.index(row)) == task_index.split("_")[-1]):
            row["is_done"] = "TRUE" if update.is_done else "FALSE"
            if update.is_done:
                row["last_done_date"] = datetime.now().strftime("%Y-%m-%d")
                if row.get("task_type") == "progress":
                    row["amount_now"] = row["amount_total"]
            else:
                if row.get("task_type") == "progress":
                    row["amount_now"] = "0"
            found = True
            break
    if found:
        save_tasks_to_csv(rows)
        return {"success": True}
    return {"error": "Task not found"}

@app.post("/api/tasks/progress")
def update_task_progress(task_index: str, update: TaskUpdate):
    rows = []
    with open(CSV_FILE_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    found = False
    for row in rows:
        if ("id" in row and row["id"] == task_index) or (str(rows.index(row)) == task_index.split("_")[-1]):
            if update.amount_now is not None:
                row["amount_now"] = str(update.amount_now)
            if update.amount_total is not None:
                row["amount_total"] = str(update.amount_total)
            
            # Auto-calculate is_done
            now = int(row["amount_now"])
            total = int(row["amount_total"])
            if now >= total:
                row["is_done"] = "TRUE"
                row["last_done_date"] = datetime.now().strftime("%Y-%m-%d")
            else:
                row["is_done"] = "FALSE"
            
            found = True
            break
    if found:
        save_tasks_to_csv(rows)
        return {"success": True}
    return {"error": "Task not found"}

@app.delete("/api/tasks")
def delete_task(task_index: str):
    logging.info(f"DEBUG: Deleting task with id: {task_index}")
    rows = []
    with open(CSV_FILE_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    new_rows = [r for r in rows if r.get("id") != task_index]
    if len(new_rows) < len(rows):
        save_tasks_to_csv(new_rows)
        return {"success": True}
    return {"error": "Task not found"}
