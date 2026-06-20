import { useState, useEffect } from 'react'
import { useChat } from './features/chat/hooks/useChat.js'
import Sidebar from './components/layout/Sidebar.jsx'
import AppLogo from './components/layout/AppLogo.jsx'
import ChatInterface from './features/chat/components/ChatInterface.jsx'
import CustomerDirectory from './features/dashboard/components/CustomerDirectory.jsx'
import AgentTools from './features/dashboard/components/AgentTools.jsx'
import ProductCatalog from './features/dashboard/components/ProductCatalog.jsx'
import ApiEndpoints from './features/dashboard/components/ApiEndpoints.jsx'
import Login from './features/auth/components/Login.jsx'
import Signup from './features/auth/components/Signup.jsx'

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
  
  // Sidebar state for mobile layout
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
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

  // Redirect and guard routing based on auth state
  useEffect(() => {
    const path = window.location.pathname
    if (!user) {
      if (path !== '/v1/auth/login' && path !== '/v1/auth/register') {
        window.history.replaceState({}, '', '/v1/auth/login')
        setCurrentPath('/v1/auth/login')
      }
    } else {
      const validPaths = [
        '/v1/agent/ask',
        '/v1/datasource/customer',
        '/v1/datasource/aitools',
        '/v1/datasource/products',
        '/v1/datasource/apis'
      ]
      if (path === '/v1/auth/login' || path === '/v1/auth/register' || !validPaths.includes(path)) {
        window.history.replaceState({}, '', '/v1/agent/ask')
        setCurrentPath('/v1/agent/ask')
      }
    }
  }, [user, currentPath])

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
    if (currentPath === '/v1/auth/register') {
      return <Signup onLoginSuccess={setUser} onToggleMode={() => navigate('/v1/auth/login')} />
    } else {
      return <Login onLoginSuccess={setUser} onToggleMode={() => navigate('/v1/auth/register')} />
    }
  }

  return (
    <div className={`flex h-dvh w-full relative bg-[radial-gradient(var(--color-text-muted)_1px,transparent_1px)] bg-[size:24px_24px] overflow-hidden ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[999]" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar 
        user={user}
        threads={threads}
        currentThreadId={threadId}
        onSelectThread={(tId) => { setThreadId(tId); navigate('/v1/agent/ask'); setSidebarOpen(false); }}
        onDeleteThread={deleteThread}
        onSendMessage={(msg) => { sendMessage(msg); setSidebarOpen(false); }} 
        onNewChat={() => { newChat(); navigate('/v1/agent/ask'); setSidebarOpen(false); }} 
        onLogout={handleLogout}
        currentPath={currentPath}
        onNavigate={(path) => { navigate(path); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col h-dvh overflow-hidden">
        {/* Unified Top Navbar / Dataview & Controls */}
        <div className="bg-bg-secondary border-b-3 border-black py-2.5 px-4 flex justify-between items-center z-[15] gap-4 w-full relative max-md:flex-nowrap max-md:py-2 max-md:px-3">
          {/* Centered Mobile Logo */}
          <div className="hidden max-md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <AppLogo hideTextOnMobile={true} />
          </div>

          {/* Left side: toggle + scrollable tabs */}
          <div className="flex gap-2 items-center overflow-hidden flex-1 max-md:gap-1.5">
            <button 
              id="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(true)}
              title="OPEN SIDEBAR MENU"
              className="inline-flex md:hidden items-center justify-center bg-bg-secondary border-3 border-black text-lg font-bold cursor-pointer py-1.5 px-3 shadow-[2px_2px_0px_#000000] transition-[transform,box-shadow,background] duration-75 mr-1 text-text-primary hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-accent-cyan active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] flex-shrink-0 max-md:py-1 max-md:px-2.5"
            >
              ☰
            </button>


            {/* Scrollable Tabs Wrapper */}
            <div className="flex gap-2 items-center overflow-x-auto scrollbar-none py-1 flex-1 max-md:hidden max-md:gap-1.5">
              <button 
                className={`font-sans font-bold uppercase text-[12px] py-1.5 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] transition-[transform,box-shadow,background] duration-75 whitespace-nowrap hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-bg-primary active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] border-3 border-black text-text-primary flex-shrink-0 ${
                  currentView === 'chat' ? 'bg-accent-violet text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
                } max-md:py-1 max-md:px-2 max-md:text-[11px] max-md:shadow-[1.5px_1.5px_0px_#000]`}
                onClick={() => navigate('/v1/agent/ask')}
              >
                💬 CHAT CONSOLE
              </button>
              <button 
                className={`font-sans font-bold uppercase text-[12px] py-1.5 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] transition-[transform,box-shadow,background] duration-75 whitespace-nowrap hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-bg-primary active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] border-3 border-black text-text-primary flex-shrink-0 ${
                  currentView === 'customers' ? 'bg-accent-yellow text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
                } max-md:py-1 max-md:px-2 max-md:text-[11px] max-md:shadow-[1.5px_1.5px_0px_#000]`}
                onClick={() => navigate('/v1/datasource/customer')}
              >
                👤 CUSTOMER DIRECTORY
              </button>
              <button 
                className={`font-sans font-bold uppercase text-[12px] py-1.5 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] transition-[transform,box-shadow,background] duration-75 whitespace-nowrap hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-bg-primary active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] border-3 border-black text-text-primary flex-shrink-0 ${
                  currentView === 'aitools' ? 'bg-accent-lime text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
                } max-md:py-1 max-md:px-2 max-md:text-[11px] max-md:shadow-[1.5px_1.5px_0px_#000]`}
                onClick={() => navigate('/v1/datasource/aitools')}
              >
                🤖 AI TOOLS
              </button>
              <button 
                className={`font-sans font-bold uppercase text-[12px] py-1.5 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] transition-[transform,box-shadow,background] duration-75 whitespace-nowrap hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-bg-primary active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] border-3 border-black text-text-primary flex-shrink-0 ${
                  currentView === 'products' ? 'bg-accent-orange text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
                } max-md:py-1 max-md:px-2 max-md:text-[11px] max-md:shadow-[1.5px_1.5px_0px_#000]`}
                onClick={() => navigate('/v1/datasource/products')}
              >
                📦 PRODUCT CATALOG
              </button>
              <button 
                className={`font-sans font-bold uppercase text-[12px] py-1.5 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] transition-[transform,box-shadow,background] duration-75 whitespace-nowrap hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-bg-primary active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] border-3 border-black text-text-primary flex-shrink-0 ${
                  currentView === 'apis' ? 'bg-accent-pink text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
                } max-md:py-1 max-md:px-2 max-md:text-[11px] max-md:shadow-[1.5px_1.5px_0px_#000]`}
                onClick={() => navigate('/v1/datasource/apis')}
              >
                📡 CORE REST APIs
              </button>
            </div>
          </div>

          {/* Right side: controls + connection status dot */}
          <div className="flex items-center gap-4 md:gap-2 flex-shrink-0">
            <button 
              type="button"
              onClick={() => setLogsOpen(true)}
              title="VIEW SYSTEM CONSOLE LOGS"
              className="border-3 border-black text-text-primary cursor-pointer shadow-[2px_2px_0px_#000000] transition-[transform,box-shadow,background] duration-75 bg-bg-secondary py-1.5 px-3 font-mono text-[14px] font-bold flex items-center justify-center rounded-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-accent-cyan active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] max-md:hidden"
            >
              📟
            </button>
            <button 
              type="button"
              onClick={toggleFullScreen}
              title="TOGGLE FULLSCREEN"
              className="border-3 border-black text-text-primary cursor-pointer shadow-[2px_2px_0px_#000000] transition-[transform,box-shadow,background] duration-75 bg-bg-secondary py-1.5 px-3 font-mono text-[14px] font-bold flex items-center justify-center rounded-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-accent-cyan active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] max-md:hidden"
            >
              🖥️
            </button>
            <div className="flex items-center gap-2 text-[12.8px] font-bold font-mono border-3 border-black py-1.5 px-2.5 bg-bg-card rounded-sm max-md:hidden" title="CONNECTION STATUS">
              <div className={`w-2.5 h-2.5 rounded-full border border-black ${
                connectionStatus === 'connected' ? 'bg-accent-emerald' :
                connectionStatus === 'connecting' ? 'bg-accent-amber animate-pulse' : 'bg-accent-rose'
              }`}></div>
              <span>
                {connectionStatus === 'connected' ? 'ONLINE' :
                 connectionStatus === 'connecting' ? 'CONNECTING...' : 'OFFLINE'}
              </span>
            </div>

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                title="DISCONNECT SESSION / LOGOUT"
                className="flex items-center gap-2 border-3 border-black bg-bg-card p-1 pr-3 rounded-sm shadow-[2px_2px_0px_#000] cursor-pointer transition-[transform,box-shadow,background] duration-75 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-accent-rose/10 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] max-md:pr-1 max-md:pl-1 flex-shrink-0"
              >
                <div className="w-7 h-7 bg-accent-pink border-2 border-black rounded-full flex items-center justify-center text-sm shadow-[1px_1px_0px_#000] flex-shrink-0 font-sans">🕶️</div>
                <div className="flex flex-col text-[11px] leading-tight text-left max-md:hidden flex-shrink-0">
                  <span className="font-display font-black uppercase truncate max-w-[100px]" title={user.full_name}>{user.full_name}</span>
                  <span className="font-mono text-[9px] text-text-muted font-bold">{user.assigned_rm_id} (LOGOUT)</span>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {currentView === 'chat' && (
            <ChatInterface
              user={user}
              threadId={threadId}
              messages={messages}
              isLoading={isLoading}
              connectionStatus={connectionStatus}
              onSendMessage={sendMessage}
            />
          )}
          {currentView === 'customers' && (
            <CustomerDirectory user={user} />
          )}
          {currentView === 'aitools' && (
            <AgentTools />
          )}
          {currentView === 'products' && (
            <ProductCatalog />
          )}
          {currentView === 'apis' && (
            <ApiEndpoints />
          )}
        </div>
      </div>

      {/* Global Logs Popup Modal */}
      {logsOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4 backdrop-blur-[2px]" onClick={() => setLogsOpen(false)}>
          <div className="bg-bg-secondary border-3 border-black shadow-brutal-lg w-full max-w-[650px] rounded-md overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-accent-pink text-black p-4 border-b-3 border-black flex items-center justify-between">
              <span className="font-black font-mono text-[13.1px]">
                📟 SESSION_LOGS_CONSOLE
              </span>
              <button 
                type="button"
                onClick={() => setLogsOpen(false)}
                className="bg-white border-3 border-black cursor-pointer font-bold py-0.5 px-2 shadow-[2px_2px_0px_#000000] text-black font-sans transition-[transform,box-shadow] duration-75 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]"
              >
                ✖
              </button>
            </div>
            {/* Modal Content */}
            <div className="p-4 overflow-y-auto flex-1 bg-bg-primary flex flex-col gap-4">
              {logs.length > 0 ? (
                (() => {
                  const filteredLogs = logs.filter(log => log.thread_id === threadId)
                  if (filteredLogs.length === 0) {
                    return <div className="no-logs font-mono text-[13.6px] text-text-secondary text-center py-8">No execution logs recorded for this active thread.</div>
                  }
                  return filteredLogs.map(log => (
                    <div key={log.id} className="p-2 bg-bg-card border-3 border-black shadow-[2px_2px_0px_#000] mb-2">
                      <div className="font-bold text-[12.8px] font-mono">SYS_IN: "{log.query}"</div>
                      <div className="flex gap-2 my-1">
                        <span className="font-mono text-[10.4px] font-bold border border-black py-0.5 px-1.5 text-black bg-accent-yellow">IN: {log.token_count_input}</span>
                        <span className="font-mono text-[10.4px] font-bold border border-black py-0.5 px-1.5 text-black bg-accent-cyan">OUT: {log.token_count_output}</span>
                        <span className="font-mono text-[10.4px] font-bold border border-black py-0.5 px-1.5 text-black bg-accent-lime font-bold">TOT: {log.total_tokens}</span>
                      </div>
                      <div className="text-[11.5px] font-mono my-1">
                        {log.execution_flow && log.execution_flow.length > 0 ? (
                          log.execution_flow.map((step, sIdx) => (
                            <span key={sIdx} className="text-black bg-accent-orange py-0 px-0.5 border border-black inline-block mr-1">
                              {step.name}
                              {sIdx < log.execution_flow.length - 1 ? ' ➔ ' : ''}
                            </span>
                          ))
                        ) : (
                          <span className="italic text-text-muted">DIRECT_RESPONSE</span>
                        )}
                      </div>
                      <div className="text-[10.4px] text-text-muted text-right">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  ))
                })()
              ) : (
                <div className="font-mono text-[13.6px] text-text-secondary text-center py-8">Console buffer empty.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Centered Brutalist Logout Confirmation Modal */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000] p-4 backdrop-blur-[2px]" onClick={() => setLogoutConfirmOpen(false)}>
          <div className="bg-bg-secondary border-3 border-black shadow-brutal-lg w-full max-w-[420px] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="border-b-3 border-black p-4 flex justify-between items-center color-black bg-accent-red">
              <h3 className="margin-0 font-display font-black text-[17.6px] tracking-wider">⚠️ DISCONNECT SESSION</h3>
              <button 
                className="bg-white border-3 border-black cursor-pointer font-bold py-0.5 px-2 shadow-[2px_2px_0px_#000000] text-black font-sans transition-[transform,box-shadow] duration-75 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]"
                onClick={() => setLogoutConfirmOpen(false)}
              >
                ✖
              </button>
            </div>
            <div className="p-4 bg-bg-primary flex flex-col gap-4">
              <div className="font-sans text-[14.4px] text-text-primary mb-2 leading-relaxed">
                Are you sure you want to disconnect and terminate your Relationship Manager session?
              </div>
              <div className="font-mono text-[11.5px] text-text-muted bg-bg-secondary p-2 border border-black rounded mb-2">
                All active conversation threads and session tokens will be cleared.
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  className="w-full bg-accent-red text-black border-3 border-black py-3 text-xs font-bold uppercase tracking-wide cursor-pointer transition-[transform,box-shadow,background] duration-75 shadow-[3px_3px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] hover:bg-accent-red-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  onClick={() => {
                    setLogoutConfirmOpen(false)
                    localStorage.removeItem('user')
                    setUser(null)
                    newChat()
                    navigate('/v1/auth/login')
                  }}
                >
                  🔌 DISCONNECT
                </button>
                <button 
                  type="button" 
                  className="w-full bg-white text-black border-3 border-black py-3 text-xs font-bold uppercase tracking-wide cursor-pointer transition-[transform,box-shadow,background] duration-75 shadow-[3px_3px_0px_#000000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] hover:bg-bg-primary active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
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
