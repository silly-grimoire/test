import React, { useEffect, useState, useRef, useMemo } from 'react';
import './App.css';
import './eink.css';
import './TennobetFont.css';
import { hashPassword } from './cryptoUtils';
import RandomPic from './RandomPic';
import CaviaTracker from './CaviaTracker';
import TodoDashboard from './TodoDashboard';
import { getJsonBinConfig, CLEANING_COLUMNS } from './jsonBinService';

document.body.className = localStorage.getItem('eink_mode') === 'true' ? 'eink-theme' : 'dark-theme'; // Initial body theme

const EyeIcon = () => (
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

const FloppyIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

const CloudSyncIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
    <polyline points="9 15 12 18 17 13"></polyline>
  </svg>
);

const SyncSpinIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin-icon">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
  </svg>
);

const ContrastIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"></path>
  </svg>
);

const LogoutIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const TodoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
);

const CleaningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 9.5 20 3"></path>
    <path d="m11 12 2 2"></path>
    <path d="M3 21c1-4 3.5-6.5 7.5-8l3 3c-1.5 4-4 6.5-8 7.5a1.5 1.5 0 0 1-2.5-2.5Z"></path>
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

function App() {
  const [isEinkMode, setIsEinkMode] = useState(() => localStorage.getItem('eink_mode') === 'true');

  useEffect(() => {
    if (isEinkMode) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('eink-theme');
    } else {
      document.body.classList.remove('eink-theme');
      document.body.classList.add('dark-theme');
    }
    localStorage.setItem('eink_mode', isEinkMode);
  }, [isEinkMode]);

  const [showCompleted, setShowCompleted] = useState(false);

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (!process.env.REACT_APP_PASSWORD_HASH) return true;
    return localStorage.getItem('is_authenticated') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(() => {
    if (!process.env.REACT_APP_PASSWORD_HASH) return false;
    return localStorage.getItem('is_authenticated') !== 'true';
  });

  useEffect(() => {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (isAuthenticated) {
      document.title = 'Todo app or something';
      link.href = (process.env.PUBLIC_URL || '.') + '/favicon_app.ico';
    } else {
      document.title = '\u200E';
      link.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>";
    }
  }, [isAuthenticated]);
  
  const [dbError, setDbError] = useState("");
  const [fatalDbError, setFatalDbError] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#/cleaning' || hash === '#/stadning') {
      return 'cleaning';
    }
    if (hash === '#/randimgs' || hash === '#/random-pic') {
      return 'random-pic';
    }
    return 'todo';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/cleaning' || hash === '#/stadning') {
        setActiveTab('cleaning');
      } else if (hash === '#/randimgs' || hash === '#/random-pic') {
        setActiveTab('random-pic');
      } else {
        setActiveTab('todo');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) {
      window.location.hash = '#/';
    } else {
      handleHashChange();
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [cleaningResetTrigger, setCleaningResetTrigger] = useState(0);
  const autoSaveRef = useRef(false);

  useEffect(() => {
    autoSaveRef.current = autoSaveEnabled;
  }, [autoSaveEnabled]);

  const handleToggleAutoSave = () => {
    const nextState = !autoSaveEnabled;
    setAutoSaveEnabled(nextState);
    autoSaveRef.current = nextState;

    if (nextState) {
      setSaveTrigger(prev => prev + 1);
    } else {
      setToast({ message: 'Auto-Save turned OFF', type: 'info' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleResetCleaningTasks = () => {
    if (window.confirm("Are you sure you want to reset all cleaning tasks to not done?")) {
      setCleaningResetTrigger(prev => prev + 1);
      setToast({ message: 'All cleaning tasks have been reset to not done.', type: 'info' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  useEffect(() => {
    let toastTimer;
    const handleStatus = (e) => {
      const { action, error, isFatal, source } = e.detail || {};
      const prefix = source ? `[${source}] ` : '';

      if (action === 'save_start') {
        setIsSaving(true);
        setToast({ message: `${prefix}Saving tasks to JSONBin...`, type: 'info' });
      } else if (action === 'save_success') {
        setIsSaving(false);
        const msg = autoSaveRef.current ? `${prefix}Auto-Save: Synced to JSONBin!` : `${prefix}Successfully saved to JSONBin!`;
        setToast({ message: msg, type: 'success' });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setToast(null), 3000);
      } else if (action === 'save_error') {
        setIsSaving(false);
        const msg = error ? (
          error.includes("401") ? "Unauthorized (401). Check API Key in Settings." :
          error.includes("404") ? "Bin Not Found (404). Check Bin ID in Settings." :
          error
        ) : "Unknown save error";
        setToast({ message: `${prefix}Save Failed: ` + msg, type: 'error' });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setToast(null), 4000);
      } else if (error) {
        let msg = "";
        if (error.includes("status 401") || error.includes("status code 401")) {
          msg = "Database Sync Error: Unauthorized (401). Please check your API Key in Settings.";
        } else if (error.includes("status 404") || error.includes("status code 404")) {
          msg = "Database Sync Error: Bin Not Found (404). Please check your Bin ID in Settings.";
        } else {
          msg = `Database Sync Error: ${error}`;
        }
        if (isFatal) {
          setFatalDbError(msg);
        } else {
          setDbError(msg);
        }
      } else {
        setDbError("");
        setFatalDbError("");
      }
    };
    window.addEventListener('jsonbin-status', handleStatus);
    return () => {
      window.removeEventListener('jsonbin-status', handleStatus);
      clearTimeout(toastTimer);
    };
  }, []);

  const warframeConfig = useMemo(() => getJsonBinConfig('default'), []);
  const cleaningConfig = useMemo(() => getJsonBinConfig('cleaning'), []);

  useEffect(() => {
    const checkAuthentication = async () => {
      const requiredHash = process.env.REACT_APP_PASSWORD_HASH;
      if (!requiredHash || localStorage.getItem('is_authenticated') === 'true') {
        setIsAuthenticated(true);
      }
      setCheckingAuth(false);
    };
    checkAuthentication();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    const requiredHash = process.env.REACT_APP_PASSWORD_HASH;
    if (!requiredHash) {
      setIsAuthenticated(true);
      localStorage.setItem('is_authenticated', 'true');
      return;
    }

    try {
      const hashedInput = await hashPassword(passwordInput);
      if (hashedInput === requiredHash || passwordInput === requiredHash) {
        setIsAuthenticated(true);
        localStorage.setItem('is_authenticated', 'true');
        setPasswordInput("");
      } else {
        setAuthError("Incorrect password. Please try again.");
      }
    } catch (err) {
      console.error("Hashing failed:", err);
      setAuthError("An error occurred during authentication.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('is_authenticated');
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


          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <input 
                type="text"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                required
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
              />
              <span className="input-border"></span>
              <button type="submit" className="login-submit-circle-btn" title="Unlock" aria-label="Unlock">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 8 16 12 12 16"></polyline>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </button>
            </div>
            {authError && <div className="login-error-message">{authError}</div>}
          </form>

      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="cosmetic-header"></div>
      <div className="top-bar">
        <div className="tab-container">
          <button 
            className={`tab-btn ${activeTab === 'todo' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('todo');
              window.location.hash = '#/';
            }}
            title="Todo List"
            aria-label="Todo List"
          >
            <span className="tab-icon"><TodoIcon /></span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'cleaning' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('cleaning');
              window.location.hash = '#/stadning';
            }}
            title="Städning"
            aria-label="Städning"
          >
            <span className="tab-icon"><CleaningIcon /></span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'random-pic' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('random-pic');
              window.location.hash = '#/random-pic';
            }}
            title="Random Images"
            aria-label="Random Images"
          >
            <span className="tab-icon"><ImageIcon /></span>
          </button>
        </div>
        {(activeTab === 'todo' || activeTab === 'cleaning') && (
          <>
            <button 
              className={`save-toggle-btn ${autoSaveEnabled ? 'active' : ''} ${isSaving ? 'saving' : ''}`}
              onClick={handleToggleAutoSave}
              title={autoSaveEnabled ? "Auto-Save is ON. Click to turn OFF." : "Auto-Save is OFF. Click to turn ON and sync once to JSONBin."}
              aria-label={autoSaveEnabled ? "Auto-Save is ON" : "Auto-Save is OFF"}
            >
              {isSaving ? <SyncSpinIcon /> : autoSaveEnabled ? <CloudSyncIcon /> : <FloppyIcon />}
            </button>
            <button 
              className="toggle-completed-btn" 
              onClick={() => setShowCompleted(!showCompleted)}
              title={showCompleted ? "Showing completed" : "Hiding completed"}
              aria-label={showCompleted ? "Hide completed" : "Show completed"}
            >
              {showCompleted ? <EyeIcon /> : <EyeOffIcon />}
            </button>
            {activeTab === 'cleaning' && (
              <button 
                className="reset-btn" 
                onClick={handleResetCleaningTasks}
                title="Reset all tasks to not done"
              >
                🔄 Reset
              </button>
            )}
          </>
        )}
        <button 
          className="settings-btn" 
          onClick={() => setIsEinkMode(!isEinkMode)}
          title={isEinkMode ? "Switch to standard theme" : "Switch to E-ink High Contrast theme"}
          aria-label={isEinkMode ? "Switch to standard theme" : "Switch to E-ink High Contrast theme"}
        >
          <ContrastIcon />
        </button>

        {process.env.REACT_APP_PASSWORD_HASH && (
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            title="Log Out"
            aria-label="Log Out"
          >
            <LogoutIcon />
          </button>
        )}
      </div>

      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span>
            {toast.type === 'success' && '✅ '}
            {toast.type === 'error' && '❌ '}
            {toast.type === 'info' && '⏳ '}
            {toast.message}
          </span>
          <button onClick={() => setToast(null)} title="Close">×</button>
        </div>
      )}

      {dbError && (
        <div className="db-error-banner">
          <span>⚠️ {dbError}</span>
          <button onClick={() => setDbError("")} title="Dismiss">×</button>
        </div>
      )}

      {fatalDbError ? (
        <div className="fatal-error-screen" style={{ textAlign: 'center', marginTop: '100px', color: '#ff6b6b' }}>
          <h2>Failed to load database</h2>
          <p>{fatalDbError}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', cursor: 'pointer', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', marginTop: '20px' }}>Retry</button>
        </div>
      ) : (
        <>
          <div style={{ display: activeTab === 'todo' ? 'block' : 'none' }}>
            <TodoDashboard 
              config={warframeConfig}
              sourceName="Warframe"
              showCompleted={showCompleted}
              autoSaveEnabled={autoSaveEnabled}
              saveTrigger={saveTrigger}
              footer={<CaviaTracker />}
            />
          </div>

          <div style={{ display: activeTab === 'cleaning' ? 'block' : 'none' }}>
            <TodoDashboard 
              config={cleaningConfig}
              sourceName="Cleaning"
              columnTitles={CLEANING_COLUMNS}
              showCompleted={showCompleted}
              autoSaveEnabled={autoSaveEnabled}
              saveTrigger={saveTrigger}
              resetTrigger={cleaningResetTrigger}
            />
          </div>

          {activeTab === 'random-pic' && <RandomPic />}
        </>
      )}
    </div>
  );
}

export default App;
