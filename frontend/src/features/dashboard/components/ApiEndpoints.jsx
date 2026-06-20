export default function ApiEndpoints() {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <div className="border-3 border-black bg-bg-secondary p-4 px-6 shadow-brutal-sm">
        <h2 className="font-display text-[22.4px] font-black">📡 REST_API_SCHEMAS</h2>
        <p className="text-[13.6px] text-text-secondary mt-1">Technical reference documenting the underlying bank API routes registered inside FastAPI.</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* API Endpoint Cards */}
        <div className="bg-bg-secondary border-3 border-black shadow-brutal-sm overflow-hidden">
          <div className="p-2 px-4 border-b-2 border-text-primary flex flex-wrap items-center gap-2 bg-bg-primary">
            <span className="font-mono text-[11px] font-black py-0.5 px-2 border border-black text-black bg-accent-lime">GET</span>
            <span className="font-mono text-[12.8px] font-bold">/api/v1/customers</span>
            <span className="text-[12px] text-text-muted font-medium ml-auto md:w-full md:ml-0 md:mt-1">Search and filter customer directory list</span>
          </div>
          <div className="p-4 text-[12.8px]">
            <p className="text-text-secondary">Queries database for customer records matching criteria. Supports query parameters for filtering.</p>
            <strong className="block text-[11.2px] mt-2 font-display">QUERY PARAMETERS:</strong>
            <ul className="pl-[18px] mt-1 list-disc">
              <li className="mb-0.5 text-[11.5px]"><code>min_income</code> (float) — Minimum annual income</li>
              <li className="mb-0.5 text-[11.5px]"><code>min_credit_score</code> (int) — Minimum credit score</li>
              <li className="mb-0.5 text-[11.5px]"><code>tier</code> (string) — Platinum, Gold, Silver, Bronze</li>
              <li className="mb-0.5 text-[11.5px]"><code>city</code> (string) — City name</li>
              <li className="mb-0.5 text-[11.5px]"><code>has_product</code> (string) — Filter customers who own this product type</li>
              <li className="mb-0.5 text-[11.5px]"><code>without_product</code> (string) — Filter customers who lack this product type</li>
              <li className="mb-0.5 text-[11.5px]"><code>limit</code> (int, default 20) — Max records returned</li>
            </ul>
          </div>
        </div>

        <div className="bg-bg-secondary border-3 border-black shadow-brutal-sm overflow-hidden">
          <div className="p-2 px-4 border-b-2 border-text-primary flex flex-wrap items-center gap-2 bg-bg-primary">
            <span className="font-mono text-[11px] font-black py-0.5 px-2 border border-black text-black bg-accent-lime">GET</span>
            <span className="font-mono text-[12.8px] font-bold">/api/v1/customers/{"{customer_id}"}</span>
            <span className="text-[12px] text-text-muted font-medium ml-auto md:w-full md:ml-0 md:mt-1">Get detailed 360-degree profile for a customer</span>
          </div>
          <div className="p-4 text-[12.8px]">
            <p className="text-text-secondary">Retrieves complete demographics, accounts details, existing products, tenure years, and last 10 interactions timeline records.</p>
          </div>
        </div>

        <div className="bg-bg-secondary border-3 border-black shadow-brutal-sm overflow-hidden">
          <div className="p-2 px-4 border-b-2 border-text-primary flex flex-wrap items-center gap-2 bg-bg-primary">
            <span className="font-mono text-[11px] font-black py-0.5 px-2 border border-black text-black bg-accent-lime">GET</span>
            <span className="font-mono text-[12.8px] font-bold">/api/v1/customers/{"{customer_id}"}/transactions</span>
            <span className="text-[12px] text-text-muted font-medium ml-auto md:w-full md:ml-0 md:mt-1">Retrieve transactions and spending breakdown</span>
          </div>
          <div className="p-4 text-[12.8px]">
            <p className="text-text-secondary">Queries monthly transaction logs, calculating total income credits, utility debits, investment surplus, EMI ratios, and top spending categories.</p>
            <strong className="block text-[11.2px] mt-2 font-display">QUERY PARAMETERS:</strong>
            <ul className="pl-[18px] mt-1 list-disc">
              <li className="mb-0.5 text-[11.5px]"><code>months</code> (int, default 6) — Number of months of transaction history to query</li>
            </ul>
          </div>
        </div>

        <div className="bg-bg-secondary border-3 border-black shadow-brutal-sm overflow-hidden">
          <div className="p-2 px-4 border-b-2 border-text-primary flex flex-wrap items-center gap-2 bg-bg-primary">
            <span className="font-mono text-[11px] font-black py-0.5 px-2 border border-black text-black bg-accent-lime">GET</span>
            <span className="font-mono text-[12.8px] font-bold">/api/v1/customers/{"{customer_id}"}/credit-score</span>
            <span className="text-[12px] text-text-muted font-medium ml-auto md:w-full md:ml-0 md:mt-1">Retrieve credit score factors</span>
          </div>
          <div className="p-4 text-[12.8px]">
            <p className="text-text-secondary">Evaluates credit score factors (payment history, credit utilization, length, mix) and returns impact statements (positive, neutral, negative).</p>
          </div>
        </div>

        <div className="bg-bg-secondary border-3 border-black shadow-brutal-sm overflow-hidden">
          <div className="p-2 px-4 border-b-2 border-text-primary flex flex-wrap items-center gap-2 bg-bg-primary">
            <span className="font-mono text-[11px] font-black py-0.5 px-2 border border-black text-black bg-accent-lime">GET</span>
            <span className="font-mono text-[12.8px] font-bold">/api/v1/customers/{"{customer_id}"}/product-eligibility</span>
            <span className="text-[12px] text-text-muted font-medium ml-auto md:w-full md:ml-0 md:mt-1">Check customer product eligibility and fit score</span>
          </div>
          <div className="p-4 text-[12.8px]">
            <p className="text-text-secondary">Checks catalog requirements (income, credit score) against profile. Calculates a fit score (0-100) and supplies detailed reasons for product suggestions.</p>
          </div>
        </div>

        <div className="bg-bg-secondary border-3 border-black shadow-brutal-sm overflow-hidden">
          <div className="p-2 px-4 border-b-2 border-text-primary flex flex-wrap items-center gap-2 bg-bg-primary">
            <span className="font-mono text-[11px] font-black py-0.5 px-2 border border-black text-black bg-accent-lime">GET</span>
            <span className="font-mono text-[12.8px] font-bold">/api/v1/products</span>
            <span className="text-[12px] text-text-muted font-medium ml-auto md:w-full md:ml-0 md:mt-1">Get complete product catalog list</span>
          </div>
          <div className="p-4 text-[12.8px]">
            <p className="text-text-secondary">Returns the catalog of all banking products offered by the bank along with minimum thresholds and feature lists.</p>
          </div>
        </div>

        <div className="bg-bg-secondary border-3 border-black shadow-brutal-sm overflow-hidden">
          <div className="p-2 px-4 border-b-2 border-text-primary flex flex-wrap items-center gap-2 bg-bg-primary">
            <span className="font-mono text-[11px] font-black py-0.5 px-2 border border-black text-black bg-accent-yellow">POST</span>
            <span className="font-mono text-[12.8px] font-bold">/api/v1/auth/login</span>
            <span className="text-[12px] text-text-muted font-medium ml-auto md:w-full md:ml-0 md:mt-1">RM user login session access</span>
          </div>
          <div className="p-4 text-[12.8px]">
            <p className="text-text-secondary">Authenticates Relationship Managers. Returns profile payload including assigned RM tier ID (e.g. RM001).</p>
            <strong className="block text-[11.2px] mt-2 font-display">REQUEST BODY JSON:</strong>
            <pre className="mt-2 p-2 bg-bg-primary border border-text-primary font-mono text-[11.2px] overflow-x-auto"><code>{"{ \"username\": \"suryanarayan\", \"password\": \"password\" }"}</code></pre>
          </div>
        </div>

        <div className="bg-bg-secondary border-3 border-black shadow-brutal-sm overflow-hidden">
          <div className="p-2 px-4 border-b-2 border-text-primary flex flex-wrap items-center gap-2 bg-bg-primary">
            <span className="font-mono text-[11px] font-black py-0.5 px-2 border border-black text-black bg-accent-yellow">POST</span>
            <span className="font-mono text-[12.8px] font-bold">/api/v1/auth/signup</span>
            <span className="text-[12px] text-text-muted font-medium ml-auto md:w-full md:ml-0 md:mt-1">Register a new Relationship Manager</span>
          </div>
          <div className="p-4 text-[12.8px]">
            <p className="text-text-secondary">Registers a new control account. Automatically hashes passwords before persisting in SQL.</p>
          </div>
        </div>

        <div className="bg-bg-secondary border-3 border-black shadow-brutal-sm overflow-hidden">
          <div className="p-2 px-4 border-b-2 border-text-primary flex flex-wrap items-center gap-2 bg-bg-primary">
            <span className="font-mono text-[11px] font-black py-0.5 px-2 border border-black text-black bg-accent-lime">GET</span>
            <span className="font-mono text-[12.8px] font-bold">/api/v1/chat/logs</span>
            <span className="text-[12px] text-text-muted font-medium ml-auto md:w-full md:ml-0 md:mt-1">Get RM execution flow console logs</span>
          </div>
          <div className="p-4 text-[12.8px]">
            <p className="text-text-secondary">Used to fetch system telemetry records including prompts, input tokens, output tokens, total tokens, and sequential agent tool execution pathways.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
