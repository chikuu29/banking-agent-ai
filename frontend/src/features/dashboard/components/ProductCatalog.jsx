import { useState, useEffect } from 'react'

export default function ProductCatalog() {
  // State for Products
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)

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

  // Fetch product list on mount
  useEffect(() => {
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
  }, [])

  // Format currency in INR formatting
  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
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
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <div className="border-3 border-black bg-bg-secondary p-4 px-6 shadow-brutal-sm flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
        <div>
          <h2 className="font-display text-[22.4px] font-black">📦 PRODUCTS_CATALOG</h2>
          <p className="text-[13.6px] text-text-secondary mt-1">Catalog containing minimum credit scores, income thresholds, interest rates, and structures for current offerings.</p>
        </div>
        <button 
          onClick={() => setShowAddProductModal(true)}
          className="bg-accent-lime text-black border-3 border-black py-2 px-4 text-xs shadow-[3px_3px_0px_#000000] cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4.5px_4.5px_0px_#000000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none"
        >
          ➕ ADD NEW PRODUCT
        </button>
      </div>

      {loadingProducts ? (
        <div className="flex flex-col items-center justify-center text-center p-12 font-mono text-[13.6px] text-text-secondary h-full">RETRIEVING PRODUCT SPECIFICATIONS CATALOG...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(prod => (
            <div key={prod.id} className="bg-bg-secondary border-3 border-black p-4 shadow-brutal-sm flex flex-col gap-2">
              <div className="border-b-2 border-text-primary pb-1.5 flex flex-col gap-1">
                <span className="font-mono text-[9.6px] bg-accent-cyan text-black border border-black py-0.5 px-1.5 self-start font-bold">{prod.type.toUpperCase()}</span>
                <h4 className="font-display text-[17.6px] font-black break-words" title={prod.name}>{prod.name}</h4>
              </div>
              
              <div className="bg-bg-primary border border-dashed border-text-primary p-2 flex flex-col gap-1">
                <div className="flex justify-between text-[11.2px]">
                  <span className="font-mono text-text-muted">MIN INCOME:</span>
                  <strong>{formatCurrency(prod.min_income)}</strong>
                </div>
                <div className="flex justify-between text-[11.2px]">
                  <span className="font-mono text-text-muted">MIN CREDIT SCORE:</span>
                  <strong>{prod.min_credit_score > 0 ? prod.min_credit_score : 'N/A'}</strong>
                </div>
                {prod.interest_rate && (
                  <div className="flex justify-between text-[11.2px]">
                    <span className="font-mono text-text-muted">INTEREST RATE:</span>
                    <strong className="text-green-700 font-bold">{prod.interest_rate}% p.a.</strong>
                  </div>
                )}
                {prod.tenure_months && (
                  <div className="flex justify-between text-[11.2px]">
                    <span className="font-mono text-text-muted">MAX TENURE:</span>
                    <strong>{prod.tenure_months} Months</strong>
                  </div>
                )}
              </div>

              <p className="text-[12.5px] leading-[1.4] text-text-secondary">{prod.description}</p>
              
              <div className="mt-2">
                <h5 className="text-[11.2px] font-display mb-1.5">KEY FEATURES:</h5>
                <div className="flex flex-wrap gap-1">
                  {prod.features && prod.features.map((feat, fIdx) => (
                    <span key={fIdx} className="text-[10.4px] bg-bg-primary border border-text-primary py-0.5 px-1.5">
                      ⚡ {feat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[1000] p-4 backdrop-blur-[2px]" onClick={() => setShowAddProductModal(false)}>
          <div className="bg-bg-secondary border-3 border-black shadow-brutal-lg w-full max-w-[650px] flex flex-col max-h-[90vh] overflow-hidden animate-[messageSlideIn_0.2s_cubic-bezier(0.16,1,0.3,1)]" onClick={e => e.stopPropagation()}>
            <div className="border-b-3 border-black p-4 flex justify-between items-center text-black bg-accent-pink">
              <h3 className="font-display text-[17.6px] font-black tracking-wider">📦 CREATE NEW PRODUCT CATALOG</h3>
              <button className="bg-white border-3 border-black cursor-pointer font-bold py-0.5 px-2 shadow-[2px_2px_0px_#000000] text-black font-sans transition-[transform,box-shadow] duration-80 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000]" onClick={() => setShowAddProductModal(false)}>✖</button>
            </div>
            <form onSubmit={handleAddProductSubmit} className="p-4 px-6 overflow-y-auto flex flex-col gap-4 bg-bg-primary">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">PRODUCT NAME</label>
                <input type="text" required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="e.g. Home Loan - DreamHome" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">PRODUCT TYPE</label>
                  <select value={productForm.type} onChange={e => setProductForm({...productForm, type: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!">
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
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">INTEREST RATE (% p.a. - Optional)</label>
                  <input type="number" step="0.01" value={productForm.interest_rate} onChange={e => setProductForm({...productForm, interest_rate: e.target.value})} placeholder="e.g. 7.25" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">MIN REQUIRED INCOME (Annual)</label>
                  <input type="number" value={productForm.min_income} onChange={e => setProductForm({...productForm, min_income: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">MIN REQUIRED CREDIT SCORE</label>
                  <input type="number" min="0" max="850" value={productForm.min_credit_score} onChange={e => setProductForm({...productForm, min_credit_score: e.target.value})} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">MAX LOAN AMOUNT (Optional)</label>
                  <input type="number" value={productForm.max_amount} onChange={e => setProductForm({...productForm, max_amount: e.target.value})} placeholder="e.g. 2500000" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">MAX TENURE (Months - Optional)</label>
                  <input type="number" value={productForm.tenure_months} onChange={e => setProductForm({...productForm, tenure_months: e.target.value})} placeholder="e.g. 60" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">DESCRIPTION</label>
                <textarea required value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} placeholder="Describe product benefits..." rows={3} className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]! resize-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10.4px] font-bold uppercase text-text-primary">KEY FEATURES (Comma separated list)</label>
                <input type="text" value={productForm.features_raw} onChange={e => setProductForm({...productForm, features_raw: e.target.value})} placeholder="e.g. Zero collateral, Instant approval, No fee" className="p-2 border-3 border-black bg-bg-input text-text-primary font-sans text-[12.8px] outline-none shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1)] transition-[border-color,box-shadow] duration-80 focus:border-accent-cyan focus:shadow-[inset_1.5px_1.5px_0px_rgba(0,0,0,0.1),_0_0_0_2px_rgba(0,240,255,0.2)] md:text-[16px]!" />
              </div>
              <button type="submit" className="bg-accent-lime text-black! font-sans font-bold uppercase p-3 border-3 border-black shadow-brutal-sm cursor-pointer transition-all duration-80 text-center text-[13.1px] mt-2 w-full hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal-md hover:bg-accent-lime-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">SAVE TO PRODUCT CATALOG</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
