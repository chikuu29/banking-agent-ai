import ReactMarkdown from 'react-markdown'

/**
 * Message bubble component — renders user and assistant messages.
 * Assistant messages support markdown rendering.
 */
export default function MessageBubble({ message }) {
  const { type, content } = message

  if (type === 'error') {
    return (
      <div className="error-banner">
        <span>⚠️</span>
        <span>{content}</span>
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
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          content
        )}
      </div>
    </div>
  )
}
