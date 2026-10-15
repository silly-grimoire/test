/**
 * Service for interfacing with JSONBin.io cloud database.
 */

/**
 * @typedef {Object} JsonBinConfig
 * @property {string} binId - The JSONBin Bin ID.
 * @property {string} apiKey - The master API key.
 * @property {string} accessKey - The optional access key.
 * @property {boolean} isEnabled - Whether JSONBin is properly configured.
 */

/**
 * Retrieves the JSONBin configuration for a specific tab/domain.
 * @param {'default'|'cleaning'} [binType='default']
 * @returns {JsonBinConfig}
 */
export const getJsonBinConfig = (binType = 'default') => {
  const envBinId = binType === 'cleaning'
    ? process.env.REACT_APP_JSONBIN_CLEANING_BIN_ID
    : process.env.REACT_APP_JSONBIN_BIN_ID;

  const envApiKey = (binType === 'cleaning' && process.env.REACT_APP_JSONBIN_CLEANING_API_KEY)
    ? process.env.REACT_APP_JSONBIN_CLEANING_API_KEY
    : process.env.REACT_APP_JSONBIN_API_KEY;

  const envAccessKey = (binType === 'cleaning' && process.env.REACT_APP_JSONBIN_CLEANING_ACCESS_KEY)
    ? process.env.REACT_APP_JSONBIN_CLEANING_ACCESS_KEY
    : process.env.REACT_APP_JSONBIN_ACCESS_KEY;

  const binId = envBinId || "";
  const apiKey = envApiKey || "";
  const accessKey = envAccessKey || "";
  const isEnabled = !!binId && !!apiKey;

  return { binId, apiKey, accessKey, isEnabled };
};

/**
 * Uploads task rows to JSONBin.
 * @param {Array<Object>} rows - Array of task rows.
 * @param {JsonBinConfig} config - JSONBin configuration.
 * @param {string} [sourceName='Tasks'] - Source identifier for logging and status events.
 * @returns {Promise<boolean>}
 */
export function saveTasksToJSONBin(rows, config, sourceName = 'Tasks') {
  if (!config || !config.isEnabled) {
    console.log(`saveTasksToJSONBin [${sourceName}]: JSONBin configuration is disabled or incomplete. Skipping upload.`);
    window.dispatchEvent(new CustomEvent('jsonbin-status', { 
      detail: { action: 'save_error', error: "JSONBin is not configured in Settings.", source: sourceName } 
    }));
    return Promise.resolve(false);
  }

  window.dispatchEvent(new CustomEvent('jsonbin-status', { detail: { action: 'save_start', source: sourceName } }));
  console.log(`saveTasksToJSONBin [${sourceName}]: Uploading ${rows.length} tasks to JSONBin (Bin ID: ${config.binId})...`);

  const headers = {
    'Content-Type': 'application/json',
    'X-Master-Key': config.apiKey
  };
  if (config.accessKey) {
    headers['X-Access-Key'] = config.accessKey;
  }

  return fetch(`https://api.jsonbin.io/v3/b/${config.binId}`, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(rows)
  })
  .then(res => {
    if (!res.ok) throw new Error("JSONBin save failed with status code " + res.status);
    return res.json();
  })
  .then(data => {
    console.log(`saveTasksToJSONBin [${sourceName}]: Tasks successfully synced with JSONBin. Response:`, data);
    window.dispatchEvent(new CustomEvent('jsonbin-status', { detail: { action: 'save_success', error: "", source: sourceName } }));
    return true;
  })
  .catch(err => {
    console.error(`saveTasksToJSONBin [${sourceName}]: Error syncing with JSONBin:`, err);
    window.dispatchEvent(new CustomEvent('jsonbin-status', { detail: { action: 'save_error', error: err.message, source: sourceName } }));
    return false;
  });
}

/**
 * Loads task rows from JSONBin.
 * @param {JsonBinConfig} config - JSONBin configuration.
 * @param {string} [sourceName='Tasks'] - Source identifier for logging and status events.
 * @returns {Promise<Array<Object>>}
 */
export function loadTasksFromJSONBin(config, sourceName = 'Tasks') {
  if (!config || !config.isEnabled) {
    console.log(`loadTasksFromJSONBin [${sourceName}]: JSONBin is not configured. Starting with empty task list.`);
    return Promise.resolve([]);
  }

  console.log(`loadTasksFromJSONBin [${sourceName}]: Fetching tasks from JSONBin cloud database (Bin ID: ${config.binId})...`);
  const headers = {
    'X-Master-Key': config.apiKey,
    'X-Bin-Meta': 'false'
  };
  if (config.accessKey) {
    headers['X-Access-Key'] = config.accessKey;
  }

  return fetch(`https://api.jsonbin.io/v3/b/${config.binId}`, {
    headers: headers
  })
  .then(res => {
    if (!res.ok) throw new Error("JSONBin fetch failed with status " + res.status);
    return res.json();
  })
  .then(data => {
    const raw = data.record || data;
    const rows = Array.isArray(raw) ? raw : [];
    console.log(`loadTasksFromJSONBin [${sourceName}]: Successfully fetched ${rows.length} tasks from JSONBin.`);
    window.dispatchEvent(new CustomEvent('jsonbin-status', { detail: { error: "", source: sourceName } }));
    return rows;
  });
}

