/**
 * Sidebar with RM profile, quick actions, and recent chat threads.
 */
export default function Sidebar({ 
  user,
  threads,
  currentThreadId,
  onSelectThread,
  onDeleteThread,
  onSendMessage, 
  onNewChat, 
  onLogout,
  currentPath,
  onNavigate,
  isOpen,
  onClose
}) {





  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* RM Profile Header */}
      <div className="rm-profile-header">
        <div className="rm-avatar">🕶️</div>
        <div className="rm-info">
          <div className="rm-name" title={user.full_name}>{user.full_name}</div>
          <div className="rm-role">{user.role} • <code>{user.assigned_rm_id}</code></div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="DISCONNECT SESSION">
          🔌
        </button>
        <button className="close-sidebar-btn" onClick={onClose} title="CLOSE MENU">
          ✖
        </button>
      </div>

      <div className="sidebar-content">
        {/* New Chat Button */}
        <div className="sidebar-section" style={{ padding: '4px 0 12px' }}>
          <button className="new-chat-btn" onClick={onNewChat}>
            <span>⚡</span> NEW SESSION
          </button>
        </div>

        {/* Recent Conversations */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span>📁</span> ACTIVE_THREADS
          </div>
          <div className="threads-list">
            {threads.length > 0 ? (
              threads.map(t => (
                <div 
                  key={t.id} 
                  className={`thread-item ${currentThreadId === t.id ? 'active' : ''}`}
                  onClick={() => onSelectThread(t.id)}
                >
                  <span className="thread-icon">🤖</span>
                  <span className="thread-title" title={t.title}>{t.title}</span>
                  <button 
                    className="delete-thread-btn" 
                    onClick={(e) => { e.stopPropagation(); onDeleteThread(t.id); }}
                    title="TERMINATE THREAD"
                  >
                    ✖
                  </button>
                </div>
              ))
            ) : (
              <div className="no-threads">No active threads. Start typing below!</div>
            )}
          </div>
        </div>






      </div>

    </aside>
  )
}
