import { useState } from 'react'

/**
 * Expandable card showing a tool invocation by the agent.
 * Displays tool name, arguments, status, and (expandable) result.
 */
export default function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(false)

  const { name, args, status, result } = toolCall

  const toolIcons = {
    search_customers: '🔍',
    get_customer_profile: '👤',
    get_customer_transactions: '💳',
    get_credit_score: '📊',
    check_product_eligibility: '📦',
    score_lead_conversion: '🎯',
    generate_outreach_message: '✉️',
  }

  const toolDescriptions = {
    search_customers: 'Searching customers',
    get_customer_profile: 'Fetching customer profile',
    get_customer_transactions: 'Analyzing transactions',
    get_credit_score: 'Checking credit score',
    check_product_eligibility: 'Checking product eligibility',
    score_lead_conversion: 'Scoring conversion likelihood',
    generate_outreach_message: 'Generating outreach message',
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

  // Truncate result for preview
  const getResultPreview = (result) => {
    if (!result) return null
    try {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result
      if (Array.isArray(parsed)) {
        return `${parsed.length} items returned`
      }
      if (parsed.summary) return parsed.summary
      if (parsed.score !== undefined) return `Score: ${parsed.score}/100 — ${parsed.label}`
      if (parsed.message) return 'Message generated'
      return 'Response received'
    } catch {
      const resStr = typeof result === 'string' ? result : JSON.stringify(result)
      return resStr.substring(0, 100) + (resStr.length > 100 ? '...' : '')
    }
  }

  return (
    <div className="tool-call-card">
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-icon">{icon}</span>
        <span className="tool-name">{name}</span>
        <span className={`tool-status ${status}`}>
          {status === 'calling' ? '⏳ Calling...' : status === 'done' ? '✅ Done' : '❌ Error'}
        </span>
        <span className={`tool-expand-icon ${expanded ? 'expanded' : ''}`}>▶</span>
      </div>

      {expanded && (
        <div className="tool-call-body">
          {/* Arguments */}
          <div className="tool-call-section">
            <div className="tool-call-section-label">Parameters</div>
            <div className="tool-call-content">{formatArgs(args)}</div>
          </div>

          {/* Result */}
          {result && (
            <div className="tool-call-section">
              <div className="tool-call-section-label">Response</div>
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
