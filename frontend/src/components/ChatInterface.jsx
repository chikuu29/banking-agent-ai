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
  const textareaRef = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Handle send
  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSendMessage(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px'
    }
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
    const textarea = e.target
    textarea.style.height = '48px'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  // Group consecutive tool calls together
  const renderMessages = () => {
    const elements = []
    let toolCallGroup = []

    const flushToolCalls = () => {
      if (toolCallGroup.length > 0) {
        elements.push(
          <div key={`tools-${toolCallGroup[0].id}`} className="tool-call-group">
            <div className="message-label">🔧 Tool Calls</div>
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

  const suggestions = [
    {
      icon: '🎯',
      text: 'Find high-value customers likely to convert for a personal loan this month and generate personalized WhatsApp messages.',
    },
    {
      icon: '👤',
      text: 'Show me the complete profile and spending analysis for customer ID 3, and recommend suitable products.',
    },
    {
      icon: '📢',
      text: 'Which Gold tier customers should I target for credit card upgrades? Score them and draft outreach.',
    },
  ]

  return (
    <div className="chat-area">

      {/* Messages or Welcome */}
      {!hasMessages ? (
        <div className="welcome-screen">
          <div className="welcome-icon">🤖</div>
          <h2>CRM AGENT CONTROL PANEL</h2>
          <p>
            DECRYPTING PORTFOLIO DATA STREAMS. CHOOSE A RUNTIME SCHEMA TO INITIATE RELATIONSHIP QUERY:
          </p>
          <div className="welcome-suggestions">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="suggestion-btn"
                onClick={() => onSendMessage(s.text)}
              >
                <span className="suggestion-icon">{s.icon}</span>
                {s.text}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          {renderMessages()}
          {isLoading && (
            <div className="thinking-indicator">
              <div className="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>Agent is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message Banking AI Agent..."
            rows={1}
            disabled={connectionStatus !== 'connected'}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || connectionStatus !== 'connected'}
            title="EXECUTE QUERY"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
