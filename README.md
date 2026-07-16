# A Random App

A secure, local-first productivity dashboard to organize tasks across multiple time horizons with a clean, dark-themed interface, client-side encryption, and optional cloud synchronization.

## 🚀 Features

- **Multi-Column Layout:** Organizes tasks into "Weeklies", "Dailies", "Other / long term", and "Materials".
- **Interactive Task Hierarchy:** Supports draggable sections, parent tasks, and subtasks.
- **Draggable Reordering:** Seamless drag-and-drop task reordering powered by `@hello-pangea/dnd`.
- **Secure Client-Side Encryption:** Protects task data using the native browser Web Crypto API (PBKDF2 key derivation and 256-bit AES-GCM encryption).
- **Flexible Storage & Cloud Sync:** Stores data locally in the browser (`localStorage`) or synchronizes to a cloud database using [JSONBin.io](https://jsonbin.io/).
- **Smart Auto-Reset:** Auto-resets "Dailies" every day and "Weeklies" every Monday based on completion logs.
- **Progress Tracking:** Supports checklist items as well as numeric progress trackers (e.g., tracking a target count).
- **Modern Aesthetic:** Dark-themed dashboard built with custom HSL hued styling, glassmorphism card components, and smooth micro-animations.

## 🛠️ Tech Stack

- **Frontend Framework:** [React 19](https://reactjs.org/) (built using Create React App template)
- **Styling & UI:** [React-Bootstrap 2.10](https://react-bootstrap.github.io/), Vanilla CSS with dynamic custom properties
- **Drag & Drop:** [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- **Security:** Web Crypto API (AES-GCM, PBKDF2, SHA-256)

## 📂 Project Structure

```text
├── frontend/
│   ├── src/             # React components, styles, and utils
│   │   ├── App.js       # Core application logic and UI
│   │   ├── App.css      # Custom dashboard CSS
│   │   ├── cryptoUtils.js # AES-GCM encryption helper functions
│   │   └── api.js       # Axios base configuration
│   ├── public/          # Static template assets
│   └── package.json     # Frontend dependencies
├── index.html           # Production build entrypoint
├── static/              # Compiled build assets (JS, CSS, Media)
├── .env                 # Environment variables configuration
└── README.md            # Project documentation
```

## ⚙️ Setup Instructions

### Prerequisites

- Node.js & npm

### Configuration

Copy `.env.example` to `.env` in the root (and/or `frontend/.env`) and configure the variables:

```env
# SHA-256 Hash of the password required to unlock the dashboard.
# Leave blank or omit this variable to disable authentication locally.
REACT_APP_PASSWORD_HASH="your-sha256-hash-here"

# JSONBin Configuration (to use JSONBin as a permanent cloud database instead of localStorage)
REACT_APP_JSONBIN_BIN_ID="your-bin-id"
REACT_APP_JSONBIN_API_KEY="your-api-key"
REACT_APP_JSONBIN_ACCESS_KEY="your-access-key"
```

### Running Locally

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```
   The application will be accessible at `http://localhost:3000`.

4. Build for production:
   ```bash
   npm run build
   ```
   *Note: The production build output is configured to compile directly into the root repository directory.*

## 📊 Data Schema

Tasks are stored as a JSON array of row objects. Each object conforms to the following schema:

- `id`: A unique task identifier.
- `column`: Dashboard column ("Weeklies", "Dailies", "Other / long term", "Materials").
- `category`: Section header or parent task name.
- `task_name`: The name/description of the task.
- `is_subtask`: Boolean string (`"TRUE"`/`"FALSE"`) indicating if it's a subtask.
- `parent_task`: The name of the parent task (if `is_subtask` is `"TRUE"`).
- `is_alert`: Boolean string (`"TRUE"`/`"FALSE"`) for highlighting the task.
- `is_done`: Boolean string (`"TRUE"`/`"FALSE"`) for task completion state.
- `task_type`: `"checklist"` or `"progress"`.
- `amount_now`: Numeric current progress (when `task_type` is `"progress"`).
- `amount_total`: Numeric target progress (when `task_type` is `"progress"`).
- `last_done_date`: Date string (`YYYY-MM-DD`) tracking when the task was last completed (used for auto-resets).
- `order`: Integer order key for sorting.

## 📝 License

MIT
