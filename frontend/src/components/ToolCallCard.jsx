import { useState } from 'react'

/**
 * Expandable card showing a tool invocation by the agent.
 * Displays tool name, arguments, status, and (expandable) result.
 * Includes a Visual Summary tab with charts, tables, and copy actions,
 * and a Raw JSON tab for debugging.
 */
export default function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('visual') // 'visual' | 'json'
  const [copied, setCopied] = useState(false)

  const { name, args, status, result } = toolCall

  const toolIcons = {
    search_customers: '🔎',
    get_customer_profile: '🕶️',
    get_customer_transactions: '🪙',
    get_credit_score: '📈',
    check_product_eligibility: '🗳️',
    score_lead_conversion: '🎰',
    generate_outreach_message: '📣',
  }

  const toolDescriptions = {
    search_customers: 'SEARCH_CUSTOMERS_DB',
    get_customer_profile: 'GET_CUSTOMER_PROFILE_360',
    get_customer_transactions: 'ANALYZE_TRANSACTION_FLOW',
    get_credit_score: 'CALCULATE_CREDIT_STANDING',
    check_product_eligibility: 'CHECK_PRODUCT_ELIGIBILITY',
    score_lead_conversion: 'SCORE_CONVERSION_LIKELIHOOD',
    generate_outreach_message: 'GENERATE_OUTREACH_MSG',
  }

  const icon = toolIcons[name] || '🔧'
  const description = toolDescriptions[name] || name

  // Format args for display
  const formatArgs = (args) => {
    if (!args || Object.keys(args).length === 0) return 'No parameters'
    return Object.entries(args)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ')
  }

  // Truncate result for preview (safely handles object summary fields to prevent crashes)
  const getResultPreview = (result) => {
    if (!result) return null
    try {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result
      if (Array.isArray(parsed)) {
        return `${parsed.length} items returned`
      }
      if (parsed.summary) {
        if (typeof parsed.summary === 'string') return parsed.summary
        if (typeof parsed.summary === 'object') {
          return `Net Flow: ₹${(parsed.summary.net_flow || 0).toLocaleString('en-IN')} | Avg Balance: ₹${(parsed.summary.avg_balance || 0).toLocaleString('en-IN')}`
        }
      }
      if (parsed.score !== undefined) return `Score: ${parsed.score}/100 — ${parsed.label}`
      if (parsed.message) return 'Message generated'
      return 'Response received'
    } catch {
      const resStr = typeof result === 'string' ? result : JSON.stringify(result)
      return resStr.substring(0, 100) + (resStr.length > 100 ? '...' : '')
    }
  }

  // Sub-renderers for each tool type
  const renderSearchCustomers = (customers) => {
    if (!Array.isArray(customers) || customers.length === 0) {
      return <div className="visual-no-data">No customers found.</div>
    }
    return (
      <div className="visual-table-wrapper">
        <table className="visual-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Tier</th>
              <th>Annual Income</th>
              <th>Credit Score</th>
              <th>City</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>#{c.id}</td>
                <td className="font-semibold">{c.name}</td>
                <td>
                  <span className={`badge tier-${(c.relationship_tier || c.tier || '').toLowerCase()}`}>
                    {c.relationship_tier || c.tier || 'N/A'}
                  </span>
                </td>
                <td>₹{(c.annual_income || 0).toLocaleString('en-IN')}</td>
                <td>
                  <span className={`score-badge ${
                    (c.credit_score || 0) >= 750 ? 'excellent' : (c.credit_score || 0) >= 700 ? 'good' : 'fair'
                  }`}>
                    {c.credit_score || 'N/A'}
                  </span>
                </td>
                <td>{c.city || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderCustomerProfile = (profile) => {
    const existingProducts = profile.existing_products || []
    return (
      <div className="profile-visual-card">
        <div className="profile-visual-header">
          <div className="profile-avatar">
            {profile.gender === 'female' ? '👩' : '👨'}
          </div>
          <div>
            <h4 className="profile-name">{profile.name}</h4>
            <div className="profile-meta">
              <span>ID: #{profile.id}</span>
              <span>•</span>
              <span className={`badge tier-${(profile.relationship_tier || '').toLowerCase()}`}>
                {profile.relationship_tier || 'Standard'}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-details-grid">
          <div className="profile-detail-item">
            <span className="detail-label">Age / Gender</span>
            <span className="detail-value">{profile.age || 'N/A'} / {profile.gender || 'N/A'}</span>
          </div>
          <div className="profile-detail-item">
            <span className="detail-label">Occupation</span>
            <span className="detail-value">{profile.occupation || 'N/A'}</span>
          </div>
          <div className="profile-detail-item">
            <span className="detail-label">Income (Annual)</span>
            <span className="detail-value">₹{(profile.annual_income || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="profile-detail-item">
            <span className="detail-label">Location</span>
            <span className="detail-value">{profile.city || 'N/A'}, {profile.state || 'N/A'}</span>
          </div>
          <div className="profile-detail-item">
            <span className="detail-label">Credit Score</span>
            <span className={`detail-value font-semibold ${
              (profile.credit_score || 0) >= 750 ? 'text-emerald' : (profile.credit_score || 0) >= 700 ? 'text-blue' : 'text-amber'
            }`}>
              {profile.credit_score || 'N/A'}
            </span>
          </div>
          <div className="profile-detail-item">
            <span className="detail-label">KYC Status</span>
            <span className={`detail-value font-semibold ${profile.kyc_status === 'completed' ? 'text-emerald' : 'text-rose'}`}>
              {(profile.kyc_status || 'N/A').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="profile-products-section">
          <span className="detail-label">Existing Products ({existingProducts.length})</span>
          <div className="products-tag-container">
            {existingProducts.length > 0 ? (
              existingProducts.map((p, idx) => (
                <span key={idx} className="product-tag">
                  📦 {p.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              ))
            ) : (
              <span className="no-products-msg">No active products.</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderCustomerTransactions = (data) => {
    const summary = data.summary || {}
    const transactions = data.transactions || []
    const categories = summary.top_spending_categories || []

    return (
      <div className="transactions-visual-card">
        {/* Metric Cards Grid */}
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Total Credits</span>
            <span className="metric-value text-emerald">₹{(summary.total_credit || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Total Debits</span>
            <span className="metric-value text-rose">₹{(summary.total_debit || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Net Flow</span>
            <span className={`metric-value ${(summary.net_flow || 0) >= 0 ? 'text-emerald' : 'text-rose'}`}>
              {(summary.net_flow || 0) >= 0 ? '+' : ''}₹{(summary.net_flow || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Average Balance</span>
            <span className="metric-value text-blue">₹{(summary.avg_balance || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Category Spent Chart (HTML/CSS Horizontal Bar Chart) */}
        {categories.length > 0 && (
          <div className="spending-chart-section">
            <span className="section-title">📊 Top Spending Categories</span>
            <div className="category-chart">
              {categories.map((cat, idx) => {
                const maxVal = Math.max(...categories.map(c => c.total))
                const percentage = maxVal > 0 ? (cat.total / maxVal) * 100 : 0
                return (
                  <div key={idx} className="chart-bar-row">
                    <div className="chart-bar-label">{cat.category.replace('_', ' ').toUpperCase()}</div>
                    <div className="chart-bar-container">
                      <div className="chart-bar-fill" style={{ width: `${percentage}%` }}>
                        <span className="chart-bar-value">₹{cat.total.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {transactions.length > 0 ? (
          <div className="transactions-table-section">
            <span className="section-title">💳 Recent Transactions</span>
            <div className="visual-table-wrapper mini-table">
              <table className="visual-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map((t, idx) => (
                    <tr key={idx}>
                      <td>{t.date}</td>
                      <td className="description-col">{t.description}</td>
                      <td><span className="cat-badge">{t.category}</span></td>
                      <td>
                        <span className={`type-badge ${t.type}`}>
                          {t.type === 'credit' ? '📥 Credit' : '📤 Debit'}
                        </span>
                      </td>
                      <td className={t.type === 'credit' ? 'text-emerald font-semibold' : 'text-rose font-semibold'}>
                        ₹{t.amount?.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length > 5 && (
                <div className="table-note">Showing 5 most recent transactions. Toggle Code Response for full data.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="visual-no-data">No transactions found.</div>
        )}
      </div>
    )
  }

  const renderCreditScore = (credit) => {
    const score = credit.score || 0
    const percentage = Math.max(0, Math.min(100, ((score - 300) / 550) * 100))
    const rating = credit.rating || 'N/A'
    const ratingClass = rating.toLowerCase()

    return (
      <div className="credit-visual-card">
        <div className="credit-score-section">
          <div className="credit-gauge-container">
            <div className="credit-score-value">{score}</div>
            <div className={`credit-rating-badge ${ratingClass}`}>{rating}</div>
          </div>
          <div className="credit-bar-wrapper">
            <div className="credit-bar-bg">
              <div className={`credit-bar-fill ${ratingClass}`} style={{ width: `${percentage}%` }} />
            </div>
            <div className="credit-bar-labels">
              <span>300</span>
              <span>Poor</span>
              <span>Fair</span>
              <span>Good</span>
              <span>Excellent</span>
              <span>850</span>
            </div>
          </div>
        </div>

        {credit.factors && credit.factors.length > 0 && (
          <div className="credit-factors-section">
            <span className="section-title">📊 Key Credit Factors</span>
            <div className="visual-table-wrapper">
              <table className="visual-table">
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>Impact</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {credit.factors.map((f, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold">{f.name}</td>
                      <td>
                        <span className={`impact-badge ${f.impact?.toLowerCase().replace(' ', '-')}`}>
                          {f.impact}
                        </span>
                      </td>
                      <td>{f.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderProductEligibility = (eligibility) => {
    if (!Array.isArray(eligibility) || eligibility.length === 0) {
      return <div className="visual-no-data">No product eligibility details found.</div>
    }
    return (
      <div className="eligibility-grid">
        {eligibility.map((p, idx) => {
          const isEligible = p.eligible
          const fitScore = p.fit_score || 0
          return (
            <div key={idx} className={`eligibility-card ${isEligible ? 'eligible' : 'ineligible'}`}>
              <div className="eligibility-card-header">
                <span className="product-icon">📦</span>
                <span className="product-title">{p.product_name || p.product_type?.replace('_', ' ').toUpperCase()}</span>
                <span className={`status-icon ${isEligible ? 'yes' : 'no'}`}>
                  {isEligible ? '✔ Eligible' : '✘ Ineligible'}
                </span>
              </div>
              <div className="eligibility-card-body">
                <div className="fit-score-row">
                  <span className="fit-score-label">Cross-sell Fit Score</span>
                  <div className="fit-score-progress-wrapper">
                    <div className="fit-score-progress-bg">
                      <div 
                        className={`fit-score-progress-fill ${fitScore >= 75 ? 'high' : fitScore >= 50 ? 'medium' : 'low'}`}
                        style={{ width: `${fitScore}%` }}
                      />
                    </div>
                    <span className="fit-score-number">{fitScore}/100</span>
                  </div>
                </div>
                {p.reasons && p.reasons.length > 0 && (
                  <div className="reasons-list">
                    {p.reasons.map((r, rIdx) => (
                      <div key={rIdx} className="reason-item">
                        <span className="bullet">•</span>
                        <span className="text">{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderLeadConversion = (data) => {
    const score = data.score || 0
    const label = data.label || 'N/A'
    const labelClass = label.toLowerCase()

    return (
      <div className="conversion-visual-card">
        <div className="conversion-score-section">
          <div className="conversion-score-badge">
            <span className="score-num">{score}</span>
            <span className="score-max">/100</span>
          </div>
          <div className="conversion-info">
            <h4 className="conversion-label">Conversion Likelihood: <span className={`text-${labelClass} font-bold`}>{label}</span></h4>
            <p className="conversion-desc">
              {data.summary || data.explanation || 'Calculated based on customer profile, income adequacy, credit standing, and transactional behavior.'}
            </p>
          </div>
        </div>

        {data.factors && data.factors.length > 0 && (
          <div className="conversion-factors-section">
            <span className="section-title">📊 Contributing Factors</span>
            <div className="factors-checklist">
              {data.factors.map((f, idx) => {
                const scoreDiff = f.score
                const isPositive = scoreDiff >= 60
                return (
                  <div key={idx} className="factor-checklist-item">
                    <span className={`factor-check-icon ${isPositive ? 'positive' : 'negative'}`}>
                      {isPositive ? '▲' : '▼'}
                    </span>
                    <div className="factor-check-content">
                      <div className="factor-check-title">
                        {f.name}
                        <span className="factor-points"> ({scoreDiff}/100)</span>
                      </div>
                      <div className="factor-check-desc">{f.detail}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderOutreachMessage = (data) => {
    const messageText = data.message || ''
    const channel = data.channel || 'whatsapp'
    const phone = data.customer_phone || ''

    const handleSendWhatsApp = () => {
      const cleanedPhone = phone ? phone.replace(/\D/g, '') : ''
      const finalPhone = cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone
      const encodedMsg = encodeURIComponent(messageText)
      const url = finalPhone 
        ? `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodedMsg}`
        : `https://api.whatsapp.com/send?text=${encodedMsg}`
      window.open(url, '_blank')
    }

    return (
      <div className="outreach-visual-card">
        <div className="outreach-header">
          <span className="channel-badge uppercase">{channel} Message Preview</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`copy-msg-btn ${copied ? 'copied' : ''}`}
              onClick={() => handleCopyMessage(messageText)}
            >
              {copied ? '✔ Copied!' : '📋 Copy Message'}
            </button>
            {channel === 'whatsapp' && (
              <button 
                className="send-whatsapp-btn"
                onClick={handleSendWhatsApp}
                style={{
                  background: 'var(--accent-lime)',
                  border: '2px solid #000000',
                  boxShadow: '2px 2px 0px #000000',
                  color: '#000000',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
                }}
              >
                💬 SEND ON WHATSAPP
              </button>
            )}
          </div>
        </div>
        
        <div className="outreach-chat-container">
          <div className={`chat-bubble-preview ${channel}`}>
            {channel === 'whatsapp' && (
              <div className="whatsapp-header">
                <span className="whatsapp-status">RM Assistant • WhatsApp Business</span>
              </div>
            )}
            <div className="chat-bubble-body">
              <pre className="message-pre">{messageText}</pre>
            </div>
            <div className="chat-bubble-footer">
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {channel === 'whatsapp' && <span className="double-tick">✓✓</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderVisualResult = (name, result) => {
    let parsed
    try {
      parsed = typeof result === 'string' ? JSON.parse(result) : result
    } catch {
      return <div className="visual-error">Could not parse tool response.</div>
    }

    if (!parsed) return <div className="visual-error">No data returned.</div>

    switch (name) {
      case 'search_customers':
        return renderSearchCustomers(parsed)
      case 'get_customer_profile':
        return renderCustomerProfile(parsed)
      case 'get_customer_transactions':
        return renderCustomerTransactions(parsed)
      case 'get_credit_score':
        return renderCreditScore(parsed)
      case 'check_product_eligibility':
        return renderProductEligibility(parsed)
      case 'score_lead_conversion':
        return renderLeadConversion(parsed)
      case 'generate_outreach_message':
        return renderOutreachMessage(parsed)
      default:
        return (
          <div className="tool-call-content">
            {JSON.stringify(parsed, null, 2)}
          </div>
        )
    }
  }

  return (
    <div className="tool-call-card">
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-icon">{icon}</span>
        <span className="tool-name">{name}</span>
        <span className={`tool-status ${status}`}>
          {status === 'calling' ? '⏳ CALLING...' : status === 'done' ? '✅ DONE' : '❌ ERROR'}
        </span>
        <span className={`tool-expand-icon ${expanded ? 'expanded' : ''}`}>▶</span>
      </div>

      {expanded && (
        <div className="tool-call-body">
          {/* Arguments */}
          <div className="tool-call-section">
            <div className="tool-call-section-label">PARAMETERS</div>
            <div className="tool-call-content">{formatArgs(args)}</div>
          </div>

          {/* Result */}
          {result && (
            <div className="tool-call-section">
              <div className="tool-call-tabs">
                <button
                  className={`tool-tab-btn ${activeTab === 'visual' ? 'active' : ''}`}
                  onClick={() => setActiveTab('visual')}
                >
                  📊 VISUAL_SUMMARY
                </button>
                <button
                  className={`tool-tab-btn ${activeTab === 'json' ? 'active' : ''}`}
                  onClick={() => setActiveTab('json')}
                >
                  💻 RAW_JSON
                </button>
              </div>

              <div className="tool-tab-content">
                {activeTab === 'visual' ? (
                  <div className="tool-visual-container">
                    {renderVisualResult(name, result)}
                  </div>
                ) : (
                  <div className="tool-call-content">
                    {(() => {
                      try {
                        const parsed = typeof result === 'string' ? JSON.parse(result) : result
                        return JSON.stringify(parsed, null, 2)
                      } catch {
                        return typeof result === 'string' ? result : JSON.stringify(result)
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!expanded && result && (
        <div style={{ padding: '4px 16px 8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {getResultPreview(result)}
        </div>
      )}
    </div>
  )
}
