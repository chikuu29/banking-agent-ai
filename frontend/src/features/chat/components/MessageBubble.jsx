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
      <div className="py-2 px-4 bg-accent-rose text-black font-bold font-mono border-3 border-black rounded-sm my-4 flex items-center gap-2 shadow-[3px_3px_0px_#000000]">
        <span>⚠️</span>
        <span>{contentString}</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col mb-2 animate-[messageSlideIn_0.22s_cubic-bezier(0.175,0.885,0.32,1.275)] group ${type === 'user' ? 'max-w-[78%] md:max-w-[90%] self-end' : 'w-full max-w-full self-start'}`}>
      <div className={`flex items-center gap-2 mb-1.5 transition-transform duration-75 hover:scale-105 ${type === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
        <span className={`text-[14.4px] inline-flex items-center justify-center w-7 h-7 border-2 border-black rounded-full shadow-[2px_2px_0px_#000000] transition-transform duration-75 group-hover:rotate-[-10deg] ${type === 'user' ? 'bg-accent-pink' : 'bg-accent-yellow'}`}>
          {type === 'user' ? '🧑‍💻' : '🤖'}
        </span>
        <span className={`font-mono text-[11.5px] font-extrabold text-black! tracking-wider border-2 border-black rounded px-2 py-0.5 shadow-[2px_2px_0px_#000000] uppercase ${type === 'user' ? 'bg-accent-cyan' : 'bg-accent-lime'}`}>
          {type === 'user' ? 'USER' : 'AGENT'}
        </span>
      </div>
      <div className={`p-4 px-6 border-3 border-black text-[14px] leading-relaxed break-words shadow-[4px_4px_0px_#000000] rounded-md transition-[transform,box-shadow] duration-75 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000000] md:py-2 md:px-4 md:text-[13.1px] message-bubble ${
        type === 'user' ? 'bg-accent-violet text-black rounded-br-none' : 'bg-bg-card text-text-primary rounded-tl-none'
      }`}>
        {type === 'assistant' ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentString}</ReactMarkdown>
        ) : (
          contentString
        )}
      </div>
    </div>
  )
}

