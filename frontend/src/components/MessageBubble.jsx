import ReactMarkdown from 'react-markdown'

/**
 * Message bubble component — renders user and assistant messages.
 * Assistant messages support markdown rendering.
 */
export default function MessageBubble({ message }) {
  const { type, content } = message

  const contentString = typeof content === 'string'
    ? content
    : (content && typeof content === 'object' ? JSON.stringify(content) : String(content || ''));

  if (type === 'error') {
    return (
      <div className="error-banner">
        <span>⚠️</span>
        <span>{contentString}</span>
      </div>
    )
  }

  return (
    <div className={`message ${type}`}>
      <div className="message-label">
        {type === 'user' ? 'You' : 'AI Assistant'}
      </div>
      <div className="message-bubble">
        {type === 'assistant' ? (
          <ReactMarkdown>{contentString}</ReactMarkdown>
        ) : (
          contentString
        )}
      </div>
    </div>
  )
}
