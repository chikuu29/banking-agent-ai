import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
      <div className="message-header">
        <span className="avatar-icon">{type === 'user' ? '🧑‍💻' : '🤖'}</span>
        <span className="message-label">
          {type === 'user' ? 'USER' : 'AGENT'}
        </span>
      </div>
      <div className="message-bubble">
        {type === 'assistant' ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentString}</ReactMarkdown>
        ) : (
          contentString
        )}
      </div>
    </div>
  )
}

