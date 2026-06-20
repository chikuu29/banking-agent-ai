import { useState, useEffect } from 'react'

export default function AgentTools() {
  const [aiTools, setAiTools] = useState([])
  const [loadingTools, setLoadingTools] = useState(false)

  // Fetch AI tools metadata on mount
  useEffect(() => {
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
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <div className="border-3 border-black bg-bg-secondary p-4 px-6 shadow-brutal-sm">
        <h2 className="font-display text-[22.4px] font-black">🤖 AGENT_AI_TOOLKIT_CAPABILITIES</h2>
        <p className="text-[13.6px] text-text-secondary mt-1">Inspection schema for active tooling parameters utilized by the LLM CRM Agent to complete bank workspace operations.</p>
      </div>

      {loadingTools ? (
        <div className="flex flex-col items-center justify-center text-center p-12 font-mono text-[13.6px] text-text-secondary h-full">QUERYING ACTIVE WORKSPACE RUNTIME ENVIRONMENT...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {aiTools.map((tool, idx) => (
            <div key={idx} className="bg-bg-secondary border-3 border-black p-4 shadow-brutal-sm flex flex-col gap-2">
              <div className="flex flex-col gap-1 border-b-2 border-text-primary pb-1.5">
                <span className="font-mono text-[10px] bg-accent-pink text-black py-0.5 px-1.5 border border-black self-start font-bold">{tool.category.toUpperCase()}</span>
                <h4 className="font-mono text-[14.4px] text-text-primary"><code>{tool.name}()</code></h4>
              </div>
              <p className="text-[12.8px] text-text-secondary leading-[1.4]">{tool.description}</p>
              
              <div className="mt-2">
                <h5 className="text-[11.2px] font-display mb-1.5">INPUT PARAMETERS:</h5>
                {tool.parameters && tool.parameters.length > 0 ? (
                  <table className="w-full border-collapse [&_th]:text-[9.6px] [&_th]:font-mono [&_th]:bg-bg-primary [&_th]:p-1 [&_th]:border [&_th]:border-text-primary [&_td]:text-[11.2px] [&_td]:p-1.5 [&_td]:border [&_td]:border-text-primary [&_td:first-child]:font-mono [&_td:first-child]:font-bold">
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
                          <td><span className="text-[9.6px] font-mono bg-accent-yellow text-black py-0.5 px-1 border border-black">{param.type}</span></td>
                          <td>{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[11.2px] italic text-text-muted">Takes no arguments.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
