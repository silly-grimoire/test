import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { processTasks, saveTasksToJSONBin, loadTasksFromJSONBin, DEFAULT_TODO_COLUMNS } from './jsonBinService';

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

/**
 * Reusable Todo Dashboard component for Kanban/checklist tasks with JSONBin sync.
 * @param {Object} props
 * @param {Object} props.config - JSONBin configuration.
 * @param {string} props.sourceName - Dashboard label (e.g. 'Warframe', 'Cleaning').
 * @param {Array<string>} [props.columnTitles=DEFAULT_TODO_COLUMNS] - Column headers.
 * @param {boolean} props.showCompleted - Toggle completed tasks visibility.
 * @param {boolean} props.autoSaveEnabled - Whether auto-saving is turned on.
 * @param {number} props.saveTrigger - Incrementing counter to trigger explicit saves.
 * @param {number} [props.resetTrigger=0] - Incrementing counter to reset all tasks to not done.
 * @param {React.ReactNode} [props.footer] - Optional footer content (e.g., CaviaTracker).
 */
export default function TodoDashboard({
  config,
  sourceName = 'Tasks',
  columnTitles = DEFAULT_TODO_COLUMNS,
  showCompleted = false,
  autoSaveEnabled = false,
  saveTrigger = 0,
  resetTrigger = 0,
  footer = null
}) {
  const [columns, setColumns] = useState(() => {
    const initial = {};
    columnTitles.forEach(col => {
      initial[col] = [];
    });
    return initial;
  });
  const [taskRows, setTaskRows] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [addingToColumn, setAddingToColumn] = useState(null);
  const [addingToCategory, setAddingToCategory] = useState(null);
  const [newCategoryTaskName, setNewCategoryTaskName] = useState("");
  const [addingSubtaskTo, setAddingSubtaskTo] = useState(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [newTaskType, setNewTaskType] = useState("checklist");

  const autoSaveRef = useRef(autoSaveEnabled);
  useEffect(() => {
    autoSaveRef.current = autoSaveEnabled;
  }, [autoSaveEnabled]);

  const saveLocalData = useCallback((rows) => {
    setTaskRows(rows);
    const processed = processTasks(rows, columnTitles);
    setColumns(processed);

    if (autoSaveRef.current) {
      saveTasksToJSONBin(rows, config, sourceName);
    }
  }, [columnTitles, config, sourceName]);

  // Initial load from JSONBin
  useEffect(() => {
    let isMounted = true;
    loadTasksFromJSONBin(config, sourceName)
      .then(rows => {
        if (!isMounted) return;
        setTaskRows(rows);
        setColumns(processTasks(rows, columnTitles));
      })
      .catch(err => {
        if (!isMounted) return;
        console.error(`TodoDashboard [${sourceName}]: Error loading tasks`, err);
        window.dispatchEvent(new CustomEvent('jsonbin-status', { 
          detail: { error: err.message, isFatal: true, source: sourceName } 
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [config, sourceName, columnTitles]);

  // Handle explicit save trigger (e.g., when Auto-Save toggle is switched ON)
  const prevSaveTriggerRef = useRef(saveTrigger);
  useEffect(() => {
    if (saveTrigger > prevSaveTriggerRef.current) {
      prevSaveTriggerRef.current = saveTrigger;
      if (taskRows.length > 0) {
        saveTasksToJSONBin(taskRows, config, sourceName);
      }
    }
  }, [saveTrigger, taskRows, config, sourceName]);

  // Handle explicit reset trigger (e.g., Reset button on cleaning tab)
  const prevResetTriggerRef = useRef(resetTrigger);
  useEffect(() => {
    if (resetTrigger > prevResetTriggerRef.current) {
      prevResetTriggerRef.current = resetTrigger;
      if (taskRows.length > 0) {
        const resetRows = taskRows.map(row => ({
          ...row,
          is_done: "FALSE",
          amount_now: row.task_type === 'progress' ? "0" : row.amount_now
        }));
        saveLocalData(resetRows);
      }
    }
  }, [resetTrigger, taskRows, saveLocalData]);

  const toggleSection = (columnTitle, sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [`${columnTitle}-${sectionId}`]: !prev[`${columnTitle}-${sectionId}`]
    }));
  };

  const renameTask = (taskId, newName) => {
    const rows = [...taskRows];
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
  };

  const handleTaskNameChange = (columnTitle, taskId, newName) => {
    const updatedColumns = { ...columns };
    const findAndUpdate = (list) => {
      list.forEach(task => {
        if (task.id === taskId) {
          task.name = newName;
        } else if (task.subtasks) {
          findAndUpdate(task.subtasks);
        }
      });
    };
    if (updatedColumns[columnTitle]) {
      findAndUpdate(updatedColumns[columnTitle]);
      setColumns(updatedColumns);
    }
  };

  const handleUpdateProgress = (taskId, amountNow, amountTotal) => {
    const rows = [...taskRows];
    rows.forEach(row => {
      if (row.id === taskId) {
        row.amount_now = String(amountNow);
        row.amount_total = String(amountTotal);
        if (parseInt(amountNow, 10) >= parseInt(amountTotal, 10)) {
          row.is_done = "TRUE";
          row.last_done_date = new Date().toISOString().split('T')[0];
        } else {
          row.is_done = "FALSE";
        }
      }
    });
    saveLocalData(rows);
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
    if (updatedColumns[columnTitle]) {
      findAndUpdate(updatedColumns[columnTitle]);
      setColumns(updatedColumns);
    }
  };

  const toggleTask = (taskId, currentState) => {
    const newState = !currentState;
    const rows = [...taskRows];
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
  };

  const deleteTask = (taskId) => {
    console.log(`TodoDashboard [${sourceName}]: Deleting task:`, taskId);
    const rows = taskRows.filter(r => r.id !== taskId);
    saveLocalData(rows);
  };

  const handleAddTask = (columnTitle) => {
    if (!newTaskName.trim()) return;

    const rows = [...taskRows];
    let maxOrder = -1;
    rows.forEach(r => {
      if (r.column === columnTitle && r.category === "") {
        maxOrder = Math.max(maxOrder, parseInt(r.order, 10) || 0);
      }
    });
    const newRow = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
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
  };

  const handleAddTaskInCategory = (columnTitle, category) => {
    if (!newCategoryTaskName.trim()) return;

    const rows = [...taskRows];
    let maxOrder = -1;
    rows.forEach(r => {
      if (r.column === columnTitle && r.category === category) {
        maxOrder = Math.max(maxOrder, parseInt(r.order, 10) || 0);
      }
    });
    const newRow = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
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
  };

  const handleAddSubtask = (columnTitle, parentName) => {
    if (!newSubtaskName.trim()) return;

    const rows = [...taskRows];
    let maxOrder = -1;
    rows.forEach(r => {
      if (r.column === columnTitle && r.is_subtask === "TRUE" && r.parent_task === parentName) {
        maxOrder = Math.max(maxOrder, parseInt(r.order, 10) || 0);
      }
    });
    const newRow = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
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
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const columnTitle = source.droppableId;
    const newItems = Array.from(columns[columnTitle] || []);
    const [reorderedItem] = newItems.splice(source.index, 1);
    newItems.splice(destination.index, 0, reorderedItem);

    const updatedColumns = {
      ...columns,
      [columnTitle]: newItems,
    };
    setColumns(updatedColumns);

    let currentCategory = "";
    const taskMap = {};
    newItems.forEach((item, idx) => {
      if (item.isSectionTitle) {
        currentCategory = item.name;
      } else {
        taskMap[item.id] = { order: idx, category: currentCategory };
      }
    });

    const rows = [...taskRows];
    rows.forEach(row => {
      if (row.id in taskMap) {
        row.order = String(taskMap[row.id].order);
        row.category = taskMap[row.id].category;
      }
    });
    saveLocalData(rows);
  };

  return (
    <>
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
                      return (columns[columnTitle] || []).map((task, index) => {
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

                        if (currentSection && collapsedSections[`${columnTitle}-${currentSection}`]) {
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
                                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                    />
                                  </label>
                                  {task.task_type === 'progress' && (
                                    <div className="task-progress-controls">
                                      <input 
                                        type="number"
                                        className="progress-input"
                                        value={task.amount_now}
                                        onChange={(e) => handleLocalProgressChange(columnTitle, task.id, 'amount_now', e.target.value)}
                                        onBlur={() => handleUpdateProgress(task.id, parseInt(task.amount_now, 10) || 0, parseInt(task.amount_total, 10) || 1)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                      />
                                      <span>/</span>
                                      <input 
                                        type="number"
                                        className="progress-total"
                                        value={task.amount_total}
                                        onChange={(e) => handleLocalProgressChange(columnTitle, task.id, 'amount_total', e.target.value)}
                                        onBlur={() => handleUpdateProgress(task.id, parseInt(task.amount_now, 10) || 0, parseInt(task.amount_total, 10) || 1)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
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
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                          />
                                        </label>
                                        {sub.task_type === 'progress' && (
                                          <div className="task-progress-controls">
                                            <input 
                                              type="number"
                                              className="progress-input"
                                              value={sub.amount_now}
                                              onChange={(e) => handleLocalProgressChange(columnTitle, sub.id, 'amount_now', e.target.value)}
                                              onBlur={() => handleUpdateProgress(sub.id, parseInt(sub.amount_now, 10) || 0, parseInt(sub.amount_total, 10) || 1)}
                                              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                            />
                                            <span>/</span>
                                            <input 
                                              type="number"
                                              className="progress-total"
                                              value={sub.amount_total}
                                              onChange={(e) => handleLocalProgressChange(columnTitle, sub.id, 'amount_total', e.target.value)}
                                              onBlur={() => handleUpdateProgress(sub.id, parseInt(sub.amount_now, 10) || 0, parseInt(sub.amount_total, 10) || 1)}
                                              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
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
      {footer && (
        <div className="dashboard-bottom-container">
          {footer}
        </div>
      )}
    </>
  );
}
