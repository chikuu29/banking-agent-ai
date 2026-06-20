import { useState, useEffect, useRef } from 'react'

/**
 * Synthesizes retro sound effects using browser Web Audio API.
 * Avoids any external audio file assets and respects browser permissions.
 */
const playToolSound = (type) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const audioCtx = new AudioContextClass()
    
    if (type === 'calling') {
      // Tech tick/blip when a tool is triggered
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.1)
    } else if (type === 'done') {
      // Satisfying two-tone rising success chime
      const now = audioCtx.currentTime
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.setValueAtTime(783.99, now + 0.08) // G5
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(now + 0.25)
    } else if (type === 'error') {
      // Low descending buzz when a tool fails
      const now = audioCtx.currentTime
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(160, now)
      osc.frequency.linearRampToValueAtTime(80, now + 0.25)
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(now + 0.25)
    }
  } catch (e) {
    console.debug("Web Audio API blocked or unsupported:", e)
  }
}

/**
 * Expandable card showing a tool invocation by the agent.
 * Displays tool name, arguments, status, and (expandable) result.
 * Includes a Visual Summary tab with charts, tables, and copy actions,
 * and a Raw JSON tab for debugging.
 */
export default function ToolCallCard({ toolCall }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('visual') // 'visual' | 'json'
  const [copied, setCopied] = useState(false)

  const { name, args, status, result } = toolCall

  const hasMountedRef = useRef(false)
  const lastStatusRef = useRef(status)

  // Trigger sound effect on tool call status transition
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      if (status === 'calling') {
        playToolSound('calling')
      }
      return
    }

    if (status && status !== lastStatusRef.current) {
      playToolSound(status)
      lastStatusRef.current = status
    }
  }, [status])

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

  // Helper for rendering relationship tier badge color classes
  const getTierBadgeClass = (tier) => {
    const base = "inline-flex items-center py-0.5 px-1.5 border border-black rounded-sm text-[11px] font-bold uppercase"
    switch (tier?.toLowerCase()) {
      case 'platinum': return `${base} bg-accent-violet text-black`
      case 'gold': return `${base} bg-accent-yellow text-black`
      case 'silver': return `${base} bg-[#cbd5e1] text-black`
      case 'bronze': return `${base} bg-accent-orange text-black`
      default: return `${base} bg-white text-black`
    }
  }

  // Helper for rendering credit score rating badge color classes
  const getCreditRatingBadgeClass = (rating) => {
    const base = "font-sans text-[11px] font-bold uppercase border border-black py-0.5 px-1.5"
    switch (rating?.toLowerCase()) {
      case 'excellent': return `${base} bg-accent-emerald text-black`
      case 'good': return `${base} bg-accent-blue text-black`
      case 'fair': return `${base} bg-accent-amber text-black`
      case 'poor': return `${base} bg-accent-rose text-black`
      default: return `${base} bg-accent-cyan text-black`
    }
  }

  // Helper for credit score meter fill color
  const getCreditScoreFillColor = (rating) => {
    switch (rating?.toLowerCase()) {
      case 'excellent': return 'bg-accent-emerald'
      case 'good': return 'bg-accent-blue'
      case 'fair': return 'bg-accent-amber'
      default: return 'bg-accent-rose'
    }
  }

  // Sub-renderers for each tool type
  const renderSearchCustomers = (customers) => {
    if (!Array.isArray(customers) || customers.length === 0) {
      return <div className="text-center p-4 font-mono text-[12px] text-text-muted">No customers found.</div>
    }
    return (
      <div className="w-full overflow-x-auto border-3 border-black rounded-md bg-white mb-2 shadow-brutal-sm">
        <table className="w-full border-collapse font-sans text-[12.8px] [&_th]:p-2 [&_th]:px-2.5 [&_td]:p-2 [&_td]:px-2.5 [&_th]:border-b-3 [&_th]:border-r-3 [&_th]:border-black [&_td]:border-b-3 [&_td]:border-r-3 [&_td]:border-black [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0 [&_th]:bg-accent-cyan [&_th]:font-bold [&_th]:uppercase [&_tbody_tr:hover]:bg-bg-primary">
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
                  <span className={getTierBadgeClass(c.relationship_tier || c.tier)}>
                    {c.relationship_tier || c.tier || 'N/A'}
                  </span>
                </td>
                <td>₹{(c.annual_income || 0).toLocaleString('en-IN')}</td>
                <td>
                  <span className={`inline-block py-0.5 px-1.5 border-3 border-black rounded-sm font-bold font-mono text-[11.5px] ${
                    (c.credit_score || 0) >= 750 ? 'bg-accent-emerald text-black' : (c.credit_score || 0) >= 700 ? 'bg-accent-blue text-black' : 'bg-accent-amber text-black'
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
    if (Array.isArray(profile)) {
      return (
        <div className="flex flex-col gap-4">
          {profile.map((p, idx) => (
            <div key={p.id || idx}>
              {renderCustomerProfile(p)}
            </div>
          ))}
        </div>
      )
    }
    const existingProducts = profile.existing_products || []
    return (
      <div className="bg-white border-3 border-black rounded-md p-4 shadow-brutal-sm">
        <div className="flex items-center gap-4 mb-4 border-b-3 border-black pb-2">
          <div className="w-11 h-11 bg-accent-pink border-3 border-black rounded-full flex items-center justify-center text-[22.4px] shadow-[2px_2px_0px_#000000]">
            {profile.gender === 'female' ? '👩' : '👨'}
          </div>
          <div>
            <h4 className="font-display text-[17.6px] font-black text-text-primary">{profile.name}</h4>
            <div className="flex items-center gap-2 text-[12px] font-bold text-text-secondary">
              <span>ID: #{profile.id}</span>
              <span>•</span>
              <span className={getTierBadgeClass(profile.relationship_tier)}>
                {profile.relationship_tier || 'Standard'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
          <div className="flex flex-col">
            <span className="font-mono text-[10.4px] font-bold text-text-muted uppercase">Age / Gender</span>
            <span className="text-[13.6px] font-semibold">{profile.age || 'N/A'} / {profile.gender || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10.4px] font-bold text-text-muted uppercase">Occupation</span>
            <span className="text-[13.6px] font-semibold">{profile.occupation || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10.4px] font-bold text-text-muted uppercase">Income (Annual)</span>
            <span className="text-[13.6px] font-semibold">₹{(profile.annual_income || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10.4px] font-bold text-text-muted uppercase">Location</span>
            <span className="text-[13.6px] font-semibold">{profile.city || 'N/A'}, {profile.state || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10.4px] font-bold text-text-muted uppercase">Credit Score</span>
            <span className={`text-[13.6px] font-semibold ${
              (profile.credit_score || 0) >= 750 ? 'text-emerald-600' : (profile.credit_score || 0) >= 700 ? 'text-blue-600' : 'text-amber-600'
            }`}>
              {profile.credit_score || 'N/A'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10.4px] font-bold text-text-muted uppercase">KYC Status</span>
            <span className={`text-[13.6px] font-semibold ${profile.kyc_status === 'completed' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {(profile.kyc_status || 'N/A').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="border-t-3 border-black pt-2">
          <span className="font-mono text-[10.4px] font-bold text-text-muted uppercase">Existing Products ({existingProducts.length})</span>
          <div className="flex flex-wrap gap-1 mt-2">
            {existingProducts.length > 0 ? (
              existingProducts.map((p, idx) => (
                <span key={idx} className="bg-accent-yellow border border-black py-0.5 px-1.5 text-[11.5px] font-bold text-black">
                  📦 {p.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              ))
            ) : (
              <span className="text-[12.8px] italic text-text-muted">No active products.</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderCustomerTransactions = (data) => {
    if (Array.isArray(data)) {
      return (
        <div className="flex flex-col gap-6">
          {data.map((d, idx) => (
            <div key={idx} className="border-3 border-black p-4 bg-bg-primary rounded-md shadow-brutal-sm">
              <h4 className="font-display font-black mb-2 text-sm border-b-2 border-black pb-1">TRANSACTION ANALYSIS FOR {d.customer_name?.toUpperCase() || `CUSTOMER #${d.customer_id}`}</h4>
              {renderCustomerTransactions(d)}
            </div>
          ))}
        </div>
      )
    }
    const summary = data.summary || {}
    const transactions = data.transactions || []
    const categories = summary.top_spending_categories || []

    return (
      <div className="flex flex-col gap-4">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-4 gap-2 md:grid-cols-2 sm:grid-cols-1">
          <div className="bg-accent-lime border-3 border-black rounded-sm py-1.5 px-2 flex flex-col shadow-[2px_2px_0px_#000000]">
            <span className="font-mono text-[9.6px] font-bold uppercase text-[#111] mb-0.5">Total Credits</span>
            <span className="font-mono text-[13.1px] font-bold text-emerald-700">₹{(summary.total_credit || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-accent-pink border-3 border-black rounded-sm py-1.5 px-2 flex flex-col shadow-[2px_2px_0px_#000000]">
            <span className="font-mono text-[9.6px] font-bold uppercase text-[#111] mb-0.5">Total Debits</span>
            <span className="font-mono text-[13.1px] font-bold text-rose-700">₹{(summary.total_debit || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-accent-cyan border-3 border-black rounded-sm py-1.5 px-2 flex flex-col shadow-[2px_2px_0px_#000000]">
            <span className="font-mono text-[9.6px] font-bold uppercase text-[#111] mb-0.5">Net Flow</span>
            <span className={`font-mono text-[13.1px] font-bold ${(summary.net_flow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {(summary.net_flow || 0) >= 0 ? '+' : ''}₹{(summary.net_flow || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-accent-violet border-3 border-black rounded-sm py-1.5 px-2 flex flex-col shadow-[2px_2px_0px_#000000]">
            <span className="font-mono text-[9.6px] font-bold uppercase text-[#111] mb-0.5">Average Balance</span>
            <span className="font-mono text-[13.1px] font-bold text-blue-700">₹{(summary.avg_balance || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Category Spent Chart (HTML/CSS Horizontal Bar Chart) */}
        {categories.length > 0 && (
          <div className="mt-2">
            <span className="font-display text-[12.5px] font-black uppercase text-text-primary mb-2">📊 Top Spending Categories</span>
            <div className="bg-white border-3 border-black rounded-md p-4">
              {categories.map((cat, idx) => {
                const maxVal = Math.max(...categories.map(c => c.total))
                const percentage = maxVal > 0 ? (cat.total / maxVal) * 100 : 0
                return (
                  <div key={idx} className="flex items-center mb-2">
                    <div className="w-20 font-mono text-[10.4px] font-bold text-text-primary">{cat.category.replace('_', ' ').toUpperCase()}</div>
                    <div className="flex-1 bg-bg-primary h-[18px] border border-black overflow-hidden">
                      <div className="bg-accent-orange h-full flex items-center justify-end pr-1 border-r border-black" style={{ width: `${percentage}%` }}>
                        <span className="font-mono text-[10.4px] font-bold text-black">₹{cat.total.toLocaleString('en-IN')}</span>
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
          <div>
            <span className="font-display text-[12.5px] font-black uppercase text-text-primary mb-2">💳 Recent Transactions</span>
            <div className="w-full overflow-x-auto border-3 border-black rounded-md bg-white mb-2 shadow-brutal-sm">
              <table className="w-full border-collapse font-sans text-[12.8px] [&_th]:p-2 [&_th]:px-2.5 [&_td]:p-2 [&_td]:px-2.5 [&_th]:border-b-3 [&_th]:border-r-3 [&_th]:border-black [&_td]:border-b-3 [&_td]:border-r-3 [&_td]:border-black [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0 [&_th]:bg-accent-cyan [&_th]:font-bold [&_th]:uppercase [&_tbody_tr:hover]:bg-bg-primary">
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
                      <td>{t.description}</td>
                      <td>
                        <span className="inline-block py-0.5 px-1.5 border border-black text-[11px] font-mono font-bold bg-bg-primary rounded-sm">
                          {t.category}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-block py-0.5 px-1.5 border border-black text-[11px] font-bold rounded-sm ${t.type === 'credit' ? 'bg-accent-emerald text-black' : 'bg-accent-rose text-black'}`}>
                          {t.type === 'credit' ? '📥 Credit' : '📤 Debit'}
                        </span>
                      </td>
                      <td className={t.type === 'credit' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                        ₹{t.amount?.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length > 5 && (
                <div className="p-2 border-t border-black text-center text-xs font-semibold text-text-muted">Showing 5 most recent transactions. Toggle Code Response for full data.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-4 font-mono text-[12px] text-text-muted">No transactions found.</div>
        )}
      </div>
    )
  }

  const renderCreditScore = (credit) => {
    if (Array.isArray(credit)) {
      return (
        <div className="flex flex-col gap-6">
          {credit.map((c, idx) => (
            <div key={idx} className="border-3 border-black p-4 bg-bg-primary rounded-md shadow-brutal-sm">
              <h4 className="font-display font-black mb-2 text-sm border-b-2 border-black pb-1">CREDIT SCORE FOR {c.customer_name?.toUpperCase() || `CUSTOMER #${c.customer_id}`}</h4>
              {renderCreditScore(c)}
            </div>
          ))}
        </div>
      )
    }
    const score = credit.score || 0
    const percentage = Math.max(0, Math.min(100, ((score - 300) / 550) * 100))
    const rating = credit.rating || 'N/A'

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 bg-white border-3 border-black rounded-md p-4 shadow-brutal-sm">
          <div className="flex flex-col items-center">
            <div className="font-mono text-[35.2px] font-black text-text-primary">{score}</div>
            <div className={getCreditRatingBadgeClass(rating)}>{rating}</div>
          </div>
          <div className="flex-1">
            <div className="bg-bg-primary h-4 border-3 border-black rounded-sm overflow-hidden mb-1">
              <div className={`h-full border-r-2 border-black ${getCreditScoreFillColor(rating)}`} style={{ width: `${percentage}%` }} />
            </div>
            <div className="flex justify-between text-[9.6px] font-mono font-bold">
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
          <div>
            <span className="font-display text-[12.5px] font-black uppercase text-text-primary mb-2">📊 Key Credit Factors</span>
            <div className="w-full overflow-x-auto border-3 border-black rounded-md bg-white mb-2 shadow-brutal-sm">
              <table className="w-full border-collapse font-sans text-[12.8px] [&_th]:p-2 [&_th]:px-2.5 [&_td]:p-2 [&_td]:px-2.5 [&_th]:border-b-3 [&_th]:border-r-3 [&_th]:border-black [&_td]:border-b-3 [&_td]:border-r-3 [&_td]:border-black [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0 [&_th]:bg-accent-cyan [&_th]:font-bold [&_th]:uppercase [&_tbody_tr:hover]:bg-bg-primary">
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
                        <span className={`font-mono text-[10.4px] font-bold border border-black py-0.5 px-1 inline-block text-black ${
                          f.impact?.toLowerCase().includes('positive') ? 'bg-accent-emerald' : f.impact?.toLowerCase().includes('negative') ? 'bg-accent-rose' : 'bg-accent-blue'
                        }`}>
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
    if (Array.isArray(eligibility) && eligibility.length > 0 && (eligibility[0].eligible_products !== undefined || eligibility[0].customer_id !== undefined)) {
      return (
        <div className="flex flex-col gap-6">
          {eligibility.map((e, idx) => (
            <div key={idx} className="border-3 border-black p-4 bg-bg-primary rounded-md shadow-brutal-sm">
              <h4 className="font-display font-black mb-2 text-sm border-b-2 border-black pb-1">PRODUCT ELIGIBILITY FOR {e.customer_name?.toUpperCase() || `CUSTOMER #${e.customer_id}`}</h4>
              {renderProductEligibility(e)}
            </div>
          ))}
        </div>
      )
    }
    const products = Array.isArray(eligibility) ? eligibility : (eligibility?.eligible_products || [])
    if (products.length === 0) {
      return <div className="text-center p-4 font-mono text-[12px] text-text-muted">No product eligibility details found.</div>
    }
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
        {products.map((p, idx) => {
          const isEligible = p.eligible
          const fitScore = p.fit_score || 0
          return (
            <div key={idx} className={`border-3 border-black rounded-md p-4 shadow-brutal-sm ${isEligible ? 'bg-accent-lime' : 'bg-accent-red'}`}>
              <div className="flex items-center justify-between border-b border-black pb-1 mb-2">
                <span className="text-base">📦</span>
                <span className="font-bold text-[14.4px] text-black">{p.product_name || p.product_type?.replace('_', ' ').toUpperCase()}</span>
                <span className="font-sans text-[11px] font-bold border border-black py-0.5 px-1 bg-white text-black">
                  {isEligible ? '✔ Eligible' : '✘ Ineligible'}
                </span>
              </div>
              <div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[10.4px] font-bold uppercase text-text-muted">Cross-sell Fit Score</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 bg-white h-2 border border-black">
                      <div 
                        className="h-full bg-black"
                        style={{ width: `${fitScore}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-black">{fitScore}/100</span>
                  </div>
                </div>
                {p.reasons && p.reasons.length > 0 && (
                  <div className="border-t border-black pt-1 mt-2 flex flex-col gap-0.5">
                    {p.reasons.map((r, rIdx) => (
                      <div key={rIdx} className="text-[11.5px] font-medium text-black">
                        <span className="mr-1">•</span>
                        <span>{r}</span>
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
    if (Array.isArray(data)) {
      return (
        <div className="flex flex-col gap-6">
          {data.map((d, idx) => (
            <div key={idx} className="border-3 border-black p-4 bg-bg-primary rounded-md shadow-brutal-sm">
              <h4 className="font-display font-black mb-2 text-sm border-b-2 border-black pb-1">CONVERSION SCORE FOR {d.customer_name?.toUpperCase() || `CUSTOMER #${d.customer_id}`}</h4>
              {renderLeadConversion(d)}
            </div>
          ))}
        </div>
      )
    }
    const score = data.score || 0
    const label = data.label || 'N/A'
    const labelClass = label.toLowerCase()

    return (
      <div className="bg-white border-3 border-black rounded-md p-4 shadow-brutal-sm">
        <div className="flex items-center gap-4 border-b-3 border-black pb-4 mb-4">
          <div className="min-w-[60px] h-[60px] border-3 border-black bg-accent-yellow text-black flex flex-col items-center justify-center shadow-[2px_2px_0px_#000000]">
            <span className="font-mono text-2xl font-black">{score}</span>
            <span className="text-[10.4px] font-bold">/100</span>
          </div>
          <div>
            <h4 className="font-display text-base font-black">Conversion Likelihood: <span className={`${labelClass === 'high' ? 'text-emerald-700' : labelClass === 'medium' ? 'text-blue-700' : 'text-rose-700'} font-bold`}>{label}</span></h4>
            <p className="text-[12px] font-medium leading-[1.3]">
              {data.summary || data.explanation || 'Calculated based on customer profile, income adequacy, credit standing, and transactional behavior.'}
            </p>
          </div>
        </div>

        {data.factors && data.factors.length > 0 && (
          <div>
            <span className="font-display text-[12.5px] font-black uppercase text-text-primary mb-2">📊 Contributing Factors</span>
            <div className="flex flex-col gap-1.5">
              {data.factors.map((f, idx) => {
                const scoreDiff = f.score
                const isPositive = scoreDiff >= 60
                return (
                  <div key={idx} className="flex gap-2 p-1.5 bg-bg-primary border border-black">
                    <span className={`text-[11.2px] font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? '▲' : '▼'}
                    </span>
                    <div>
                      <div className="font-bold text-[12.8px] text-text-primary">
                        {f.name}
                        <span className="font-mono text-xs font-semibold text-text-secondary"> ({scoreDiff}/100)</span>
                      </div>
                      <div className="text-[11px] text-text-muted">{f.detail}</div>
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
    if (Array.isArray(data)) {
      return (
        <div className="flex flex-col gap-6">
          {data.map((d, idx) => (
            <div key={idx} className="border-3 border-black p-4 bg-bg-primary rounded-md shadow-brutal-sm">
              <h4 className="font-display font-black mb-2 text-sm border-b-2 border-black pb-1">OUTREACH MESSAGE FOR {d.customer_name?.toUpperCase() || `CUSTOMER #${d.customer_id}`}</h4>
              {renderOutreachMessage(d)}
            </div>
          ))}
        </div>
      )
    }
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
      <div className="bg-white border-3 border-black rounded-md overflow-hidden shadow-brutal-sm">
        <div className="flex justify-between items-center p-2 px-4 bg-accent-cyan border-b-3 border-black">
          <span className="font-mono text-[11.5px] font-black text-black uppercase">{channel} Message Preview</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`border-2 border-black rounded-sm py-1 px-2.5 text-[11.5px] font-bold cursor-pointer transition-[transform,box-shadow,background] shadow-[2px_2px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${copied ? 'bg-accent-emerald! text-black' : 'bg-bg-secondary text-text-primary'}`}
              onClick={() => handleCopyMessage(messageText)}
            >
              {copied ? '✔ Copied!' : '📋 Copy Message'}
            </button>
            {channel === 'whatsapp' && (
              <button 
                className="bg-accent-lime! border-2 border-black! shadow-[2px_2px_0px_#000000]! text-black! font-mono text-[11.5px] font-bold py-1 px-2.5 rounded-[4px] cursor-pointer flex items-center gap-1 transition-[transform,box-shadow] duration-75! hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000]! active:translate-x-[1px] active:translate-y-[1px] active:shadow-none!"
                onClick={handleSendWhatsApp}
              >
                💬 SEND ON WHATSAPP
              </button>
            )}
          </div>
        </div>
        
        <div className="p-4 bg-bg-primary">
          <div className={`w-full border-3 border-black rounded-md overflow-hidden shadow-brutal-sm ${channel === 'whatsapp' ? 'bg-[#f0f2f5]' : 'bg-white'}`}>
            {channel === 'whatsapp' && (
              <div className="bg-[#008069] border-b-3 border-black py-1.5 px-3 font-sans text-[11.2px] text-white font-bold">
                <span>RM Assistant • WhatsApp Business</span>
              </div>
            )}
            <div className={`m-2 p-2 ${
              channel === 'whatsapp' ? 'bg-[#e2f9c5] border border-black rounded-md text-black' :
              channel === 'sms' ? 'bg-[#3b82f6] border border-black rounded-lg text-white' :
              'p-4 text-black'
            }`}>
              <pre className="font-mono text-[12.5px] whitespace-pre-wrap">{messageText}</pre>
            </div>
            <div className="flex justify-end gap-1 text-[10.4px] text-[#667781] px-2 pb-2">
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {channel === 'whatsapp' && <span>✓✓</span>}
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
      return <div className="text-center p-4 font-mono text-[12px] text-rose-600 font-bold">Could not parse tool response.</div>
    }

    if (!parsed) return <div className="text-center p-4 font-mono text-[12px] text-text-muted">No data returned.</div>

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
          <div className="font-mono text-[12.5px] text-text-primary bg-white p-2 px-4 border-3 border-black rounded-sm max-h-[200px] overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(parsed, null, 2)}
          </div>
        )
    }
  }

  return (
    <>
      <div 
        className={`inline-flex items-center gap-2.5 border-2 border-black bg-bg-card rounded-md py-1 px-3 shadow-[2px_2px_0px_#000000] cursor-pointer transition-[transform,box-shadow] duration-75 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
          status === 'calling' ? 'tool-chip-calling' : status === 'done' ? 'tool-chip-done' : status === 'error' ? 'tool-chip-error' : ''
        }`}
        onClick={() => setIsModalOpen(true)}
        title="Click to view tool call details"
      >
        <span className="text-[14px] select-none">{icon}</span>
        <span className="font-mono text-[11.5px] font-bold text-text-primary uppercase tracking-wider">{name}</span>
        <span className={`font-mono text-[9.5px] font-black py-0.2 px-1 border border-black rounded-sm ${
          status === 'calling' ? 'bg-accent-orange text-black' : status === 'done' ? 'bg-accent-emerald text-black' : 'bg-accent-rose text-black'
        }`}>
          {status === 'calling' ? '⏳' : status === 'done' ? '✔' : '✘'}
        </span>
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-bg-primary border-4 border-black rounded-xl max-w-[850px] w-full max-h-[85vh] overflow-y-auto shadow-brutal-lg flex flex-col p-6 relative animate-[popIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              className="absolute top-4 right-4 bg-accent-rose text-black border-3 border-black rounded-lg w-9 h-9 flex items-center justify-center font-black font-mono cursor-pointer transition-[transform,box-shadow,background] shadow-[2px_2px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-red-300"
              onClick={() => setIsModalOpen(false)}
              title="CLOSE DETAILS"
            >
              ✖
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-3 border-black">
              <span className="text-2xl select-none">{icon}</span>
              <h3 className="font-display text-[18.8px] font-black text-text-primary uppercase tracking-wide">{name}</h3>
              <span className={`font-mono text-[11px] font-bold py-0.5 px-2 border-2 border-black rounded-md ${
                status === 'calling' ? 'bg-accent-orange text-black' : status === 'done' ? 'bg-accent-emerald text-black' : 'bg-accent-rose text-black'
              }`}>
                {status === 'calling' ? '⏳ CALLING...' : status === 'done' ? '✅ DONE' : '❌ ERROR'}
              </span>
            </div>

            {/* Parameters */}
            <div className="mb-4">
              <div className="font-mono text-[10px] font-bold uppercase text-text-muted mb-1 tracking-wider">PARAMETERS</div>
              <div className="font-mono text-[12.2px] text-text-primary bg-white p-2.5 px-4 border-3 border-black rounded-md max-h-[150px] overflow-y-auto whitespace-pre-wrap">{formatArgs(args)}</div>
            </div>

            {/* Status/Thinking Message when calling */}
            {status === 'calling' && (
              <div className="flex items-center gap-2.5 font-mono text-[12.5px] text-black bg-bg-secondary p-3 px-4 border-3 border-black border-dashed rounded-sm my-2 shadow-[2px_2px_0px_#000]">
                <span className="inline-block animate-spin mr-1">⏳</span>
                <span className="font-extrabold uppercase tracking-wide">Executing API request to {name}...</span>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="mb-2">
                <div className="flex gap-2 border-b-3 border-black mb-4 pb-0.5">
                  <button
                    className={`bg-transparent border-none font-sans font-bold text-[12.8px] uppercase py-1.5 px-3 cursor-pointer border-3 border-black border-b-0 rounded-t-md translate-y-[2px] bg-bg-secondary text-text-primary ${activeTab === 'visual' ? 'bg-accent-yellow text-black! z-10 translate-y-0 shadow-[2px_-2px_0px_#000]' : ''}`}
                    onClick={() => setActiveTab('visual')}
                  >
                    📊 VISUAL_SUMMARY
                  </button>
                  <button
                    className={`bg-transparent border-none font-sans font-bold text-[12.8px] uppercase py-1.5 px-3 cursor-pointer border-3 border-black border-b-0 rounded-t-md translate-y-[2px] bg-bg-secondary text-text-primary ${activeTab === 'json' ? 'bg-accent-yellow text-black! z-10 translate-y-0 shadow-[2px_-2px_0px_#000]' : ''}`}
                    onClick={() => setActiveTab('json')}
                  >
                    💻 RAW_JSON
                  </button>
                </div>

                <div>
                  {activeTab === 'visual' ? (
                    <div className="max-h-[50vh] overflow-y-auto pr-1">
                      {renderVisualResult(name, result)}
                    </div>
                  ) : (
                    <div className="font-mono text-[12px] text-text-primary bg-white p-3 px-4 border-3 border-black rounded-md max-h-[50vh] overflow-y-auto whitespace-pre-wrap">
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
        </div>
      )}
    </>
  )
}
