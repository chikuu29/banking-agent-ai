import { useState, useEffect } from 'react'

export default function CustomerDirectory({ user }) {
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  
  // Selected Customer Details
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerTransactions, setCustomerTransactions] = useState(null)
  const [customerCreditScore, setCustomerCreditScore] = useState(null)
  const [customerEligibility, setCustomerEligibility] = useState(null)
  const [loadingProfileDetail, setLoadingProfileDetail] = useState(false)

  // Customer Form State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [customerForm, setCustomerForm] = useState({
    name: '',
    age: 30,
    gender: 'Male',
    occupation: '',
    annual_income: 500000,
    credit_score: 720,
    relationship_tier: 'Silver',
    phone: '',
    email: '',
    city: '',
    state: '',
    average_balance: 50000,
    total_relationship_value: 100000,
    kyc_status: 'verified',
    existing_products: ['savings_account']
  })

  // Fetch all customers on mount
  useEffect(() => {
    setLoadingCustomers(true)
    fetch('/api/v1/customers?limit=200')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch customers')
        return res.json()
      })
      .then(data => {
        setCustomers(data || [])
        setLoadingCustomers(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingCustomers(false)
      })
  }, [])

  // Fetch customer full profile details when selectedCustomerId changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomer(null)
      setCustomerTransactions(null)
      setCustomerCreditScore(null)
      setCustomerEligibility(null)
      return
    }

    setLoadingProfileDetail(true)
    
    Promise.all([
      fetch(`/api/v1/customers/${selectedCustomerId}`).then(res => res.json()),
      fetch(`/api/v1/customers/${selectedCustomerId}/transactions?months=6`).then(res => res.json()),
      fetch(`/api/v1/customers/${selectedCustomerId}/credit-score`).then(res => res.json()),
      fetch(`/api/v1/customers/${selectedCustomerId}/product-eligibility`).then(res => res.json())
    ])
      .then(([profile, txns, credit, eligibility]) => {
        setSelectedCustomer(profile)
        setCustomerTransactions(txns)
        setCustomerCreditScore(credit)
        setCustomerEligibility(eligibility)
        setLoadingProfileDetail(false)
      })
      .catch(err => {
        console.error('Error fetching customer details:', err)
        setSelectedCustomerId(null)
        setLoadingProfileDetail(false)
      })
  }, [selectedCustomerId])

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.id.toString() === searchQuery
    const matchesTier = tierFilter === 'ALL' || c.relationship_tier.toUpperCase() === tierFilter.toUpperCase()
    return matchesSearch && matchesTier
  })

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'var(--color-accent-violet)'
      case 'gold': return 'var(--color-accent-yellow)'
      case 'silver': return 'var(--color-accent-cyan)'
      case 'bronze': return 'var(--color-accent-orange)'
      default: return 'var(--color-bg-secondary)'
    }
  }

  const handleAddCustomerSubmit = (e) => {
    e.preventDefault()
    fetch('/api/v1/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...customerForm,
        age: parseInt(customerForm.age) || 30,
        annual_income: parseFloat(customerForm.annual_income) || 0,
        credit_score: parseInt(customerForm.credit_score) || 300,
        average_balance: parseFloat(customerForm.average_balance) || 0,
        total_relationship_value: parseFloat(customerForm.total_relationship_value) || 0
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to create customer')
        return res.json()
      })
      .then(() => {
        fetch('/api/v1/customers?limit=200')
          .then(res => res.json())
          .then(data => setCustomers(data || []))
        
        setShowAddCustomerModal(false)
        setCustomerForm({
          name: '',
          age: 30,
          gender: 'Male',
          occupation: '',
          annual_income: 500000,
          credit_score: 720,
          relationship_tier: 'Silver',
          phone: '',
          email: '',
          city: '',
          state: '',
          average_balance: 50000,
          total_relationship_value: 100000,
          kyc_status: 'verified',
          existing_products: ['savings_account']
        })
      })
      .catch(err => {
        alert(err.message)
      })
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full relative w-full">
      {/* Left panel: List with filters */}
      <div className={`w-full min-w-full flex-col h-full bg-bg-secondary border-black md:w-[38%] md:min-w-[340px] md:border-r-3 md:flex ${selectedCustomerId ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b-3 border-black bg-bg-primary flex justify-between items-center">
          <h3 className="font-display text-[14.4px] font-black uppercase">👤 CUSTOMER_DIRECTORY</h3>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11.2px] bg-text-primary text-bg-secondary py-0.5 px-1.5 font-bold">{filteredCustomers.length} RECORDS</span>
            <button 
              onClick={() => setShowAddCustomerModal(true)}
              className="bg-accent-lime text-black border-3 border-black rounded-sm py-1 px-2 text-[10.8px] shadow-[1.5px_1.5px_0px_#000000] cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2.5px_2.5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              ➕ ADD_NEW
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="p-2 px-4 border-b-3 border-black flex gap-2 bg-bg-secondary">
          <input 
            type="text" 
            placeholder="🔍 Search name, city or ID..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 py-1 px-2 border-3 border-black font-sans text-[12.8px] outline-none bg-bg-input text-text-primary md:text-[16px]!"
          />
          <select 
            value={tierFilter} 
            onChange={e => setTierFilter(e.target.value)}
            className="p-1 border-3 border-black font-sans text-[12px] font-bold outline-none bg-bg-card text-text-primary md:text-[16px]!"
          >
            <option value="ALL">ALL TIERS</option>
            <option value="PLATINUM">PLATINUM</option>
            <option value="GOLD">GOLD</option>
            <option value="SILVER">SILVER</option>
            <option value="BRONZE">BRONZE</option>
          </select>
        </div>

        {/* Customers table list */}
        <div className="flex-1 overflow-y-auto">
          {loadingCustomers ? (
            <div className="flex flex-col items-center justify-center text-center p-12 font-mono text-[13.6px] text-text-secondary h-full">DECRYPTING DB RECORDS...</div>
          ) : filteredCustomers.length > 0 ? (
            <table className="w-full border-collapse text-left block w-full overflow-x-auto touch-pan-x md:table md:overflow-visible [&_th]:bg-bg-primary [&_th]:border-b-3 [&_th]:border-black [&_th]:p-2 [&_th]:px-4 [&_th]:font-display [&_th]:text-[12px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-wider [&_td]:p-2 [&_td]:px-4 [&_td]:border-b [&_td]:border-text-muted [&_td]:text-[12.8px] [&_td]:font-sans">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>NAME</th>
                  <th>TIER</th>
                  <th>CITY</th>
                  <th>INCOME</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr 
                    key={c.id} 
                    className={`cursor-pointer transition-colors duration-80 hover:bg-black/5 ${selectedCustomerId === c.id ? 'bg-accent-yellow! text-black! [&_code]:text-black! [&_strong]:text-black!' : ''}`}
                    onClick={() => setSelectedCustomerId(c.id)}
                  >
                    <td><code>#{c.id}</code></td>
                    <td><strong>{c.name}</strong></td>
                    <td>
                      <span 
                        className="text-[10.4px] font-black uppercase py-0.5 px-1.5 border border-black text-black rounded-sm" 
                        style={{ background: getTierColor(c.relationship_tier) }}
                      >
                        {c.relationship_tier}
                      </span>
                    </td>
                    <td>{c.city}</td>
                    <td>{formatCurrency(c.annual_income)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 font-mono text-[13.6px] text-text-secondary h-full">NO CUSTOMERS MATCH THE FILTER SCHEMATIC.</div>
          )}
        </div>
      </div>

      {/* Right panel: Detail Customer 360 View */}
      <div className={`h-full flex-col overflow-hidden bg-bg-primary md:flex md:flex-1 ${selectedCustomerId ? 'flex w-full' : 'hidden'}`}>
        {selectedCustomerId && (
          <div className="flex md:hidden bg-bg-secondary border-b-3 border-black p-2 px-4 items-center">
            <button 
              className="bg-bg-card border-3 border-black text-text-primary font-mono font-bold text-[11.5px] py-1.5 px-3 cursor-pointer shadow-[2px_2px_0px_#000000] transition-[transform,box-shadow,background] duration-80 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_#000000] hover:bg-accent-yellow active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]" 
              onClick={() => setSelectedCustomerId(null)}
              title="BACK TO DIRECTORY"
            >
              ⬅ BACK TO DIRECTORY
            </button>
          </div>
        )}
        {selectedCustomerId ? (
          loadingProfileDetail ? (
            <div className="flex flex-col items-center justify-center text-center p-12 font-mono text-[13.6px] text-text-secondary h-full">
              <div className="flex gap-1.5 items-center mb-2">
                <span className="w-2.5 h-2.5 bg-black rounded-full inline-block animate-bounce" style={{ animationDelay: '-0.32s' }}></span>
                <span className="w-2.5 h-2.5 bg-black rounded-full inline-block animate-bounce" style={{ animationDelay: '-0.16s' }}></span>
                <span className="w-2.5 h-2.5 bg-black rounded-full inline-block animate-bounce"></span>
              </div>
              Retrieving complete 360° portfolio matrix for customer #{selectedCustomerId}...
            </div>
          ) : selectedCustomer ? (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 md:p-4">
              {/* Customer Header Info */}
              <div className="p-4 px-6 border-3 border-black shadow-brutal-sm flex justify-between items-center text-black md:flex-col md:items-start md:gap-2" style={{ background: getTierColor(selectedCustomer.relationship_tier) }}>
                <div>
                  <h2 className="font-display text-[25.6px] font-black uppercase break-words" title={selectedCustomer.name}>{selectedCustomer.name}</h2>
                  <div className="text-[12px] font-mono mt-1">
                    <span>ID: <code>#{selectedCustomer.id}</code></span> | 
                    <span> TIER: <strong>{selectedCustomer.relationship_tier}</strong></span> |
                    <span> KYC: <strong className={selectedCustomer.kyc_status === 'verified' ? 'text-green-800' : 'text-red-600'}>{selectedCustomer.kyc_status.toUpperCase()}</strong></span>
                  </div>
                </div>
                <div className="text-[48px] leading-none md:self-end md:-mt-8">
                  {selectedCustomer.gender === 'Male' ? '👨' : '👩'}
                </div>
              </div>

              {/* Split sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Demographics & Contact */}
                <div className="bg-bg-secondary border-3 border-black p-4 shadow-brutal-sm">
                  <h4 className="font-display text-[12.8px] font-black uppercase mb-4 border-b-2 border-text-primary pb-1 flex justify-between">👤 DEMOGRAPHICS & CONTACTS</h4>
                  <table className="w-full border-collapse [&_td]:py-1.5 [&_td]:text-[12.8px] [&_td]:border-b [&_td]:border-dashed [&_td]:border-text-muted [&_td:first-child]:font-mono [&_td:first-child]:text-[11.5px] [&_td:first-child]:text-text-muted [&_td:first-child]:w-[45%] [&_td:last-child]:text-right [&_td:last-child]:font-semibold">
                    <tbody>
                      <tr><td>AGE / GENDER</td><td>{selectedCustomer.age} yrs / {selectedCustomer.gender}</td></tr>
                      <tr><td>OCCUPATION</td><td><span className="break-words">{selectedCustomer.occupation}</span></td></tr>
                      <tr><td>PHONE NUMBER</td><td><code className="break-all">{selectedCustomer.phone}</code></td></tr>
                      <tr><td>EMAIL ADDRESS</td><td><code className="break-all whitespace-normal" title={selectedCustomer.email}>{selectedCustomer.email}</code></td></tr>
                      <tr><td>LOCATION</td><td><span className="break-words">{selectedCustomer.city}, {selectedCustomer.state}</span></td></tr>
                    </tbody>
                  </table>
                </div>

                {/* Financial Summary & Credit Score */}
                <div className="bg-bg-secondary border-3 border-black p-4 shadow-brutal-sm">
                  <h4 className="font-display text-[12.8px] font-black uppercase mb-4 border-b-2 border-text-primary pb-1 flex justify-between">📊 FINANCIAL STATS</h4>
                  <table className="w-full border-collapse [&_td]:py-1.5 [&_td]:text-[12.8px] [&_td]:border-b [&_td]:border-dashed [&_td]:border-text-muted [&_td:first-child]:font-mono [&_td:first-child]:text-[11.5px] [&_td:first-child]:text-text-muted [&_td:first-child]:w-[45%] [&_td:last-child]:text-right [&_td:last-child]:font-semibold">
                    <tbody>
                      <tr><td>ANNUAL INCOME</td><td><strong>{formatCurrency(selectedCustomer.annual_income)}</strong></td></tr>
                      <tr><td>AVG ACCOUNT BALANCE</td><td>{formatCurrency(selectedCustomer.average_balance)}</td></tr>
                      <tr><td>TOTAL VALUE (TRV)</td><td><strong>{formatCurrency(selectedCustomer.total_relationship_value)}</strong></td></tr>
                      <tr><td>ACCOUNT TENURE</td><td>{selectedCustomer.account_tenure_years} Years</td></tr>
                    </tbody>
                  </table>

                  {/* Credit Score Meter */}
                  {customerCreditScore && (
                    <div className="mt-4 pt-4 border-t-2 border-text-primary">
                      <div className="flex justify-between items-center text-[12.8px] font-bold">
                        <span>CREDIT SCORE:</span>
                        <strong 
                          className={`py-0.5 px-2 border border-black text-black rounded-sm font-mono text-[12px] ${
                            customerCreditScore.rating.toLowerCase() === 'excellent' ? 'bg-accent-lime' : 
                            customerCreditScore.rating.toLowerCase() === 'good' ? 'bg-accent-cyan' :
                            customerCreditScore.rating.toLowerCase() === 'fair' ? 'bg-accent-yellow' : 'bg-accent-rose'
                          }`}
                        >
                          {customerCreditScore.score} ({customerCreditScore.rating})
                        </strong>
                      </div>
                      {/* Colored Meter bar */}
                      <div className="mt-2">
                        <div className="h-3 bg-bg-primary border-2 border-black relative">
                          <div 
                            className="h-full transition-[width] duration-500 ease-out" 
                            style={{ 
                              width: `${((customerCreditScore.score - 300) / 550) * 100}%`,
                              background: customerCreditScore.score >= 750 ? 'var(--color-accent-lime)' : 
                                          customerCreditScore.score >= 700 ? 'var(--color-accent-cyan)' :
                                          customerCreditScore.score >= 650 ? 'var(--color-accent-yellow)' : 'var(--color-accent-rose)'
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[9.6px] font-mono mt-1 text-text-muted">
                          <span>300 (POOR)</span>
                          <span>850 (EXCELLENT)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Credit Factors List */}
              {customerCreditScore && (
                <div className="bg-bg-secondary border-3 border-black p-4 shadow-brutal-sm">
                  <h4 className="font-display text-[12.8px] font-black uppercase mb-4 border-b-2 border-text-primary pb-1 flex justify-between">🎗️ CREDIT ASSESSMENT FACTORS</h4>
                  <div className="flex flex-col gap-2">
                    {customerCreditScore.factors.map((factor, index) => (
                      <div 
                        key={index} 
                        className={`flex gap-2 p-2 border border-text-primary bg-bg-primary ${
                          factor.impact === 'positive' ? 'border-l-[5px]! border-l-accent-emerald!' : 
                          factor.impact === 'negative' ? 'border-l-[5px]! border-l-accent-rose!' : 
                          'border-l-[5px]! border-l-accent-blue!'
                        }`}
                      >
                        <span className="text-[17.6px]">
                          {factor.impact === 'positive' ? '✅' : factor.impact === 'negative' ? '❌' : 'ℹ️'}
                        </span>
                        <div className="flex-1">
                          <strong className="text-[12.8px] uppercase">{factor.name}</strong>
                          <p className="text-[12px] text-text-secondary mt-0.5">{factor.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Products */}
              <div className="bg-bg-secondary border-3 border-black p-4 shadow-brutal-sm">
                <h4 className="font-display text-[12.8px] font-black uppercase mb-4 border-b-2 border-text-primary pb-1 flex justify-between">📦 OWNED BANKING PRODUCTS</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.existing_products && selectedCustomer.existing_products.length > 0 ? (
                    selectedCustomer.existing_products.map((p, idx) => (
                      <span key={idx} className="bg-accent-cyan text-black border border-black py-1 px-2.5 text-[11.5px] font-bold font-mono">
                        💎 {p.replace('_', ' ').toUpperCase()}
                      </span>
                    ))
                  ) : (
                    <p className="text-[12.5px] leading-[1.4] text-text-secondary">No active banking products recorded.</p>
                  )}
                </div>
              </div>

              {/* Transaction History & aggregates */}
              {customerTransactions && (
                <div className="bg-bg-secondary border-3 border-black p-4 shadow-brutal-sm">
                  <h4 className="font-display text-[12.8px] font-black uppercase mb-4 border-b-2 border-text-primary pb-1 flex justify-between">💸 TRANSACTION STATEMENT & SPENDING ANALYSIS (6 MONTHS)</h4>
                  
                  {/* Aggregates block */}
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 mb-4">
                    <div className="bg-bg-primary border border-text-primary p-2 flex flex-col">
                      <span className="text-[9.6px] font-mono text-text-muted">TOTAL INCOME CREDITED</span>
                      <span className="text-[17.6px] font-black font-mono text-green-700">{formatCurrency(customerTransactions.summary?.total_income_credited)}</span>
                    </div>
                    <div className="bg-bg-primary border border-text-primary p-2 flex flex-col">
                      <span className="text-[9.6px] font-mono text-text-muted">TOTAL EXPENSES DEBITED</span>
                      <span className="text-[17.6px] font-black font-mono text-accent-rose">{formatCurrency(customerTransactions.summary?.total_expenses_debited)}</span>
                    </div>
                    <div className="bg-bg-primary border border-text-primary p-2 flex flex-col">
                      <span className="text-[9.6px] font-mono text-text-muted">SURPLUS / SAVINGS</span>
                      <span className={`text-[17.6px] font-black font-mono ${(customerTransactions.summary?.total_income_credited - customerTransactions.summary?.total_expenses_debited) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {formatCurrency(customerTransactions.summary?.total_income_credited - customerTransactions.summary?.total_expenses_debited)}
                      </span>
                    </div>
                    <div className="bg-bg-primary border border-text-primary p-2 flex flex-col">
                      <span className="text-[9.6px] font-mono text-text-muted">EMI BURDEN RATIO</span>
                      <span className="text-[17.6px] font-black font-mono text-accent-purple">
                        {customerTransactions.summary?.emi_burden_ratio !== undefined ? `${(customerTransactions.summary.emi_burden_ratio * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* Top spending categories */}
                  <div className="mt-3 mb-4">
                    <strong className="text-xs block mb-1.5">TOP CATEGORY SPENDS:</strong>
                    <div className="flex flex-wrap">
                      {customerTransactions.summary?.top_spending_categories && 
                        Object.entries(customerTransactions.summary.top_spending_categories).map(([cat, amt]) => (
                          <span key={cat} className="bg-bg-primary border border-text-primary py-0.5 px-2 text-[11.2px] font-mono inline-block mr-1.5 mb-1.5">
                            🍕 {cat.toUpperCase()}: <strong>{formatCurrency(amt)}</strong>
                          </span>
                        ))
                      }
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse [&_th]:bg-bg-primary [&_th]:border-b-2 [&_th]:border-text-primary [&_th]:p-1.5 [&_th]:text-[10.4px] [&_th]:font-mono [&_td]:p-2 [&_td]:px-1.5 [&_td]:text-[12px] [&_td]:border-b [&_td]:border-dashed [&_td]:border-text-muted">
                      <thead>
                        <tr>
                          <th>DATE</th>
                          <th>CATEGORY</th>
                          <th>DESCRIPTION</th>
                          <th>TYPE</th>
                          <th>AMOUNT</th>
                          <th>BALANCE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerTransactions.transactions && customerTransactions.transactions.map((t, idx) => (
                          <tr key={idx}>
                            <td><code>{t.date}</code></td>
                            <td><span className="text-[10.4px] bg-bg-primary py-0.5 px-1.5 border border-text-muted">{t.category}</span></td>
                            <td>{t.description}</td>
                            <td>
                              <span className={`text-[11px] font-bold py-0.5 px-1 rounded-sm ${t.type === 'credit' ? 'bg-accent-emerald text-black' : 'bg-accent-rose text-black'}`}>
                                {t.type.toUpperCase()}
                              </span>
                            </td>
                            <td><strong className={t.type === 'credit' ? 'text-green-700' : 'text-red-600'}>
                              {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                            </strong></td>
                            <td>{formatCurrency(t.balance_after)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Eligible Products Recommendations */}
              {customerEligibility && (
                <div className="bg-bg-secondary border-3 border-black p-4 shadow-brutal-sm">
                  <h4 className="font-display text-[12.8px] font-black uppercase mb-4 border-b-2 border-text-primary pb-1 flex justify-between">🎯 CROSS-SELL RECOMMENDATIONS & PRODUCT ELIGIBILITY</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {customerEligibility.eligible_products && customerEligibility.eligible_products.map((p, idx) => (
                      <div 
                        key={idx} 
                        className={`bg-bg-primary border border-text-primary p-4 flex flex-col gap-2 ${
                          p.eligible ? 'border-l-6! border-l-accent-emerald!' : 'border-l-6! border-l-accent-rose! opacity-80'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <h5 className="font-display text-[12.8px] font-extrabold uppercase">{p.product_name}</h5>
                          <span className={`text-[9.6px] font-black py-0.5 px-1.5 border border-black text-black ${p.eligible ? 'bg-accent-lime' : 'bg-accent-rose'}`}>
                            {p.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                          </span>
                        </div>
                        <div className="text-[11.2px] flex items-center gap-2">
                          <span>FIT SCORE:</span>
                          <div className="flex-1 h-2 bg-bg-secondary border border-black flex items-center relative">
                            <div className="h-full" style={{ width: `${p.fit_score}%`, background: p.fit_score > 70 ? 'var(--color-accent-lime)' : p.fit_score > 40 ? 'var(--color-accent-yellow)' : 'var(--color-accent-rose)' }}></div>
                            <span className="text-[10.4px] font-mono font-bold ml-1.5 absolute right-[-45px]">{p.fit_score}/100</span>
                          </div>
                        </div>
                        <div className="text-[11.2px] mt-2">
                          <strong>CRITERIA VERDICT:</strong>
                          <ul className="pl-3.5 mt-1 list-disc">
                            {p.reasons.map((r, rIdx) => <li key={rIdx} className="mb-0.5 text-text-secondary">{r}</li>)}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interaction Timeline */}
              <div className="bg-bg-secondary border-3 border-black p-4 shadow-brutal-sm mb-6">
                <h4 className="font-display text-[12.8px] font-black uppercase mb-4 border-b-2 border-text-primary pb-1 flex justify-between">📞 RECENT RM INTERACTION LOGS</h4>
                <div className="flex flex-col relative pl-5 before:content-[''] before:absolute before:left-1 before:top-1 before:bottom-1 before:w-[2px] before:bg-text-primary">
                  {selectedCustomer.recent_interactions && selectedCustomer.recent_interactions.length > 0 ? (
                    selectedCustomer.recent_interactions.map((inter, idx) => (
                      <div key={idx} className="relative mb-4">
                        <div className="absolute -left-6 top-0.5 bg-bg-primary border border-text-primary w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10.4px]">
                          <span>💬</span>
                        </div>
                        <div className="bg-bg-primary border border-text-primary p-2 px-4">
                          <div className="flex flex-wrap gap-2 text-[10.4px] font-mono mb-1">
                            <span className="font-bold">{inter.date}</span>
                            <span className="bg-accent-orange text-black py-0.5 px-1">{inter.channel.toUpperCase()}</span>
                            <span className="bg-accent-violet text-black py-0.5 px-1">{inter.type.replace('_', ' ')}</span>
                          </div>
                          {inter.product_discussed && (
                            <div className="text-[11.2px] mb-1">Product: <code>{inter.product_discussed}</code></div>
                          )}
                          <p className="text-[12px] italic text-text-secondary">"{inter.notes}"</p>
                          <div className="text-[10.4px] mt-1 text-right font-mono">
                            Outcome: <strong className={inter.outcome === 'resolved' || inter.outcome === 'completed' || inter.outcome === 'interested' ? 'text-green-700' : ''}>{inter.outcome.toUpperCase()}</strong>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12.5px] leading-[1.4] text-text-secondary">No recent interactions logged with Relationship Managers.</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 font-mono text-[13.6px] text-text-secondary h-full">CUSTOMER DETAILS RETRIEVAL FAILED.</div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-12 font-mono text-[13.6px] text-text-secondary h-full">
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👤</div>
            <h3 className="font-mono text-sm font-bold uppercase">NO CUSTOMER PORTFOLIO DECRYPTED</h3>
            <p className="max-w-[450px] font-sans text-[13.6px] mt-2 text-text-muted">Select a customer record from the directory list on the left to analyze demographics, financial health, transactions, and product matching metrics.</p>
          </div>
        )}
      </div>

      {/* ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000] p-4 backdrop-blur-[2px]" onClick={() => setShowAddCustomerModal(false)}>
          <div className="bg-bg-secondary border-3 border-black shadow-brutal-lg w-full max-w-[650px] flex flex-col max-h-[90vh] overflow-hidden animate-[messageSlideIn_0.2s_cubic-bezier(0.16,1,0.3,1)]" onClick={e => e.stopPropagation()}>
            <div className="border-b-3 border-black p-4 flex justify-between items-center text-black bg-accent-yellow">
              <h3 className="font-display text-[17.6px] font-black tracking-wider">👤 REGISTER NEW CLIENT</h3>
              <button className="bg-white border-3 border-black cursor-pointer font-bold py-0.5 px-2 shadow-[2px_2px_0px_#000000] text-black font-sans transition-[transform,box-shadow] duration-80 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]" onClick={() => setShowAddCustomerModal(false)}>✖</button>
            </div>
            <form onSubmit={handleAddCustomerSubmit} className="p-4 px-6 overflow-y-auto flex flex-col gap-4 bg-bg-primary">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">NAME</label>
                  <input type="text" required value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="e.g. Rahul Sharma" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">AGE</label>
                  <input type="number" required value={customerForm.age} onChange={e => setCustomerForm({...customerForm, age: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">GENDER</label>
                  <select value={customerForm.gender} onChange={e => setCustomerForm({...customerForm, gender: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">OCCUPATION</label>
                  <input type="text" required value={customerForm.occupation} onChange={e => setCustomerForm({...customerForm, occupation: e.target.value})} placeholder="e.g. Software Engineer" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">ANNUAL INCOME (INR)</label>
                  <input type="number" required value={customerForm.annual_income} onChange={e => setCustomerForm({...customerForm, annual_income: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">CREDIT SCORE</label>
                  <input type="number" required min="300" max="850" value={customerForm.credit_score} onChange={e => setCustomerForm({...customerForm, credit_score: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">RELATIONSHIP TIER</label>
                  <select value={customerForm.relationship_tier} onChange={e => setCustomerForm({...customerForm, relationship_tier: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!">
                    <option value="Platinum">Platinum</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Bronze">Bronze</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">KYC STATUS</label>
                  <select value={customerForm.kyc_status} onChange={e => setCustomerForm({...customerForm, kyc_status: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!">
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">PHONE</label>
                  <input type="text" required value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="+91 98765 43210" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">EMAIL</label>
                  <input type="email" required value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} placeholder="rahul@example.com" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">CITY</label>
                  <input type="text" required value={customerForm.city} onChange={e => setCustomerForm({...customerForm, city: e.target.value})} placeholder="Mumbai" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">STATE</label>
                  <input type="text" required value={customerForm.state} onChange={e => setCustomerForm({...customerForm, state: e.target.value})} placeholder="Maharashtra" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">AVG ACCOUNT BALANCE (INR)</label>
                  <input type="number" required value={customerForm.average_balance} onChange={e => setCustomerForm({...customerForm, average_balance: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">TOTAL RELATIONSHIP VALUE (INR)</label>
                  <input type="number" required value={customerForm.total_relationship_value} onChange={e => setCustomerForm({...customerForm, total_relationship_value: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
              </div>
              <button type="submit" className="bg-accent-lime text-black! font-sans font-bold uppercase p-3 border-3 border-black shadow-brutal-sm cursor-pointer transition-all duration-80 text-center text-[13.1px] mt-2 w-full hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal-md hover:bg-accent-lime-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">COMMIT DATABASE ENTRY</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
