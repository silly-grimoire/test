import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './App.css';
import { hashPassword } from './cryptoUtils';

const JSONBIN_BIN_ID = process.env.REACT_APP_JSONBIN_BIN_ID;
const JSONBIN_API_KEY = process.env.REACT_APP_JSONBIN_API_KEY;
const isJsonBinEnabled = !!(JSONBIN_BIN_ID && JSONBIN_API_KEY);

function saveTasksToJSONBin(rows) {
  if (!isJsonBinEnabled) return;
  fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_API_KEY
    },
    body: JSON.stringify(rows)
  })
  .then(res => {
    if (!res.ok) throw new Error("JSONBin save failed");
    console.log("Tasks saved to JSONBin successfully");
  })
  .catch(err => console.error("Error saving to JSONBin:", err));
}

document.body.className = "dark-theme"; // Forces dark background

const EyeIcon = () => (
// ... (rest of icons)
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);
function parseCSV(text) {
  const lines = text.split('\n');
  if (lines.length <= 1) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function processTasks(rows) {
  const dashboard = {
    "Weeklies": [],
    "Dailies": [],
    "Other / long term": [],
    "Materials": []
  };

  const parseBoolean = (val) => val && val.toUpperCase() === "TRUE";

  // Auto-reset check
  const now = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  
  // Calculate last Monday
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const lastMonday = new Date(now.setDate(diff));
  lastMonday.setHours(0, 0, 0, 0);

  let updated = false;

  rows.forEach(row => {
    const isDone = parseBoolean(row.is_done);
    const lastDoneStr = row.last_done_date;
    const col = row.column;
    
    if (isDone && lastDoneStr) {
      const parts = lastDoneStr.split('-');
      const lastDoneDate = new Date(parts[0], parts[1] - 1, parts[2]);
      lastDoneDate.setHours(0, 0, 0, 0);

      if (col === "Dailies" && lastDoneStr !== todayStr) {
        row.is_done = "FALSE";
        if (row.task_type === "progress") {
          row.amount_now = "0";
        }
        updated = true;
      } else if (col === "Weeklies" && lastDoneDate < lastMonday) {
        row.is_done = "FALSE";
        if (row.task_type === "progress") {
          row.amount_now = "0";
        }
        updated = true;
      }
    }
  });

  if (updated) {
    localStorage.setItem('tasks_local_data', JSON.stringify(rows));
    if (isJsonBinEnabled) {
      saveTasksToJSONBin(rows);
    }
  }

  // Sort rows
  rows.sort((a, b) => {
    const colA = a.column || "";
    const colB = b.column || "";
    const catA = a.category || "";
    const catB = b.category || "";
    const ordA = parseInt(a.order) || 0;
    const ordB = parseInt(b.order) || 0;
    if (colA !== colB) return colA.localeCompare(colB);
    if (catA !== catB) return catA.localeCompare(catB);
    return ordA - ordB;
  });

  const currentSections = { "Weeklies": null, "Dailies": null, "Other / long term": null, "Materials": null };
  const parentRegistry = {};

  rows.forEach((row, idx) => {
    const col = row.column;
    const taskName = row.task_name;
    const isSubtask = parseBoolean(row.is_subtask);
    const isAlert = parseBoolean(row.is_alert);
    const isDone = parseBoolean(row.is_done);
    const category = row.category;
    const taskType = row.task_type || "checklist";
    const amountNow = parseInt(row.amount_now) || 0;
    const amountTotal = parseInt(row.amount_total) || 1;
    const order = parseInt(row.order) || 0;

    if (!col || !dashboard[col]) return;

    if (!isSubtask) {
      if (category && currentSections[col] !== category) {
        currentSections[col] = category;
        dashboard[col].push({
          id: `sec_${col}_${category.replace(/ /g, '_')}_${idx}`,
          name: category,
          isSectionTitle: true,
          order: order
        });
      }

      const newTask = {
        id: row.id,
        name: taskName,
        isHeader: (taskName === category) || (col === "Weeklies" && category !== ""),
        isAlert: isAlert,
        is_done: isDone,
        task_type: taskType,
        amount_now: amountNow,
        amount_total: amountTotal,
        order: order,
        subtasks: []
      };
      parentRegistry[`${col}_${taskName}`] = newTask;
      dashboard[col].push(newTask);
    }
  });

  rows.forEach((row) => {
    const col = row.column;
    const taskName = row.task_name;
    const isSubtask = parseBoolean(row.is_subtask);
    const parentName = row.parent_task;
    const isAlert = parseBoolean(row.is_alert);
    const isDone = parseBoolean(row.is_done);
    const taskType = row.task_type || "checklist";
    const amountNow = parseInt(row.amount_now) || 0;
    const amountTotal = parseInt(row.amount_total) || 1;
    const order = parseInt(row.order) || 0;

    if (isSubtask && col && dashboard[col]) {
      const registryKey = `${col}_${parentName}`;
      if (parentRegistry[registryKey]) {
        parentRegistry[registryKey].subtasks.push({
          id: row.id,
          name: taskName,
          isAlert: isAlert,
          is_done: isDone,
          task_type: taskType,
          amount_now: amountNow,
          amount_total: amountTotal,
          order: order
        });
      }
    }
  });

  Object.keys(dashboard).forEach(col => {
    dashboard[col].forEach(task => {
      if (!task.isSectionTitle && task.subtasks) {
        task.subtasks.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    });
  });

  return dashboard;
}

function App() {
  const [columns, setColumns] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({}); // New state for collapsed sections
  const [showCompleted, setShowCompleted] = useState(false);
  const [addingToColumn, setAddingToColumn] = useState(null); // Track which column is showing the input
  const [addingToCategory, setAddingToCategory] = useState(null); // Track which category is showing the input
  const [newCategoryTaskName, setNewCategoryTaskName] = useState("");
  const [addingSubtaskTo, setAddingSubtaskTo] = useState(null); // Track which task ID is adding a subtask
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [newTaskType, setNewTaskType] = useState("checklist"); // New state for task type

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Local mode states
  const [isLocalMode, setIsLocalMode] = useState(false);

  const toggleSection = (columnTitle, sectionId) => {
    setCollapsedSections(prev => ({
        ...prev,
        [`${columnTitle}-${sectionId}`]: !prev[`${columnTitle}-${sectionId}`]
    }));
  };

  const saveLocalData = (rows) => {
    localStorage.setItem('tasks_local_data', JSON.stringify(rows));
    if (isJsonBinEnabled) {
      saveTasksToJSONBin(rows);
    }
    const processed = processTasks(rows);
    setColumns(processed);
  };

  const getLocalData = () => {
    const data = localStorage.getItem('tasks_local_data');
    return data ? JSON.parse(data) : [];
  };

  const loadLocalTasks = () => {
    const localRows = localStorage.getItem('tasks_local_data');
    if (isJsonBinEnabled) {
      fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Meta': 'false'
        }
      })
      .then(res => {
        if (!res.ok) throw new Error("JSONBin fetch failed");
        return res.json();
      })
      .then(data => {
        const rows = data.record || data;
        localStorage.setItem('tasks_local_data', JSON.stringify(rows));
        const processed = processTasks(rows);
        setColumns(processed);
      })
      .catch(err => {
        console.error("Error fetching from JSONBin, falling back to local cache:", err);
        if (localRows) {
          const rows = JSON.parse(localRows);
          const processed = processTasks(rows);
          setColumns(processed);
        } else {
          setColumns({
            "Weeklies": [],
            "Dailies": [],
            "Other / long term": [],
            "Materials": []
          });
        }
      });
    } else {
      if (localRows) {
        const rows = JSON.parse(localRows);
        const processed = processTasks(rows);
        setColumns(processed);
      } else {
        fetch('./tasks.csv')
          .then(res => {
            if (!res.ok) throw new Error("Statically hosted tasks.csv not found");
            return res.text();
          })
          .then(text => {
            const rows = parseCSV(text);
            localStorage.setItem('tasks_local_data', JSON.stringify(rows));
            const processed = processTasks(rows);
            setColumns(processed);
          })
          .catch(err => {
            console.error("Error fetching static tasks.csv:", err);
            setColumns({
              "Weeklies": [],
              "Dailies": [],
              "Other / long term": [],
              "Materials": []
            });
          });
      }
    }
  };

  const fetchTasks = () => {
    if (isJsonBinEnabled) {
      console.log("JSONBin mode enabled. Direct frontend sync activated.");
      setIsLocalMode(true);
      loadLocalTasks();
      return;
    }

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      console.log("Hosted environment detected. Using Local Storage mode.");
      setIsLocalMode(true);
      loadLocalTasks();
      return;
    }

    fetch('http://127.0.0.1:8000/api/tasks')
      .then(res => {
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(data => {
        console.log("Tasks fetched from backend:", data);
        setColumns(data);
        setIsLocalMode(false);
      })
      .catch(err => {
        console.log("Backend not available, falling back to local storage:", err);
        setIsLocalMode(true);
        loadLocalTasks();
      });
  };

  useEffect(() => {
    const checkAuthentication = async () => {
      const requiredHash = process.env.REACT_APP_PASSWORD_HASH;
      if (!requiredHash) {
        // If no password hash is configured, bypass login screen
        setIsAuthenticated(true);
        fetchTasks();
      } else {
        const savedHash = localStorage.getItem('app_password_hash');
        if (savedHash === requiredHash) {
          setIsAuthenticated(true);
          fetchTasks();
        }
      }
      setCheckingAuth(false);
    };
    checkAuthentication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    const requiredHash = process.env.REACT_APP_PASSWORD_HASH;
    if (!requiredHash) {
      setIsAuthenticated(true);
      fetchTasks();
      return;
    }

    try {
      const hashedInput = await hashPassword(passwordInput);
      // Support both the SHA-256 hash and plain-text passwords in the secret configuration
      if (hashedInput === requiredHash || passwordInput === requiredHash) {
        localStorage.setItem('app_password_hash', requiredHash);
        setIsAuthenticated(true);
        setPasswordInput("");
        fetchTasks();
      } else {
        setAuthError("Incorrect password. Please try again.");
      }
    } catch (err) {
      console.error("Hashing failed:", err);
      setAuthError("An error occurred during authentication.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('app_password_hash');
    setIsAuthenticated(false);
  };


  const renameTask = (taskId, newName) => {
    if (isLocalMode) {
      const rows = getLocalData();
      let oldName = "";
      rows.forEach(row => {
        if (row.id === taskId) {
          oldName = row.task_name;
          row.task_name = newName;
        }
      });
      if (oldName) {
        rows.forEach(row => {
          if (row.is_subtask === "TRUE" && row.parent_task === oldName) {
            row.parent_task = newName;
          }
        });
      }
      saveLocalData(rows);
      return;
    }

    fetch(`http://127.0.0.1:8000/api/tasks/rename?task_index=${encodeURIComponent(taskId)}&new_name=${encodeURIComponent(newName)}`, {
      method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchTasks();
      }
    })
    .catch(err => console.error("Error renaming task:", err));
  };

  const handleTaskNameChange = (columnTitle, taskId, newName) => {
    // Update local state to reflect change immediately
    const updatedColumns = { ...columns };
    
    // Find and update the task name in the local state
    const findAndUpdate = (list) => {
      list.forEach(task => {
        if (task.id === taskId) {
          task.name = newName;
        } else if (task.subtasks) {
          findAndUpdate(task.subtasks);
        }
      });
    };
    findAndUpdate(updatedColumns[columnTitle]);
    setColumns(updatedColumns);
  };

  const handleUpdateProgress = (taskId, amountNow, amountTotal) => {
    if (isLocalMode) {
      const rows = getLocalData();
      rows.forEach(row => {
        if (row.id === taskId) {
          row.amount_now = String(amountNow);
          row.amount_total = String(amountTotal);
          if (parseInt(amountNow) >= parseInt(amountTotal)) {
            row.is_done = "TRUE";
            row.last_done_date = new Date().toISOString().split('T')[0];
          } else {
            row.is_done = "FALSE";
          }
        }
      });
      saveLocalData(rows);
      return;
    }

    fetch(`http://127.0.0.1:8000/api/tasks/progress?task_index=${encodeURIComponent(taskId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_now: amountNow, amount_total: amountTotal })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchTasks();
      }
    })
    .catch(err => console.error("Error updating progress:", err));
  };

  const handleLocalProgressChange = (columnTitle, taskId, field, value) => {
    const updatedColumns = { ...columns };
    const findAndUpdate = (list) => {
      list.forEach(task => {
        if (task.id === taskId) {
          task[field] = value;
        } else if (task.subtasks) {
          findAndUpdate(task.subtasks);
        }
      });
    };
    findAndUpdate(updatedColumns[columnTitle]);
    setColumns(updatedColumns);
  };

  const toggleTask = (taskId, currentState) => {
    const newState = !currentState;
    if (isLocalMode) {
      const rows = getLocalData();
      rows.forEach(row => {
        if (row.id === taskId) {
          row.is_done = newState ? "TRUE" : "FALSE";
          if (newState) {
            row.last_done_date = new Date().toISOString().split('T')[0];
            if (row.task_type === "progress") {
              row.amount_now = row.amount_total;
            }
          } else {
            if (row.task_type === "progress") {
              row.amount_now = "0";
            }
          }
        }
      });
      saveLocalData(rows);
      return;
    }
    
    fetch(`http://127.0.0.1:8000/api/tasks/toggle?task_index=${encodeURIComponent(taskId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_done: newState })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchTasks();
      }
    })
    .catch(err => console.error("Error toggling task:", err));
  };

  const deleteTask = (taskId) => {
    console.log("Attempting to delete task:", taskId);
    if (isLocalMode) {
      const rows = getLocalData();
      const filtered = rows.filter(r => r.id !== taskId);
      saveLocalData(filtered);
      return;
    }

    fetch(`http://127.0.0.1:8000/api/tasks?task_index=${encodeURIComponent(taskId)}`, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchTasks();
      }
    })
    .catch(err => console.error("Error deleting task:", err));
  };

  const handleAddTask = (columnTitle) => {
    if (!newTaskName.trim() || isSubmitting) return;

    if (isLocalMode) {
      const rows = getLocalData();
      let maxOrder = -1;
      rows.forEach(r => {
        if (r.column === columnTitle && r.category === "") {
          maxOrder = Math.max(maxOrder, parseInt(r.order) || 0);
        }
      });
      const newRow = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        column: columnTitle,
        category: "",
        task_name: newTaskName,
        is_subtask: "FALSE",
        parent_task: "",
        is_alert: "FALSE",
        is_done: "FALSE",
        last_done_date: "",
        task_type: newTaskType,
        amount_now: "0",
        amount_total: newTaskType === 'progress' ? "100" : "1",
        order: String(maxOrder + 1)
      };
      rows.push(newRow);
      saveLocalData(rows);
      setNewTaskName("");
      setAddingToColumn(null);
      setNewTaskType("checklist");
      return;
    }

    setIsSubmitting(true);
    fetch('http://127.0.0.1:8000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        column: columnTitle,
        task_name: newTaskName,
        is_subtask: false,
        is_alert: false,
        task_type: newTaskType,
        amount_now: 0,
        amount_total: newTaskType === 'progress' ? 100 : 1
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setNewTaskName("");
        setAddingToColumn(null);
        setNewTaskType("checklist");
        fetchTasks();
      }
    })
    .catch(err => console.error("Error adding task:", err))
    .finally(() => setIsSubmitting(false));
  };

  const handleAddTaskInCategory = (columnTitle, category) => {
    if (!newCategoryTaskName.trim() || isSubmitting) return;

    if (isLocalMode) {
      const rows = getLocalData();
      let maxOrder = -1;
      rows.forEach(r => {
        if (r.column === columnTitle && r.category === category) {
          maxOrder = Math.max(maxOrder, parseInt(r.order) || 0);
        }
      });
      const newRow = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        column: columnTitle,
        category: category,
        task_name: newCategoryTaskName,
        is_subtask: "FALSE",
        parent_task: "",
        is_alert: "FALSE",
        is_done: "FALSE",
        last_done_date: "",
        task_type: newTaskType,
        amount_now: "0",
        amount_total: newTaskType === 'progress' ? "100" : "1",
        order: String(maxOrder + 1)
      };
      rows.push(newRow);
      saveLocalData(rows);
      setNewCategoryTaskName("");
      setAddingToCategory(null);
      setNewTaskType("checklist");
      return;
    }

    setIsSubmitting(true);
    fetch('http://127.0.0.1:8000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        column: columnTitle,
        task_name: newCategoryTaskName,
        category: category,
        is_subtask: false,
        is_alert: false,
        task_type: newTaskType,
        amount_now: 0,
        amount_total: newTaskType === 'progress' ? 100 : 1
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setNewCategoryTaskName("");
        setAddingToCategory(null);
        setNewTaskType("checklist");
        fetchTasks();
      }
    })
    .catch(err => console.error("Error adding task to category:", err))
    .finally(() => setIsSubmitting(false));
  };

  const handleAddSubtask = (columnTitle, parentName) => {
    if (!newSubtaskName.trim() || isSubmitting) return;

    if (isLocalMode) {
      const rows = getLocalData();
      let maxOrder = -1;
      rows.forEach(r => {
        if (r.column === columnTitle && r.is_subtask === "TRUE" && r.parent_task === parentName) {
          maxOrder = Math.max(maxOrder, parseInt(r.order) || 0);
        }
      });
      const newRow = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        column: columnTitle,
        category: "",
        task_name: newSubtaskName,
        is_subtask: "TRUE",
        parent_task: parentName,
        is_alert: "FALSE",
        is_done: "FALSE",
        last_done_date: "",
        task_type: newTaskType,
        amount_now: "0",
        amount_total: newTaskType === 'progress' ? "100" : "1",
        order: String(maxOrder + 1)
      };
      rows.push(newRow);
      saveLocalData(rows);
      setNewSubtaskName("");
      setAddingSubtaskTo(null);
      setNewTaskType("checklist");
      return;
    }

    setIsSubmitting(true);
    fetch('http://127.0.0.1:8000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        column: columnTitle,
        task_name: newSubtaskName,
        is_subtask: true,
        parent_task: parentName,
        is_alert: false,
        task_type: newTaskType,
        amount_now: 0,
        amount_total: newTaskType === 'progress' ? 100 : 1
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setNewSubtaskName("");
        setAddingSubtaskTo(null);
        setNewTaskType("checklist");
        fetchTasks();
      }
    })
    .catch(err => console.error("Error adding subtask:", err))
    .finally(() => setIsSubmitting(false));
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const columnTitle = source.droppableId;
    const newItems = Array.from(columns[columnTitle]);
    const [reorderedItem] = newItems.splice(source.index, 1);
    newItems.splice(destination.index, 0, reorderedItem);

    const updatedColumns = {
      ...columns,
      [columnTitle]: newItems,
    };
    setColumns(updatedColumns);

    // Sync order
    let currentCategory = "";
    const taskMap = {};
    newItems.forEach((item, idx) => {
      if (item.isSectionTitle) {
        currentCategory = item.name;
      } else {
        taskMap[item.id] = { order: idx, category: currentCategory };
      }
    });

    if (isLocalMode) {
      const rows = getLocalData();
      rows.forEach(row => {
        if (row.id in taskMap) {
          row.order = String(taskMap[row.id].order);
          row.category = taskMap[row.id].category;
        }
      });
      saveLocalData(rows);
      return;
    }

    const tasksToSync = [];
    newItems.forEach((item, idx) => {
      if (item.isSectionTitle) {
        currentCategory = item.name;
      } else {
        tasksToSync.push({ id: item.id, category: currentCategory });
      }
    });

    fetch('http://127.0.0.1:8000/api/tasks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: tasksToSync })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        console.error("Failed to sync order:", data.error);
        fetchTasks(); // Rollback
      }
    })
    .catch(err => {
      console.error("Error syncing order:", err);
      fetchTasks(); // Rollback
    });
  };

  if (checkingAuth) {
    return (
      <div className="login-screen-container">
        <div className="login-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-screen-container">
        <div className="login-glass-card">
          <div className="login-header">
            <div className="login-logo-glow"></div>
            <h1>Taskade Clone</h1>
            <p>Secure Productivity Dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Enter password..." 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                required
              />
              <span className="input-border"></span>
            </div>
            {authError && <div className="login-error-message">{authError}</div>}
            <button type="submit" className="login-submit-btn">
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="cosmetic-header"></div>
      <div className="top-bar">
        <button 
          className="toggle-completed-btn" 
          onClick={() => setShowCompleted(!showCompleted)}
          title={showCompleted ? "Showing completed" : "Hiding completed"}
        >
          {showCompleted ? <EyeIcon /> : <EyeOffIcon />}
        </button>
        {process.env.REACT_APP_PASSWORD_HASH && (
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            title="Log Out"
          >
            Logout
          </button>
        )}
      </div>

      
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="dashboard-container">
          {Object.keys(columns).map((columnTitle) => (
            <div key={columnTitle} className="task-card">
              <h2>{columnTitle}</h2>

              <Droppable droppableId={columnTitle}>
                {(provided) => (
                  <div 
                    className="task-list"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {(() => {
                      let currentSection = null;
                      return columns[columnTitle].map((task, index) => {
                        if (task.isSectionTitle) {
                          currentSection = task.id;
                          const sectionId = `${columnTitle}-${task.id}`;
                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <div className="section-title-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '15px', marginBottom: '10px' }}>
                                    <h3 
                                        className="section-title" 
                                        onClick={() => toggleSection(columnTitle, task.id)}
                                        style={{ cursor: 'pointer', margin: 0 }}
                                    >
                                        {collapsedSections[sectionId] ? '▶' : '▼'} {task.name}
                                    </h3>
                                    <button 
                                        className="add-task-to-cat-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAddingToCategory(sectionId);
                                        }}
                                        style={{ background: 'transparent', border: '1px solid #555a61', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', padding: '0 8px', borderRadius: '4px', zIndex: 100, position: 'relative' }}
                                    >+</button>
                                  </div>
                                  {addingToCategory === sectionId && (
                                      <div className="add-task-form" style={{ marginTop: '0', marginBottom: '10px' }}>
                                        <div className="add-task-form-header">
                                          <span style={{ fontSize: '0.75rem', color: '#555a61' }}>Add to {task.name}</span>
                                          <div className="type-selectors">
                                            <button 
                                              className={`type-toggle-btn ${newTaskType === 'checklist' ? 'active' : ''}`}
                                              onClick={() => setNewTaskType('checklist')}
                                            >Check</button>
                                            <button 
                                              className={`type-toggle-btn ${newTaskType === 'progress' ? 'active' : ''}`}
                                              onClick={() => setNewTaskType('progress')}
                                            >Prog</button>
                                          </div>
                                        </div>
                                        <input 
                                          type="text" 
                                          autoFocus
                                          placeholder={newTaskType === 'progress' ? "Material/Progress name..." : "New task..."}
                                          value={newCategoryTaskName}
                                          onChange={(e) => setNewCategoryTaskName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddTaskInCategory(columnTitle, task.name);
                                            }
                                            if (e.key === 'Escape') {
                                              setAddingToCategory(null);
                                              setNewCategoryTaskName("");
                                              setNewTaskType("checklist");
                                            }
                                          }}
                                          onBlur={() => {
                                            if (!newCategoryTaskName.trim()) {
                                              setAddingToCategory(null);
                                              setNewTaskType("checklist");
                                            }
                                          }}
                                        />
                                      </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          );
                        }

                        // Ensure we use the currentSection correctly even if it's null (top level tasks)
                        if (currentSection && collapsedSections[`${columnTitle}-${currentSection}`]) {
                          // We still need to render the Draggable but hidden if we want to preserve indices?
                          // Actually, react-beautiful-dnd doesn't like items appearing/disappearing during drag.
                          // But here they are gone from the DOM.
                          return null;
                        }
                        const isTaskCompleted = task.is_done;
                        if (!showCompleted && isTaskCompleted) return null;

                        const progress = task.task_type === 'progress' 
                          ? Math.min(100, Math.max(0, (task.amount_now / task.amount_total) * 100))
                          : 0;

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div 
                                className={`task-group ${isTaskCompleted ? 'completed' : ''}`}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <div className="task-main-row">
                                  <label className={`task-item ${task.isAlert ? 'alert-text' : ''} ${isTaskCompleted ? 'completed' : ''}`}>
                                    <input 
                                      type="checkbox" 
                                      checked={isTaskCompleted}
                                      onChange={() => toggleTask(task.id, isTaskCompleted)}
                                    />
                                    <span className="checkmark"></span>
                                    <input 
                                        type="text" 
                                        id={`task-name-${task.id}`}
                                        name="task-name"
                                        className="task-name-input"
                                        value={task.name}
                                        onChange={(e) => handleTaskNameChange(columnTitle, task.id, e.target.value)}
                                        onBlur={() => renameTask(task.id, task.name)}
                                        onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                                    />
                                  </label>
                                  {task.task_type === 'progress' && (
                                    <div className="task-progress-controls">
                                      <input 
                                        type="number"
                                        className="progress-input"
                                        value={task.amount_now}
                                        onChange={(e) => handleLocalProgressChange(columnTitle, task.id, 'amount_now', e.target.value)}
                                        onBlur={() => handleUpdateProgress(task.id, parseInt(task.amount_now) || 0, parseInt(task.amount_total) || 1)}
                                        onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                                      />
                                      <span>/</span>
                                      <input 
                                        type="number"
                                        className="progress-total"
                                        value={task.amount_total}
                                        onChange={(e) => handleLocalProgressChange(columnTitle, task.id, 'amount_total', e.target.value)}
                                        onBlur={() => handleUpdateProgress(task.id, parseInt(task.amount_now) || 0, parseInt(task.amount_total) || 1)}
                                        onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                                      />
                                    </div>
                                  )}
                                  <div className="task-actions">
                                    <button 
                                      className="add-subtask-icon icon-btn" 
                                      onClick={() => setAddingSubtaskTo(task.id)}
                                      title="Add subtask"
                                    >
                                      +
                                    </button>
                                    <button 
                                      className="delete-item-btn icon-btn" 
                                      onClick={() => deleteTask(task.id)}
                                      title="Delete task"
                                    >
                                      <TrashIcon />
                                    </button>
                                  </div>
                                </div>
                                {task.task_type === 'progress' && (
                                  <div className="progress-container">
                                    <div 
                                      className={`progress-bar ${progress >= 100 ? 'completed' : ''}`}
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                )}
                                {task.subtasks && task.subtasks.map((sub) => {
                                  const isSubCompleted = sub.is_done;
                                  if (!showCompleted && isSubCompleted) return null;
                                  const subProgress = sub.task_type === 'progress' 
                                    ? Math.min(100, Math.max(0, (sub.amount_now / sub.amount_total) * 100))
                                    : 0;

                                  return (
                                    <div key={sub.id} className={`subtask-group ${isSubCompleted ? 'completed' : ''}`}>
                                      <div className="task-main-row subtask-row">
                                        <label className={`task-item subtask ${isSubCompleted ? 'completed' : ''}`}>
                                          <input 
                                            type="checkbox" 
                                            checked={isSubCompleted}
                                            onChange={() => toggleTask(sub.id, isSubCompleted)}
                                          />
                                          <span className="checkmark"></span>
                                          <input 
                                              type="text" 
                                              id={`subtask-name-${sub.id}`}
                                              name="subtask-name"
                                              className="task-name-input"
                                              value={sub.name}
                                              onChange={(e) => handleTaskNameChange(columnTitle, sub.id, e.target.value)}
                                              onBlur={() => renameTask(sub.id, sub.name)}
                                              onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                                          />
                                        </label>
                                        {sub.task_type === 'progress' && (
                                          <div className="task-progress-controls">
                                            <input 
                                              type="number"
                                              className="progress-input"
                                              value={sub.amount_now}
                                              onChange={(e) => handleLocalProgressChange(columnTitle, sub.id, 'amount_now', e.target.value)}
                                              onBlur={() => handleUpdateProgress(sub.id, parseInt(sub.amount_now) || 0, parseInt(sub.amount_total) || 1)}
                                              onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                                            />
                                            <span>/</span>
                                            <input 
                                              type="number"
                                              className="progress-total"
                                              value={sub.amount_total}
                                              onChange={(e) => handleLocalProgressChange(columnTitle, sub.id, 'amount_total', e.target.value)}
                                              onBlur={() => handleUpdateProgress(sub.id, parseInt(sub.amount_now) || 0, parseInt(sub.amount_total) || 1)}
                                              onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                                            />
                                          </div>
                                        )}
                                        <button 
                                          className="delete-item-btn icon-btn" 
                                          onClick={() => deleteTask(sub.id)}
                                          title="Delete subtask"
                                        >
                                          <TrashIcon />
                                        </button>
                                      </div>
                                      {sub.task_type === 'progress' && (
                                        <div className="progress-container" style={{ marginLeft: '63px' }}>
                                          <div 
                                            className={`progress-bar ${subProgress >= 100 ? 'completed' : ''}`}
                                            style={{ width: `${subProgress}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {addingSubtaskTo === task.id && (
                                <div className="add-task-form subtask-form">
                                  <div className="add-task-form-header">
                                    <span style={{ fontSize: '0.75rem', color: '#555a61' }}>Add subtask</span>
                                    <div className="type-selectors">
                                      <button 
                                        className={`type-toggle-btn ${newTaskType === 'checklist' ? 'active' : ''}`}
                                        onClick={() => setNewTaskType('checklist')}
                                      >Check</button>
                                      <button 
                                        className={`type-toggle-btn ${newTaskType === 'progress' ? 'active' : ''}`}
                                        onClick={() => setNewTaskType('progress')}
                                      >Prog</button>
                                    </div>
                                  </div>
                                  <input 
                                    type="text" 
                                    id={`new-subtask-in-task-${task.id}`}
                                    name="new-subtask-in-task"
                                    autoFocus
                                    placeholder="Subtask name..."
                                    value={newSubtaskName}
                                    onChange={(e) => setNewSubtaskName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleAddSubtask(columnTitle, task.name);
                                      if (e.key === 'Escape') {
                                        setAddingSubtaskTo(null);
                                        setNewSubtaskName("");
                                        setNewTaskType("checklist");
                                      }
                                    }}
                                    onBlur={() => {
                                      if (!newSubtaskName.trim()) {
                                        setAddingSubtaskTo(null);
                                        setNewTaskType("checklist");
                                      }
                                    }}
                                  />
                                </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      });
                    })()}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {addingToColumn === columnTitle ? (
                <div className="add-task-form">
                  <div className="add-task-form-header">
                    <span style={{ fontSize: '0.75rem', color: '#555a61' }}>Add to {columnTitle}</span>
                    <div className="type-selectors">
                      <button 
                        className={`type-toggle-btn ${newTaskType === 'checklist' ? 'active' : ''}`}
                        onClick={() => setNewTaskType('checklist')}
                      >Check</button>
                      <button 
                        className={`type-toggle-btn ${newTaskType === 'progress' ? 'active' : ''}`}
                        onClick={() => setNewTaskType('progress')}
                      >Prog</button>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    id={`new-task-in-col-${columnTitle}`}
                    name="new-task-in-col"
                    autoFocus
                    placeholder="Task name..."
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTask(columnTitle);
                      if (e.key === 'Escape') {
                        setAddingToColumn(null);
                        setNewTaskName("");
                        setNewTaskType("checklist");
                      }
                    }}
                    onBlur={() => {
                      if (!newTaskName.trim()) {
                        setAddingToColumn(null);
                        setNewTaskType("checklist");
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="add-task-btn" onClick={() => setAddingToColumn(columnTitle)}>
                  + Add Task
                </div>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export default App;