export const DEFAULT_TODO_COLUMNS = ["Weeklies", "Dailies", "Other / long term", "Materials"];
export const CLEANING_COLUMNS = ["Kök", "Badrum", "Vardagsrum", "Korridor / garderob"];

const COLUMN_ALIASES = {
  "kitchen": "Kök",
  "kök": "Kök",
  "kok": "Kök",
  "bathroom": "Badrum",
  "badrum": "Badrum",
  "living room": "Vardagsrum",
  "livng room": "Vardagsrum",
  "vardagsrum": "Vardagsrum",
  "corridor / closet": "Korridor / garderob",
  "korridor / garderob": "Korridor / garderob",
  "hall / garderob": "Korridor / garderob",
  "closet": "Korridor / garderob",
  "hall": "Korridor / garderob"
};

/**
 * Formats and structures flat task rows into columns, auto-resetting recurring tasks.
 * @param {Array<Object>} rows - Raw task rows.
 * @param {Array<string>} [columnTitles=DEFAULT_TODO_COLUMNS] - Column headers for the dashboard.
 * @returns {Object<string, Array<Object>>}
 */
export function processTasks(rows, columnTitles = DEFAULT_TODO_COLUMNS) {
  const dashboard = {};
  columnTitles.forEach(col => {
    dashboard[col] = [];
  });

  if (!Array.isArray(rows)) {
    return dashboard;
  }

  const parseBoolean = (val) => val && String(val).toUpperCase() === "TRUE";

  // Auto-reset check
  const now = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  
  // Calculate last Monday
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const lastMonday = new Date(now.setDate(diff));
  lastMonday.setHours(0, 0, 0, 0);

  rows.forEach(row => {
    const isDone = parseBoolean(row.is_done);
    const lastDoneStr = row.last_done_date;
    const col = row.column;
    const isDaily = col === "Dailies" || (row.category && row.category.toLowerCase().includes("dail"));
    const isWeekly = col === "Weeklies" || (row.category && row.category.toLowerCase().includes("week"));
    
    if (isDone && lastDoneStr) {
      const parts = lastDoneStr.split('-');
      const lastDoneDate = new Date(parts[0], parts[1] - 1, parts[2]);
      lastDoneDate.setHours(0, 0, 0, 0);

      if (isDaily && lastDoneStr !== todayStr) {
        row.is_done = "FALSE";
        if (row.task_type === "progress") {
          row.amount_now = "0";
        }
      } else if (isWeekly && lastDoneDate < lastMonday) {
        row.is_done = "FALSE";
        if (row.task_type === "progress") {
          row.amount_now = "0";
        }
      }
    }
  });

  // Sort rows
  rows.sort((a, b) => {
    const colA = a.column || "";
    const colB = b.column || "";
    const catA = a.category || "";
    const catB = b.category || "";
    const ordA = parseInt(a.order, 10) || 0;
    const ordB = parseInt(b.order, 10) || 0;
    if (colA !== colB) return colA.localeCompare(colB);
    if (catA !== catB) return catA.localeCompare(catB);
    return ordA - ordB;
  });

  const currentSections = {};
  columnTitles.forEach(col => {
    currentSections[col] = null;
  });
  const parentRegistry = {};

  // Helper to resolve row column to one of dashboard keys (case-insensitive + handling aliases & typos)
  const resolveColumn = (colName) => {
    if (!colName) return null;
    const cleanCol = colName.trim().toLowerCase();
    
    // Direct match against active dashboard columns
    const directMatch = columnTitles.find(c => c.toLowerCase() === cleanCol);
    if (directMatch) return directMatch;

    // Alias mapping
    if (COLUMN_ALIASES[cleanCol]) {
      const aliasTarget = COLUMN_ALIASES[cleanCol];
      const match = columnTitles.find(c => c.toLowerCase() === aliasTarget.toLowerCase());
      if (match) return match;
    }

    return null;
  };

  rows.forEach((row, idx) => {
    const col = resolveColumn(row.column);
    const taskName = row.task_name;
    const isSubtask = parseBoolean(row.is_subtask);
    const isAlert = parseBoolean(row.is_alert);
    const isDone = parseBoolean(row.is_done);
    const category = row.category;
    const taskType = row.task_type || "checklist";
    const amountNow = parseInt(row.amount_now, 10) || 0;
    const amountTotal = parseInt(row.amount_total, 10) || 1;
    const order = parseInt(row.order, 10) || 0;

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
    const col = resolveColumn(row.column);
    const taskName = row.task_name;
    const isSubtask = parseBoolean(row.is_subtask);
    const parentName = row.parent_task;
    const isAlert = parseBoolean(row.is_alert);
    const isDone = parseBoolean(row.is_done);
    const taskType = row.task_type || "checklist";
    const amountNow = parseInt(row.amount_now, 10) || 0;
    const amountTotal = parseInt(row.amount_total, 10) || 1;
    const order = parseInt(row.order, 10) || 0;

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
