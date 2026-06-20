import { useState, useEffect } from 'react'
import { useChat } from './hooks/useChat.js'
import Sidebar from './components/Sidebar.jsx'
import ChatInterface from './components/ChatInterface.jsx'
import CoreMetrics from './components/CoreMetrics.jsx'

/**
 * AuthScreen - Handles Login and Signup card interfaces.
 */
function AuthScreen({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [rmId, setRmId] = useState('RM001')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please fill in username and password.')
      return
    }
    setError('')
    setLoading(true)

    const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/signup'
    const body = isLogin 
      ? { username, password }
      : { username, password, full_name: fullName, email, assigned_rm_id: rmId }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.detail || 'Authentication failed') })
        }
        return res.json()
      })
      .then(user => {
        localStorage.setItem('user', JSON.stringify(user))
        onLoginSuccess(user)
      })
      .catch(err => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{
          background: 'var(--accent-red)',
          color: '#000000',
          textAlign: 'center',
          fontWeight: '900',
          fontSize: '0.75rem',
          padding: '6px 12px',
          border: 'var(--border-solid)',
          marginBottom: 'var(--space-md)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          ☢ SECURE AGENT LOGIN REQUIRED ☢
        </div>
        <div className="auth-logo-icon">🏦</div>
        <h2>{isLogin ? 'CRM CORE LOGIN' : 'CREATE AGENT ACCOUNT'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Access the Relationship Manager command center' : 'Create a new RM control account'}
        </p>

        {error && (
          <div className="auth-error">
            <span>⚠️ ERROR_LOG:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>👤 AGENT_ID / USERNAME</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="e.g. suryanarayan, rm001"
              required 
            />
          </div>

          <div className="form-group">
            <label>🔑 KEYPASS / PASSWORD</label>
            <div className="password-input-wrapper" style={{ position: 'relative', display: 'flex', width: '100%' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)'
                }}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>📛 FULL NAME</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  placeholder="e.g. Suryanarayan Biswal"
                  required 
                />
              </div>

              <div className="form-group">
                <label>📧 EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="e.g. cchiku1999@gmail.com"
                />
              </div>

              <div className="form-group">
                <label>🎖 ASSIGNED RM TIER</label>
                <select value={rmId} onChange={e => setRmId(e.target.value)}>
                  <option value="RM001">RM001 (Main segment)</option>
                  <option value="RM002">RM002 (Regional)</option>
                  <option value="RM003">RM003 (Premium)</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'INITIALIZING ACCESS...' : (isLogin ? 'DECRYPT & LOG IN' : 'REGISTER NEW AGENT')}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "NEW RELATIONSHIP MANAGER? " : "ALREADY REGISTERED? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-btn">
            {isLogin ? 'CREATE PROFILE' : 'LOG IN DIRECTLY'}
          </button>
        </div>

        {isLogin && (
          <div className="demo-credentials">
            <p style={{ textTransform: 'uppercase', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>🔑 DEMO_CREDENTIALS</span>
              <span style={{ color: 'var(--accent-pink)' }}>[TEST_ACTIVE]</span>
            </p>
            <div>USER: <code>suryanarayan</code> | PASS: <code>password</code></div>
            <div style={{ marginTop: '2px' }}>USER: <code>rm001</code> | PASS: <code>password</code></div>
            <div style={{ marginTop: '2px' }}>USER: <code>cchiku1999@gmail.com</code> | PASS: <code>Demo@123</code></div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Root application component.
 * Layout: Login screen OR Sidebar + Chat Area
 */
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const { 
    messages, 
    isLoading, 
    connectionStatus, 
    threads,
    threadId,
    setThreadId,
    sendMessage, 
    newChat,
    deleteThread
  } = useChat(user)
  
  // Defaulting theme to light mode
  const theme = 'light'

  // URL path-based state routing
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  
  // Logout confirmation modal state
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  
  // Fullscreen and System Logs State
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [logs, setLogs] = useState([])

  const fetchLogs = () => {
    if (!user?.id) return
    fetch(`/api/v1/chat/logs?user_id=${user.id}&limit=20`)
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => setLogs(data || []))
      .catch(() => setLogs([]))
  }

  // Fetch logs telemetry automatically in the background
  useEffect(() => {
    if (user && logsOpen) {
      fetchLogs()
      const interval = setInterval(fetchLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [user, threadId, logsOpen])

  // Track fullscreen state change
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullScreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange)
  }, [])

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Listen to popstate (back/forward browser navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Helper for navigating/updating url path
  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }

  // Redirect unrecognized paths on load
  useEffect(() => {
    const validPaths = [
      '/v1/agent/ask',
      '/v1/datasource/customer',
      '/v1/datasource/aitools',
      '/v1/datasource/products',
      '/v1/datasource/apis'
    ]
    if (!validPaths.includes(window.location.pathname)) {
      window.history.replaceState({}, '', '/v1/agent/ask')
      setCurrentPath('/v1/agent/ask')
    }
  }, [])

  // Map path to view string
  let currentView = 'chat'
  if (currentPath === '/v1/datasource/customer') currentView = 'customers'
  else if (currentPath === '/v1/datasource/aitools') currentView = 'aitools'
  else if (currentPath === '/v1/datasource/products') currentView = 'products'
  else if (currentPath === '/v1/datasource/apis') currentView = 'apis'

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.setItem('theme', 'light')
  }, [])

  const handleLogout = () => {
    setLogoutConfirmOpen(true)
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={setUser} />
  }

  return (
    <div className="app-layout">
      <Sidebar 
        user={user}
        threads={threads}
        currentThreadId={threadId}
        onSelectThread={(tId) => { setThreadId(tId); navigate('/v1/agent/ask'); }}
        onDeleteThread={deleteThread}
        onSendMessage={sendMessage} 
        onNewChat={() => { newChat(); navigate('/v1/agent/ask'); }} 
        onLogout={handleLogout}
        currentPath={currentPath}
        onNavigate={navigate}
      />
      
      <div className="main-content-pane">
        {/* Unified Top Navbar / Dataview & Controls */}
        <div className="dataview-navbar">
          <div className="nav-tabs-wrapper">
            <button 
              className={`nav-tab ${currentView === 'chat' ? 'active' : ''}`} 
              onClick={() => navigate('/v1/agent/ask')}
            >
              💬 CHAT CONSOLE
            </button>
            <button 
              className={`nav-tab ${currentView === 'customers' ? 'active' : ''}`} 
              onClick={() => navigate('/v1/datasource/customer')}
            >
              👤 CUSTOMER DIRECTORY
            </button>
            <button 
              className={`nav-tab ${currentView === 'aitools' ? 'active' : ''}`} 
              onClick={() => navigate('/v1/datasource/aitools')}
            >
              🤖 AI AGENT TOOLS
            </button>
            <button 
              className={`nav-tab ${currentView === 'products' ? 'active' : ''}`} 
              onClick={() => navigate('/v1/datasource/products')}
            >
              📦 PRODUCT CATALOG
            </button>
            <button 
              className={`nav-tab ${currentView === 'apis' ? 'active' : ''}`} 
              onClick={() => navigate('/v1/datasource/apis')}
            >
              📡 CORE REST APIs
            </button>
          </div>

          <div className="nav-actions-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <button 
              type="button"
              className="fullscreen-btn"
              onClick={() => setLogsOpen(true)}
              title="VIEW SYSTEM CONSOLE LOGS"
              style={{
                background: 'var(--bg-secondary)',
                padding: '6px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              📟 VIEW_LOGS
            </button>
            <button 
              type="button"
              className="fullscreen-btn"
              onClick={toggleFullScreen}
              title="TOGGLE FULLSCREEN"
              style={{
                background: 'var(--bg-secondary)',
                padding: '6px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              🖥️ {isFullScreen ? 'EXIT_FULLSCREEN' : 'GO_FULLSCREEN'}
            </button>
            <div className="connection-status">
              <div className={`connection-dot ${connectionStatus}`}></div>
              {connectionStatus === 'connected' ? 'SYS_STATUS: ONLINE' :
               connectionStatus === 'connecting' ? 'SYS_STATUS: CONNECTING...' : 'SYS_STATUS: OFFLINE'}
            </div>
          </div>
        </div>

        <div className="view-container">
          {currentView === 'chat' ? (
            <ChatInterface
              user={user}
              threadId={threadId}
              messages={messages}
              isLoading={isLoading}
              connectionStatus={connectionStatus}
              onSendMessage={sendMessage}
            />
          ) : (
            <CoreMetrics 
              activeTab={currentView} 
              onSelectTab={(tab) => navigate(`/v1/datasource/${tab === 'customers' ? 'customer' : tab}`)} 
              user={user} 
            />
          )}
        </div>
      </div>

      {/* Global Logs Popup Modal */}
      {logsOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--space-md)'
        }} onClick={() => setLogsOpen(false)}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: 'var(--border-solid)',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '650px',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh'
          }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              background: 'var(--accent-pink)',
              color: '#000000',
              padding: 'var(--space-md)',
              borderBottom: 'var(--border-solid)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: '900', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                📟 SESSION_LOGS_CONSOLE
              </span>
              <button 
                type="button"
                onClick={() => setLogsOpen(false)}
                style={{
                  background: '#ffffff',
                  border: 'var(--border-solid)',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  boxShadow: '2px 2px 0px #000000',
                  color: '#000000'
                }}
              >
                ✖
              </button>
            </div>
            {/* Modal Content */}
            <div style={{
              padding: 'var(--space-md)',
              overflowY: 'auto',
              flex: 1,
              background: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)'
            }}>
              {logs.length > 0 ? (
                (() => {
                  const filteredLogs = logs.filter(log => log.thread_id === threadId)
                  if (filteredLogs.length === 0) {
                    return <div className="no-logs">No execution logs recorded for this active thread.</div>
                  }
                  return filteredLogs.map(log => (
                    <div key={log.id} className="log-item" style={{
                      padding: 'var(--space-sm)',
                      background: 'var(--bg-card)',
                      border: 'var(--border-solid)',
                      boxShadow: '2px 2px 0px #000',
                      marginBottom: 'var(--space-sm)'
                    }}>
                      <div className="log-query" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>SYS_IN: "{log.query}"</div>
                      <div className="log-tokens" style={{ display: 'flex', gap: '8px', margin: '4px 0' }}>
                        <span className="token-badge input" style={{ fontSize: '0.65rem', background: 'var(--accent-yellow)', padding: '2px 6px', border: '1px solid #000' }}>IN: {log.token_count_input}</span>
                        <span className="token-badge output" style={{ fontSize: '0.65rem', background: 'var(--accent-cyan)', padding: '2px 6px', border: '1px solid #000' }}>OUT: {log.token_count_output}</span>
                        <span className="token-badge total" style={{ fontSize: '0.65rem', background: 'var(--accent-lime)', padding: '2px 6px', border: '1px solid #000', fontWeight: 'bold' }}>TOT: {log.total_tokens}</span>
                      </div>
                      <div className="log-flow" style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                        {log.execution_flow && log.execution_flow.length > 0 ? (
                          log.execution_flow.map((step, sIdx) => (
                            <span key={sIdx} className="flow-step-tag">
                              {step.name}
                              {sIdx < log.execution_flow.length - 1 ? ' ➔ ' : ''}
                            </span>
                          ))
                        ) : (
                          <span className="flow-empty">DIRECT_RESPONSE</span>
                        )}
                      </div>
                      <div className="log-time" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  ))
                })()
              ) : (
                <div className="no-logs">Console buffer empty.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Centered Brutalist Logout Confirmation Modal */}
      {logoutConfirmOpen && (
        <div className="brutalist-modal-overlay" onClick={() => setLogoutConfirmOpen(false)}>
          <div className="brutalist-modal-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-banner" style={{ background: 'var(--accent-red)' }}>
              <h3 style={{ margin: 0 }}>⚠️ DISCONNECT SESSION</h3>
              <button className="modal-close-btn" onClick={() => setLogoutConfirmOpen(false)}>✖</button>
            </div>
            <div className="modal-form" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.5' }}>
                Are you sure you want to disconnect and terminate your Relationship Manager session?
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '8px', border: '1px solid #000', borderRadius: '4px', marginBottom: '8px' }}>
                All active conversation threads and session tokens will be cleared.
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="modal-submit-btn-neo" 
                  style={{ background: 'var(--accent-red)', marginTop: 0, flex: 1 }}
                  onClick={() => {
                    setLogoutConfirmOpen(false)
                    localStorage.removeItem('user')
                    setUser(null)
                    newChat()
                    navigate('/v1/agent/ask')
                  }}
                >
                  🔌 DISCONNECT
                </button>
                <button 
                  type="button" 
                  className="cancel-btn-neo" 
                  style={{ marginTop: 0, flex: 1 }}
                  onClick={() => setLogoutConfirmOpen(false)}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
