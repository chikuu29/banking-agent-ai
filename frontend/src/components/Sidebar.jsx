import { useState, useEffect } from 'react'

/**
 * Sidebar with branding, quick actions, and portfolio stats.
 */
export default function Sidebar({ onSendMessage, onNewChat, theme, onToggleTheme }) {
  const [stats, setStats] = useState(null)

  // Fetch stats on mount
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setStats(null))
  }, [])

  const quickActions = [
    {
      emoji: '🎯',
      title: 'High-Value Personal Loan Leads',
      text: 'Find top customers for personal loan conversion',
      message: 'Find high-value customers likely to convert for a personal loan this month and generate personalized WhatsApp messages for the top 3 candidates.',
    },
    {
      emoji: '👤',
      title: 'Deep Customer Analysis',
      text: 'Full profile with spending & product fit',
      message: 'Show me a detailed analysis of customer ID 5 — including their spending patterns, credit score, and which products they should be offered.',
    },
    {
      emoji: '📢',
      title: 'Credit Card Campaign',
      text: 'Target Gold tier for credit card upgrades',
      message: 'Which Gold tier customers in Mumbai should I target for credit card upgrades? Score their conversion likelihood and generate outreach messages.',
    },
  ]

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏦</div>
          <div>
            <h1>BankingCRM AI</h1>
            <p>RM Intelligence Assistant</p>
          </div>
        </div>
      </div>

      <div className="sidebar-content">
        {/* New Chat */}
        <div className="sidebar-section">
          <button className="new-chat-btn" onClick={onNewChat}>
            <span>✨</span> New Conversation
          </button>
        </div>

        {/* Quick Actions */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Quick Actions</div>
          {quickActions.map((action, i) => (
            <button
              key={i}
              className="quick-action-btn"
              onClick={() => onSendMessage(action.message)}
            >
              <span className="action-emoji">{action.emoji}</span>
              {action.title}
              <span className="action-text">{action.text}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        {stats && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Portfolio Overview</div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.customers}</div>
                <div className="stat-label">Customers</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">7</div>
                <div className="stat-label">AI Tools</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">8</div>
                <div className="stat-label">Products</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">6</div>
                <div className="stat-label">REST APIs</div>
              </div>
            </div>
          </div>
        )}

        {/* API Info */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Mock APIs</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.8 }}>
            <div>GET /api/customers</div>
            <div>GET /api/customers/:id</div>
            <div>GET /api/customers/:id/transactions</div>
            <div>GET /api/customers/:id/credit-score</div>
            <div>GET /api/products</div>
            <div>GET /api/customers/:id/product-eligibility</div>
          </div>
        </div>
      </div>

      {/* Theme Toggle Footer */}
      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>
    </aside>
  )
}
