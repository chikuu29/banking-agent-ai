import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble.jsx'
import ToolCallCard from './ToolCallCard.jsx'

/**
 * Main chat interface — messages area + input.
 * Renders user messages, agent responses, and tool call cards.
 */
export default function ChatInterface({ user, threadId, messages, isLoading, connectionStatus, onSendMessage }) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)


  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Handle send
  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSendMessage(input.trim())
    setInput('')
  }

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value)
  }

  // Group consecutive tool calls together
  const renderMessages = () => {
    const elements = []
    let toolCallGroup = []

    const flushToolCalls = () => {
      if (toolCallGroup.length > 0) {
        elements.push(
          <div key={`tools-${toolCallGroup[0].id}`} className="w-full max-w-full self-start flex flex-col gap-2 mb-2">
            <div className="bg-accent-lime text-black border-2 border-black rounded px-2 py-0.5 shadow-[2px_2px_0px_#000000] font-mono text-[11.5px] font-extrabold tracking-wider uppercase inline-flex self-start">🔧 Tool Calls</div>
            {toolCallGroup.map(tc => (
              <ToolCallCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )
        toolCallGroup = []
      }
    }

    messages.forEach((msg) => {
      if (msg.type === 'tool_call') {
        toolCallGroup.push(msg)
      } else {
        flushToolCalls()
        elements.push(<MessageBubble key={msg.id} message={msg} />)
      }
    })
    flushToolCalls()

    return elements
  }

  const hasMessages = messages.length > 0
  const activeToolCall = [...messages].reverse().find(msg => msg.type === 'tool_call' && msg.status === 'calling')

  const suggestions = [
    {
      icon: '🎯',
      title: 'Target Loan Leads',
      desc: 'Identify gold/platinum clients likely to convert for a loan and draft WhatsApp outreach messages.',
      promptText: 'Find high-value customers likely to convert for a personal loan this month and generate personalized WhatsApp messages.'
    },
    {
      icon: '👤',
      title: 'Analyze Portfolio',
      desc: 'Retrieve customer ID 3 demographics, spending statement, and cross-sell recommendations.',
      promptText: 'Show me the complete profile and spending analysis for customer ID 3, and recommend suitable products.'
    },
    {
      icon: '💳',
      title: 'Credit Upgrades',
      desc: 'Scan for Gold tier clients eligible for premium credit card upgrades and draft outreach messages.',
      promptText: 'Which Gold tier customers should I target for credit card upgrades? Score them and draft outreach.'
    }
  ]

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-primary">

      {/* Messages or Welcome */}
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-start p-6 md:p-4 text-left overflow-y-auto scroll-smooth bg-[radial-gradient(rgba(0,0,0,0.04)_1.2px,transparent_1.2px)] bg-[size:20px_20px]">
          <div className="w-full max-w-[840px] my-auto py-6 flex flex-col gap-6 animate-[messageSlideIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
            
            {/* Top Dashboard Banner */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-3 border-black bg-bg-secondary shadow-brutal-lg rounded-xl overflow-hidden">
              {/* Left Column: Brand Hub (5 cols) */}
              <div className="md:col-span-5 bg-accent-yellow p-6 border-b-3 md:border-b-0 md:border-r-3 border-black flex flex-col justify-between gap-6">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-white border-3 border-black rounded-xl flex items-center justify-center text-2xl shadow-[2px_2px_0px_#000] animate-[float_4s_infinite_ease-in-out] select-none">
                    🏦
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-black border-2 border-black bg-white px-2 py-0.5 rounded-full shadow-[1.5px_1.5px_0px_#000]">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald border border-black inline-block animate-pulse"></span>
                    <span>ONLINE</span>
                  </div>
                </div>
                <div>
                  <h1 className="font-display text-[26px] font-black leading-none uppercase text-black mb-1">
                    BANKING CRM
                  </h1>
                  <p className="font-mono text-[11px] font-bold text-black/75 tracking-wider">
                    COMMAND STATION
                  </p>
                </div>
              </div>

              {/* Right Column: App Description & Help (7 cols) */}
              <div className="md:col-span-7 p-6 bg-white flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <h2 className="font-display text-[17px] font-black uppercase text-black flex items-center gap-1.5">
                    👋 Welcome back!
                  </h2>
                  <p className="font-sans text-[13.8px] leading-relaxed text-text-secondary">
                    Your intelligent workspace partner. Ask me to search client records, check financial scores, analyze monthly spending accounts, or draft custom relationship manager outreach messages.
                  </p>
                </div>
                <div className="font-mono text-[11px] text-text-muted bg-bg-primary p-3 border-2 border-black rounded-lg flex items-center gap-2.5">
                  <span className="text-accent-pink font-extrabold flex-shrink-0">⚡ HINT:</span>
                  <span>Click one of the action cards below to execute a quick query scanning.</span>
                </div>
              </div>
            </div>

            {/* Quick Action Suggestion Section */}
            <div className="flex flex-col gap-3 w-full">
              <h3 className="font-display text-[12.8px] font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <span>💡</span> SUGGESTED COMMAND ACTIONS
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className={`p-5 border-3 border-black rounded-xl text-left flex flex-col gap-4 cursor-pointer shadow-brutal-sm transition-[transform,box-shadow,background] duration-75 hover:-translate-y-[4px] hover:shadow-brutal-md active:translate-y-[2px] active:shadow-none bg-bg-secondary text-black ${
                      i === 0 ? 'hover:bg-accent-cyan!' : i === 1 ? 'hover:bg-accent-pink!' : 'hover:bg-accent-violet!'
                    }`}
                    onClick={() => onSendMessage(s.promptText)}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-2xl w-10 h-10 bg-white border-2 border-black rounded-lg flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] select-none">
                        {s.icon}
                      </span>
                      <span className="font-mono text-[9px] font-extrabold border border-black bg-white px-2 py-0.5 rounded-md uppercase tracking-wider shadow-[1px_1px_0px_#000]">
                        RUN SCAN
                      </span>
                    </div>
                    <div>
                      <h4 className="font-display text-[13.6px] font-black uppercase mb-1">{s.title}</h4>
                      <p className="font-sans text-[12px] leading-[1.4] text-text-muted">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 md:p-4 flex flex-col gap-6 bg-bg-primary bg-[radial-gradient(rgba(0,0,0,0.06)_1.2px,transparent_1.2px)] bg-[size:24px_24px] scroll-smooth">
          {renderMessages()}
          {isLoading && (
            <div className="inline-flex items-center gap-4 bg-accent-yellow text-black border-3 border-black shadow-[3px_3px_0px_#000000] py-2 px-4 font-mono text-[13.6px] font-bold tracking-wider my-2 rounded-md self-start animate-[float-small_2s_ease-in-out_infinite]">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-black rounded-full inline-block animate-[thinking-bounce_1.4s_infinite_ease-in-out_both]" style={{ animationDelay: '-0.32s' }}></span>
                <span className="w-2 h-2 bg-black rounded-full inline-block animate-[thinking-bounce_1.4s_infinite_ease-in-out_both]" style={{ animationDelay: '-0.16s' }}></span>
                <span className="w-2 h-2 bg-black rounded-full inline-block animate-[thinking-bounce_1.4s_infinite_ease-in-out_both]"></span>
              </div>
              <span>
                {activeToolCall 
                  ? `Executing tool: ${activeToolCall.name}...` 
                  : 'Agent is thinking...'}
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input and Send Button */}
      <div className="p-4 px-6 md:p-3 border-t-3 border-black bg-bg-secondary z-[5]">
        <div className="flex items-center gap-2 max-w-full bg-bg-input border-3 border-black rounded-[12px] p-2 shadow-[4px_4px_0px_#000000] transition-[box-shadow,transform] duration-75 focus-within:shadow-[4px_4px_0px_var(--color-accent-pink)] focus-within:translate-x-[-1px] focus-within:translate-y-[-1px] md:rounded-lg">
          <input
            type="text"
            className="flex-1 bg-transparent border-none! rounded-none text-text-primary text-[16px] font-sans font-medium outline-none! placeholder:text-text-muted"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Send a message to Banking CRM..."
            disabled={connectionStatus !== 'connected'}
          />
          <button
            className="px-4 py-2 bg-accent-lime! border-2 border-black! rounded-[8px]! text-black! text-[12.8px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000000]! transition-[transform,box-shadow,background] duration-75! hover:enabled:bg-accent-lime-hover! hover:enabled:translate-x-[-1px] hover:enabled:translate-y-[-1px] hover:enabled:shadow-[3px_3px_0px_#000000]! active:enabled:translate-x-[1px] active:enabled:translate-y-[1px] active:enabled:shadow-[1px_1px_0px_#000000]! disabled:bg-[#e2e8f0]! disabled:border-[#94a3b8]! disabled:text-[#94a3b8]! disabled:shadow-none! disabled:cursor-not-allowed disabled:transform-none!"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || connectionStatus !== 'connected'}
            title="EXECUTE QUERY"
          >
            <span>SEND</span>
            <span>➤</span>
          </button>
        </div>
      </div>
    </div>
  )
}
