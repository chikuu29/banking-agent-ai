import { useState, useEffect } from 'react'

export default function CoreMetrics({ activeTab, onSelectTab, user }) {
  // State for Customers Tab
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  
  // State for Selected Customer Profile Detail
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerTransactions, setCustomerTransactions] = useState(null)
  const [customerCreditScore, setCustomerCreditScore] = useState(null)
  const [customerEligibility, setCustomerEligibility] = useState(null)
  const [loadingProfileDetail, setLoadingProfileDetail] = useState(false)

  // State for Products Tab
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // State for AI Tools Tab
  const [aiTools, setAiTools] = useState([])
  const [loadingTools, setLoadingTools] = useState(false)

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
  
  // Product Form State
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [productForm, setProductForm] = useState({
    name: '',
    type: 'personal_loan',
    min_income: 0,
    min_credit_score: 0,
    interest_rate: '',
    description: '',
    features_raw: '',
    max_amount: '',
    tenure_months: ''
  })

  // Fetch all customers on mount or when Customers tab becomes active
  useEffect(() => {
    if (activeTab === 'customers') {
      setLoadingCustomers(true)
      // fetch with higher limit to get all seeded customers
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
    }
  }, [activeTab])

  // Fetch product list when Products tab is active
  useEffect(() => {
    if (activeTab === 'products') {
      setLoadingProducts(true)
      fetch('/api/v1/products')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch products')
          return res.json()
        })
        .then(data => {
          setProducts(data || [])
          setLoadingProducts(false)
        })
        .catch(err => {
          console.error(err)
          setLoadingProducts(false)
        })
    }
  }, [activeTab])

  // Fetch AI tools metadata when AI Tools tab is active
  useEffect(() => {
    if (activeTab === 'aitools') {
      setLoadingTools(true)
      fetch('/api/v1/meta/tools')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch tool metadata')
          return res.json()
        })
        .then(data => {
          setAiTools(data || [])
          setLoadingTools(false)
        })
        .catch(err => {
          console.error(err)
          setLoadingTools(false)
        })
    }
  }, [activeTab])

  // Fetch customer full profile details when a customer is selected
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomer(null)
      setCustomerTransactions(null)
      setCustomerCreditScore(null)
      setCustomerEligibility(null)
      return
    }

    setLoadingProfileDetail(true)
    
    // Fetch main profile, transactions, credit score, and product eligibility in parallel
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
        setLoadingProfileDetail(false)
      })

  }, [selectedCustomerId])

  // Filter customers based on search and tier dropdown
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.id.toString() === searchQuery
    const matchesTier = tierFilter === 'ALL' || c.relationship_tier.toUpperCase() === tierFilter.toUpperCase()
    return matchesSearch && matchesTier
  })

  // Format currency in INR formatting
  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  // Get tier styling color for neo-brutalist theme
  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'var(--accent-violet)'
      case 'gold': return 'var(--accent-yellow)'
      case 'silver': return 'var(--accent-cyan)'
      case 'bronze': return 'var(--accent-orange)'
      default: return 'var(--bg-secondary)'
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
        // Refetch customers list
        fetch('/api/v1/customers?limit=200')
          .then(res => res.json())
          .then(data => setCustomers(data || []))
        
        setShowAddCustomerModal(false)
        // Reset form
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

  const handleAddProductSubmit = (e) => {
    e.preventDefault()
    
    const features = productForm.features_raw
      ? productForm.features_raw.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const payload = {
      name: productForm.name,
      type: productForm.type,
      min_income: parseFloat(productForm.min_income) || 0,
      min_credit_score: parseInt(productForm.min_credit_score) || 0,
      interest_rate: productForm.interest_rate ? parseFloat(productForm.interest_rate) : null,
      description: productForm.description,
      features: features,
      max_amount: productForm.max_amount ? parseFloat(productForm.max_amount) : null,
      tenure_months: productForm.tenure_months ? parseInt(productForm.tenure_months) : null
    }

    fetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to create product')
        return res.json()
      })
      .then(() => {
        // Refetch products list
        fetch('/api/v1/products')
          .then(res => res.json())
          .then(data => setProducts(data || []))
        
        setShowAddProductModal(false)
        setProductForm({
          name: '',
          type: 'personal_loan',
          min_income: 0,
          min_credit_score: 0,
          interest_rate: '',
          description: '',
          features_raw: '',
          max_amount: '',
          tenure_months: ''
        })
      })
      .catch(err => {
        alert(err.message)
      })
  }

  return (
    <div className="metrics-panel">
      {/* Sub-panels based on active tab */}
      {activeTab === 'customers' && (
        <div className={`customers-workspace ${selectedCustomerId ? 'customer-selected' : ''}`}>
          {/* Left panel: List with filters */}
          <div className="customers-list-panel">
            <div className="panel-header-brutalist">
              <h3>👤 CUSTOMER_DIRECTORY</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="count-badge">{filteredCustomers.length} RECORDS</span>
                <button 
                  onClick={() => setShowAddCustomerModal(true)}
                  className="neo-btn"
                  style={{
                    background: 'var(--accent-lime)',
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    boxShadow: '1.5px 1.5px 0px #000',
                    color: '#000'
                  }}
                >
                  ➕ ADD_NEW
                </button>
              </div>
            </div>

            {/* Filters bar */}
            <div className="filters-bar">
              <input 
                type="text" 
                placeholder="🔍 Search name, city or ID..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
              <select 
                value={tierFilter} 
                onChange={e => setTierFilter(e.target.value)}
                className="filter-tier-select"
              >
                <option value="ALL">ALL TIERS</option>
                <option value="PLATINUM">PLATINUM</option>
                <option value="GOLD">GOLD</option>
                <option value="SILVER">SILVER</option>
                <option value="BRONZE">BRONZE</option>
              </select>
            </div>

            {/* Customers table list */}
            <div className="customers-table-container">
              {loadingCustomers ? (
                <div className="loading-state">DECRYPTING DB RECORDS...</div>
              ) : filteredCustomers.length > 0 ? (
                <table className="brutalist-table">
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
                        className={`customer-row ${selectedCustomerId === c.id ? 'selected' : ''}`}
                        onClick={() => setSelectedCustomerId(c.id)}
                      >
                        <td><code>#{c.id}</code></td>
                        <td><strong>{c.name}</strong></td>
                        <td>
                          <span 
                            className="tier-tag" 
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
                <div className="no-records">NO CUSTOMERS MATCH THE FILTER SCHEMATIC.</div>
              )}
            </div>
          </div>

          {/* Right panel: Detail Customer 360 View */}
          <div className="customer-detail-panel">
            {selectedCustomerId && (
              <div className="mobile-detail-header-bar">
                <button 
                  className="back-to-list-btn" 
                  onClick={() => setSelectedCustomerId(null)}
                  title="BACK TO DIRECTORY"
                >
                  ⬅ BACK TO DIRECTORY
                </button>
              </div>
            )}
            {selectedCustomerId ? (
              loadingProfileDetail ? (
                <div className="loading-state-details">
                  <div className="loader-dots">
                    <span></span><span></span><span></span>
                  </div>
                  Retrieving complete 360° portfolio matrix for customer #{selectedCustomerId}...
                </div>
              ) : selectedCustomer ? (
                <div className="customer-details-scrollable">
                  {/* Customer Header Info */}
                  <div className="detail-banner" style={{ background: getTierColor(selectedCustomer.relationship_tier) }}>
                    <div className="detail-banner-title">
                      <h2>{selectedCustomer.name}</h2>
                      <div className="detail-banner-sub">
                        <span>ID: <code>#{selectedCustomer.id}</code></span> | 
                        <span> TIER: <strong>{selectedCustomer.relationship_tier}</strong></span> |
                        <span> KYC: <strong style={{ color: selectedCustomer.kyc_status === 'verified' ? '#006400' : 'red' }}>{selectedCustomer.kyc_status.toUpperCase()}</strong></span>
                      </div>
                    </div>
                    <div className="detail-banner-avatar">
                      {selectedCustomer.gender === 'Male' ? '👨' : '👩'}
                    </div>
                  </div>

                  {/* Split sections */}
                  <div className="details-grid">
                    
                    {/* Demographics & Contact */}
                    <div className="details-card">
                      <h4>👤 DEMOGRAPHICS & CONTACTS</h4>
                      <table className="info-table-brutalist">
                        <tbody>
                          <tr><td>AGE / GENDER</td><td>{selectedCustomer.age} yrs / {selectedCustomer.gender}</td></tr>
                          <tr><td>OCCUPATION</td><td>{selectedCustomer.occupation}</td></tr>
                          <tr><td>PHONE NUMBER</td><td><code>{selectedCustomer.phone}</code></td></tr>
                          <tr><td>EMAIL ADDRESS</td><td><code>{selectedCustomer.email}</code></td></tr>
                          <tr><td>LOCATION</td><td>{selectedCustomer.city}, {selectedCustomer.state}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Financial Summary & Credit Score */}
                    <div className="details-card">
                      <h4>📊 FINANCIAL STATS</h4>
                      <table className="info-table-brutalist">
                        <tbody>
                          <tr><td>ANNUAL INCOME</td><td><strong>{formatCurrency(selectedCustomer.annual_income)}</strong></td></tr>
                          <tr><td>AVG ACCOUNT BALANCE</td><td>{formatCurrency(selectedCustomer.average_balance)}</td></tr>
                          <tr><td>TOTAL VALUE (TRV)</td><td><strong>{formatCurrency(selectedCustomer.total_relationship_value)}</strong></td></tr>
                          <tr><td>ACCOUNT TENURE</td><td>{selectedCustomer.account_tenure_years} Years</td></tr>
                        </tbody>
                      </table>

                      {/* Credit Score Meter */}
                      {customerCreditScore && (
                        <div className="credit-score-section">
                          <div className="credit-score-header">
                            <span>CREDIT SCORE:</span>
                            <strong className={`credit-rating-badge ${customerCreditScore.rating.toLowerCase()}`}>
                              {customerCreditScore.score} ({customerCreditScore.rating})
                            </strong>
                          </div>
                          {/* Colored Meter bar */}
                          <div className="credit-meter-wrapper">
                            <div className="credit-meter-bg">
                              <div 
                                className="credit-meter-filler" 
                                style={{ 
                                  width: `${((customerCreditScore.score - 300) / 550) * 100}%`,
                                  background: customerCreditScore.score >= 750 ? 'var(--accent-lime)' : 
                                              customerCreditScore.score >= 700 ? 'var(--accent-cyan)' :
                                              customerCreditScore.score >= 650 ? 'var(--accent-yellow)' : 'var(--accent-rose)'
                                }}
                              ></div>
                            </div>
                            <div className="credit-meter-labels">
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
                    <div className="details-card-full">
                      <h4>🎗️ CREDIT ASSESSMENT FACTORS</h4>
                      <div className="credit-factors-list">
                        {customerCreditScore.factors.map((factor, index) => (
                          <div key={index} className={`credit-factor-item ${factor.impact}`}>
                            <span className="factor-bullet">
                              {factor.impact === 'positive' ? '✅' : factor.impact === 'negative' ? '❌' : 'ℹ️'}
                            </span>
                            <div className="factor-details">
                              <strong>{factor.name}</strong>
                              <p>{factor.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Existing Products */}
                  <div className="details-card-full">
                    <h4>📦 OWNED BANKING PRODUCTS</h4>
                    <div className="products-tags-wrapper">
                      {selectedCustomer.existing_products && selectedCustomer.existing_products.length > 0 ? (
                        selectedCustomer.existing_products.map((p, idx) => (
                          <span key={idx} className="product-tag-owned">
                            💎 {p.replace('_', ' ').toUpperCase()}
                          </span>
                        ))
                      ) : (
                        <p>No active banking products recorded.</p>
                      )}
                    </div>
                  </div>

                  {/* Transaction History & aggregates */}
                  {customerTransactions && (
                    <div className="details-card-full">
                      <h4>💸 TRANSACTION STATEMENT & SPENDING ANALYSIS (6 MONTHS)</h4>
                      
                      {/* Aggregates block */}
                      <div className="spend-stats-grid">
                        <div className="spend-stat-box">
                          <span className="spend-label">TOTAL INCOME CREDITED</span>
                          <span className="spend-value positive">{formatCurrency(customerTransactions.summary?.total_income_credited)}</span>
                        </div>
                        <div className="spend-stat-box">
                          <span className="spend-label">TOTAL EXPENSES DEBITED</span>
                          <span className="spend-value negative">{formatCurrency(customerTransactions.summary?.total_expenses_debited)}</span>
                        </div>
                        <div className="spend-stat-box">
                          <span className="spend-label">SURPLUS / SAVINGS</span>
                          <span className="spend-value" style={{ color: (customerTransactions.summary?.total_income_credited - customerTransactions.summary?.total_expenses_debited) >= 0 ? 'green' : 'red' }}>
                            {formatCurrency(customerTransactions.summary?.total_income_credited - customerTransactions.summary?.total_expenses_debited)}
                          </span>
                        </div>
                        <div className="spend-stat-box">
                          <span className="spend-label">EMI BURDEN RATIO</span>
                          <span className="spend-value warning">
                            {customerTransactions.summary?.emi_burden_ratio !== undefined ? `${(customerTransactions.summary.emi_burden_ratio * 100).toFixed(1)}%` : '0%'}
                          </span>
                        </div>
                      </div>

                      {/* Top spending categories */}
                      <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                        <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>TOP CATEGORY SPENDS:</strong>
                        <div className="categories-badge-list">
                          {customerTransactions.summary?.top_spending_categories && 
                            Object.entries(customerTransactions.summary.top_spending_categories).map(([cat, amt]) => (
                              <span key={cat} className="category-spend-badge">
                                🍕 {cat.toUpperCase()}: <strong>{formatCurrency(amt)}</strong>
                              </span>
                            ))
                          }
                        </div>
                      </div>

                      {/* Transactions Table */}
                      <div style={{ overflowX: 'auto' }}>
                        <table className="transactions-mini-table">
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
                                <td><span className="category-label-pill">{t.category}</span></td>
                                <td>{t.description}</td>
                                <td>
                                  <span className={`txn-type-pill ${t.type}`}>
                                    {t.type.toUpperCase()}
                                  </span>
                                </td>
                                <td><strong className={t.type === 'credit' ? 'positive' : 'negative'}>
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
                    <div className="details-card-full">
                      <h4>🎯 CROSS-SELL RECOMMENDATIONS & PRODUCT ELIGIBILITY</h4>
                      <div className="eligibility-cards-grid">
                        {customerEligibility.eligible_products && customerEligibility.eligible_products.map((p, idx) => (
                          <div key={idx} className={`eligibility-card ${p.eligible ? 'eligible' : 'ineligible'}`}>
                            <div className="eligibility-card-header">
                              <h5>{p.product_name}</h5>
                              <span className={`eligibility-status-badge ${p.eligible ? 'yes' : 'no'}`}>
                                {p.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                              </span>
                            </div>
                            <div className="eligibility-fit-meter">
                              <span>FIT SCORE:</span>
                              <div className="fit-bar-wrapper">
                                <div className="fit-bar" style={{ width: `${p.fit_score}%`, background: p.fit_score > 70 ? 'var(--accent-lime)' : p.fit_score > 40 ? 'var(--accent-yellow)' : 'var(--accent-rose)' }}></div>
                                <span className="fit-score-num">{p.fit_score}/100</span>
                              </div>
                            </div>
                            <div className="eligibility-reasons">
                              <strong>CRITERIA VERDICT:</strong>
                              <ul>
                                {p.reasons.map((r, rIdx) => <li key={rIdx}>{r}</li>)}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interaction Timeline */}
                  <div className="details-card-full" style={{ marginBottom: '24px' }}>
                    <h4>📞 RECENT RM INTERACTION LOGS</h4>
                    <div className="interaction-timeline">
                      {selectedCustomer.recent_interactions && selectedCustomer.recent_interactions.length > 0 ? (
                        selectedCustomer.recent_interactions.map((inter, idx) => (
                          <div key={idx} className="timeline-item">
                            <div className="timeline-marker">
                              <span>💬</span>
                            </div>
                            <div className="timeline-content">
                              <div className="timeline-header">
                                <span className="timeline-date">{inter.date}</span>
                                <span className="timeline-channel">{inter.channel.toUpperCase()}</span>
                                <span className="timeline-type">{inter.type.replace('_', ' ')}</span>
                              </div>
                              {inter.product_discussed && (
                                <div className="timeline-product">Product: <code>{inter.product_discussed}</code></div>
                              )}
                              <p className="timeline-notes">"{inter.notes}"</p>
                              <div className="timeline-outcome">
                                Outcome: <strong className={inter.outcome === 'resolved' || inter.outcome === 'completed' || inter.outcome === 'interested' ? 'success' : ''}>{inter.outcome.toUpperCase()}</strong>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>No recent interactions logged with Relationship Managers.</p>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="no-selected-state">CUSTOMER DETAILS RETRIEVAL FAILED.</div>
              )
            ) : (
              <div className="no-selected-state">
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👤</div>
                <h3>NO CUSTOMER PORTFOLIO DECRYPTED</h3>
                <p>Select a customer record from the directory list on the left to analyze demographics, financial health, transactions, and product matching metrics.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'aitools' && (
        <div className="tools-tab-content">
          <div className="tab-header-brutalist">
            <h2>🤖 AGENT_AI_TOOLKIT_CAPABILITIES</h2>
            <p>Inspection schema for active tooling parameters utilized by the LLM CRM Agent to complete bank workspace operations.</p>
          </div>

          {loadingTools ? (
            <div className="loading-state">QUERYING ACTIVE WORKSPACE RUNTIME ENVIRONMENT...</div>
          ) : (
            <div className="tools-grid">
              {aiTools.map((tool, idx) => (
                <div key={idx} className="tool-schema-card">
                  <div className="tool-card-header">
                    <span className="tool-category-badge">{tool.category.toUpperCase()}</span>
                    <h4><code>{tool.name}()</code></h4>
                  </div>
                  <p className="tool-card-desc">{tool.description}</p>
                  
                  <div className="tool-card-params">
                    <h5>INPUT PARAMETERS:</h5>
                    {tool.parameters && tool.parameters.length > 0 ? (
                      <table className="params-table">
                        <thead>
                          <tr>
                            <th>PARAMETER</th>
                            <th>TYPE</th>
                            <th>DESCRIPTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tool.parameters.map((param, pIdx) => (
                            <tr key={pIdx}>
                              <td><code>{param.name}</code></td>
                              <td><span className="param-type-badge">{param.type}</span></td>
                              <td>{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="no-params-text">Takes no arguments.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="products-tab-content">
          <div className="tab-header-brutalist" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>📦 BANKING_PRODUCTS_RECOMMENDATION_CATALOG</h2>
              <p>Catalog containing minimum credit scores, income thresholds, interest rates, and structures for current offerings.</p>
            </div>
            <button 
              onClick={() => setShowAddProductModal(true)}
              className="neo-btn"
              style={{
                background: 'var(--accent-lime)',
                padding: '8px 16px',
                fontSize: '0.8rem',
                boxShadow: '3px 3px 0px #000',
                color: '#000'
              }}
            >
              ➕ ADD NEW PRODUCT
            </button>
          </div>

          {loadingProducts ? (
            <div className="loading-state">RETRIEVING PRODUCT SPECIFICATIONS CATALOG...</div>
          ) : (
            <div className="products-catalog-grid">
              {products.map(prod => (
                <div key={prod.id} className="product-catalog-card">
                  <div className="prod-card-header">
                    <span className="prod-type-badge">{prod.type.toUpperCase()}</span>
                    <h4>{prod.name}</h4>
                  </div>
                  
                  <div className="prod-criteria-box">
                    <div className="criteria-item">
                      <span>MIN INCOME:</span>
                      <strong>{formatCurrency(prod.min_income)}</strong>
                    </div>
                    <div className="criteria-item">
                      <span>MIN CREDIT SCORE:</span>
                      <strong>{prod.min_credit_score > 0 ? prod.min_credit_score : 'N/A'}</strong>
                    </div>
                    {prod.interest_rate && (
                      <div className="criteria-item">
                        <span>INTEREST RATE:</span>
                        <strong className="rate">{prod.interest_rate}% p.a.</strong>
                      </div>
                    )}
                    {prod.tenure_months && (
                      <div className="criteria-item">
                        <span>MAX TENURE:</span>
                        <strong>{prod.tenure_months} Months</strong>
                      </div>
                    )}
                  </div>

                  <p className="prod-desc">{prod.description}</p>
                  
                  <div className="prod-features-section">
                    <h5>KEY FEATURES:</h5>
                    <div className="features-tags">
                      {prod.features && prod.features.map((feat, fIdx) => (
                        <span key={fIdx} className="feature-pill">
                          ⚡ {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'apis' && (
        <div className="apis-tab-content">
          <div className="tab-header-brutalist">
            <h2>📡 CORE_REST_API_ENDPOINT_SCHEMAS</h2>
            <p>Technical reference documenting the underlying bank API routes registered inside FastAPI.</p>
          </div>

          <div className="apis-list">
            {/* API Endpoint Cards */}
            <div className="api-card">
              <div className="api-header">
                <span className="api-method get">GET</span>
                <span className="api-path">/api/v1/customers</span>
                <span className="api-desc-short">Search and filter customer directory list</span>
              </div>
              <div className="api-body">
                <p>Queries database for customer records matching criteria. Supports query parameters for filtering.</p>
                <strong>QUERY PARAMETERS:</strong>
                <ul>
                  <li><code>min_income</code> (float) — Minimum annual income</li>
                  <li><code>min_credit_score</code> (int) — Minimum credit score</li>
                  <li><code>tier</code> (string) — Platinum, Gold, Silver, Bronze</li>
                  <li><code>city</code> (string) — City name</li>
                  <li><code>has_product</code> (string) — Filter customers who own this product type</li>
                  <li><code>without_product</code> (string) — Filter customers who lack this product type</li>
                  <li><code>limit</code> (int, default 20) — Max records returned</li>
                </ul>
              </div>
            </div>

            <div className="api-card">
              <div className="api-header">
                <span className="api-method get">GET</span>
                <span className="api-path">/api/v1/customers/{"{customer_id}"}</span>
                <span className="api-desc-short">Get detailed 360-degree profile for a customer</span>
              </div>
              <div className="api-body">
                <p>Retrieves complete demographics, accounts details, existing products, tenure years, and last 10 interactions timeline records.</p>
              </div>
            </div>

            <div className="api-card">
              <div className="api-header">
                <span className="api-method get">GET</span>
                <span className="api-path">/api/v1/customers/{"{customer_id}"}/transactions</span>
                <span className="api-desc-short">Retrieve transactions and spending breakdown</span>
              </div>
              <div className="api-body">
                <p>Queries monthly transaction logs, calculating total income credits, utility debits, investment surplus, EMI ratios, and top spending categories.</p>
                <strong>QUERY PARAMETERS:</strong>
                <ul>
                  <li><code>months</code> (int, default 6) — Number of months of transaction history to query</li>
                </ul>
              </div>
            </div>

            <div className="api-card">
              <div className="api-header">
                <span className="api-method get">GET</span>
                <span className="api-path">/api/v1/customers/{"{customer_id}"}/credit-score</span>
                <span className="api-desc-short">Retrieve credit score factors</span>
              </div>
              <div className="api-body">
                <p>Evaluates credit score factors (payment history, credit utilization, length, mix) and returns impact statements (positive, neutral, negative).</p>
              </div>
            </div>

            <div className="api-card">
              <div className="api-header">
                <span className="api-method get">GET</span>
                <span className="api-path">/api/v1/customers/{"{customer_id}"}/product-eligibility</span>
                <span className="api-desc-short">Check customer product eligibility and fit score</span>
              </div>
              <div className="api-body">
                <p>Checks catalog requirements (income, credit score) against profile. Calculates a fit score (0-100) and supplies detailed reasons for product suggestions.</p>
              </div>
            </div>

            <div className="api-card">
              <div className="api-header">
                <span className="api-method get">GET</span>
                <span className="api-path">/api/v1/products</span>
                <span className="api-desc-short">Get complete product catalog catalog list</span>
              </div>
              <div className="api-body">
                <p>Returns the catalog of all banking products offered by the bank along with minimum thresholds and feature lists.</p>
              </div>
            </div>

            <div className="api-card">
              <div className="api-header">
                <span className="api-method post">POST</span>
                <span className="api-path">/api/v1/auth/login</span>
                <span className="api-desc-short">RM user login session access</span>
              </div>
              <div className="api-body">
                <p>Authenticates Relationship Managers. Returns profile payload including assigned RM tier ID (e.g. RM001).</p>
                <strong>REQUEST BODY JSON:</strong>
                <pre><code>{"{ \"username\": \"suryanarayan\", \"password\": \"password\" }"}</code></pre>
              </div>
            </div>

            <div className="api-card">
              <div className="api-header">
                <span className="api-method post">POST</span>
                <span className="api-path">/api/v1/auth/signup</span>
                <span className="api-desc-short">Register a new Relationship Manager</span>
              </div>
              <div className="api-body">
                <p>Registers a new control account. Automatically hashes passwords before persisting in SQL.</p>
              </div>
            </div>

            <div className="api-card">
              <div className="api-header">
                <span className="api-method get">GET</span>
                <span className="api-path">/api/v1/chat/logs</span>
                <span className="api-desc-short">Get RM execution flow console logs</span>
              </div>
              <div className="api-body">
                <p>Used to fetch system telemetry records including prompts, input tokens, output tokens, total tokens, and sequential agent tool execution pathways.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="brutalist-modal-overlay" onClick={() => setShowAddCustomerModal(false)}>
          <div className="brutalist-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-banner" style={{ background: 'var(--accent-yellow)' }}>
              <h3>👤 REGISTER NEW CLIENT</h3>
              <button className="modal-close-btn" onClick={() => setShowAddCustomerModal(false)}>✖</button>
            </div>
            <form onSubmit={handleAddCustomerSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-field">
                  <label>NAME</label>
                  <input type="text" required value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="e.g. Rahul Sharma" />
                </div>
                <div className="form-field">
                  <label>AGE</label>
                  <input type="number" required value={customerForm.age} onChange={e => setCustomerForm({...customerForm, age: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>GENDER</label>
                  <select value={customerForm.gender} onChange={e => setCustomerForm({...customerForm, gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>OCCUPATION</label>
                  <input type="text" required value={customerForm.occupation} onChange={e => setCustomerForm({...customerForm, occupation: e.target.value})} placeholder="e.g. Software Engineer" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>ANNUAL INCOME (INR)</label>
                  <input type="number" required value={customerForm.annual_income} onChange={e => setCustomerForm({...customerForm, annual_income: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>CREDIT SCORE</label>
                  <input type="number" required min="300" max="850" value={customerForm.credit_score} onChange={e => setCustomerForm({...customerForm, credit_score: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>RELATIONSHIP TIER</label>
                  <select value={customerForm.relationship_tier} onChange={e => setCustomerForm({...customerForm, relationship_tier: e.target.value})}>
                    <option value="Platinum">Platinum</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Bronze">Bronze</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>KYC STATUS</label>
                  <select value={customerForm.kyc_status} onChange={e => setCustomerForm({...customerForm, kyc_status: e.target.value})}>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>PHONE</label>
                  <input type="text" required value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="+91 98765 43210" />
                </div>
                <div className="form-field">
                  <label>EMAIL</label>
                  <input type="email" required value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} placeholder="rahul@example.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>CITY</label>
                  <input type="text" required value={customerForm.city} onChange={e => setCustomerForm({...customerForm, city: e.target.value})} placeholder="Mumbai" />
                </div>
                <div className="form-field">
                  <label>STATE</label>
                  <input type="text" required value={customerForm.state} onChange={e => setCustomerForm({...customerForm, state: e.target.value})} placeholder="Maharashtra" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>AVG ACCOUNT BALANCE (INR)</label>
                  <input type="number" required value={customerForm.average_balance} onChange={e => setCustomerForm({...customerForm, average_balance: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>TOTAL RELATIONSHIP VALUE (INR)</label>
                  <input type="number" required value={customerForm.total_relationship_value} onChange={e => setCustomerForm({...customerForm, total_relationship_value: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="modal-submit-btn-neo">COMMIT DATABASE ENTRY</button>
            </form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="brutalist-modal-overlay" onClick={() => setShowAddProductModal(false)}>
          <div className="brutalist-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-banner" style={{ background: 'var(--accent-pink)' }}>
              <h3>📦 CREATE NEW PRODUCT CATALOG</h3>
              <button className="modal-close-btn" onClick={() => setShowAddProductModal(false)}>✖</button>
            </div>
            <form onSubmit={handleAddProductSubmit} className="modal-form">
              <div className="form-field">
                <label>PRODUCT NAME</label>
                <input type="text" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="e.g. Home Loan - DreamHome" />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>PRODUCT TYPE</label>
                  <select value={productForm.type} onChange={e => setProductForm({...productForm, type: e.target.value})}>
                    <option value="savings_account">Savings Account</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="personal_loan">Personal Loan</option>
                    <option value="home_loan">Home Loan</option>
                    <option value="fixed_deposit">Fixed Deposit</option>
                    <option value="mutual_fund">Mutual Fund</option>
                    <option value="insurance">Life Insurance</option>
                    <option value="demat_account">Demat Account</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>INTEREST RATE (% p.a. - Optional)</label>
                  <input type="number" step="0.01" value={productForm.interest_rate} onChange={e => setProductForm({...productForm, interest_rate: e.target.value})} placeholder="e.g. 7.25" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>MIN REQUIRED INCOME (Annual)</label>
                  <input type="number" value={productForm.min_income} onChange={e => setProductForm({...productForm, min_income: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>MIN REQUIRED CREDIT SCORE</label>
                  <input type="number" min="0" max="850" value={productForm.min_credit_score} onChange={e => setProductForm({...productForm, min_credit_score: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>MAX LOAN AMOUNT (Optional)</label>
                  <input type="number" value={productForm.max_amount} onChange={e => setProductForm({...productForm, max_amount: e.target.value})} placeholder="e.g. 2500000" />
                </div>
                <div className="form-field">
                  <label>MAX TENURE (Months - Optional)</label>
                  <input type="number" value={productForm.tenure_months} onChange={e => setProductForm({...productForm, tenure_months: e.target.value})} placeholder="e.g. 60" />
                </div>
              </div>
              <div className="form-field">
                <label>DESCRIPTION</label>
                <textarea required value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Describe product benefits..." rows={3} style={{ resize: 'none' }} />
              </div>
              <div className="form-field">
                <label>KEY FEATURES (Comma separated list)</label>
                <input type="text" value={productForm.features_raw} onChange={e => setProductForm({...productForm, features_raw: e.target.value})} placeholder="e.g. Zero collateral, Instant approval, No fee" />
              </div>
              <button type="submit" className="modal-submit-btn-neo">SAVE TO PRODUCT CATALOG</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
