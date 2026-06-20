/**
 * Sidebar with RM profile, quick actions, and recent chat threads.
 */
import AppLogo from './AppLogo.jsx'
export default function Sidebar({ 
  user,
  threads,
  currentThreadId,
  onSelectThread,
  onDeleteThread,
  onSendMessage, 
  onNewChat, 
  onLogout,
  currentPath,
  onNavigate,
  isOpen,
  onClose
}) {

  return (
    <aside className={`w-[340px] min-w-[340px] bg-bg-secondary border-r-3 border-black flex flex-col h-dvh overflow-hidden z-10 max-md:fixed max-md:top-0 max-md:bottom-0 max-md:z-[1000] max-md:shadow-brutal-lg max-md:transition-[left] max-md:duration-250 max-md:ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'max-md:left-0' : 'max-md:left-[-345px]'}`}>
      {/* Sidebar Header */}
      <div className="p-4 border-b-3 border-black flex items-center justify-between bg-accent-pink">
        <AppLogo />
        <button 
          className="block md:hidden bg-white border-2 border-black cursor-pointer font-bold py-0.5 px-2 shadow-[2px_2px_0px_#000000] text-black font-sans transition-[transform,box-shadow] duration-75 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none" 
          onClick={onClose} 
          title="CLOSE MENU"
        >
          ✖
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6 p-4 overflow-hidden">
        {/* New Chat Button */}
        <div className="py-1">
          <button 
            className="w-full p-4 bg-accent-lime border-3 border-black rounded-md text-[15.2px] font-bold uppercase tracking-wide cursor-pointer transition-[transform,box-shadow,background] duration-75 flex items-center justify-center gap-2 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] hover:bg-accent-lime-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none" 
            onClick={onNewChat}
          >
            <span>⚡</span> NEW SESSION
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="font-display text-[12.8px] font-black uppercase tracking-wider text-text-primary mb-1 flex items-center gap-1.5">
            <span>🧭</span> NAVIGATION
          </div>
          <div className="flex flex-col gap-1.5">
            <button 
              className={`w-full text-left font-sans font-bold uppercase text-[12px] py-2 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] border-2 border-black transition-[transform,box-shadow,background] duration-75 text-text-primary flex items-center gap-2 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] ${
                currentPath === '/v1/agent/ask' ? 'bg-accent-violet text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
              }`}
              onClick={() => onNavigate('/v1/agent/ask')}
            >
              <span>💬</span> CHAT CONSOLE
            </button>
            <button 
              className={`w-full text-left font-sans font-bold uppercase text-[12px] py-2 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] border-2 border-black transition-[transform,box-shadow,background] duration-75 text-text-primary flex items-center gap-2 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] ${
                currentPath === '/v1/datasource/customer' ? 'bg-accent-yellow text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
              }`}
              onClick={() => onNavigate('/v1/datasource/customer')}
            >
              <span>👤</span> CUSTOMER DIRECTORY
            </button>
            <button 
              className={`w-full text-left font-sans font-bold uppercase text-[12px] py-2 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] border-2 border-black transition-[transform,box-shadow,background] duration-75 text-text-primary flex items-center gap-2 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] ${
                currentPath === '/v1/datasource/aitools' ? 'bg-accent-lime text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
              }`}
              onClick={() => onNavigate('/v1/datasource/aitools')}
            >
              <span>🤖</span> AI TOOLS
            </button>
            <button 
              className={`w-full text-left font-sans font-bold uppercase text-[12px] py-2 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] border-2 border-black transition-[transform,box-shadow,background] duration-75 text-text-primary flex items-center gap-2 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] ${
                currentPath === '/v1/datasource/products' ? 'bg-accent-orange text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
              }`}
              onClick={() => onNavigate('/v1/datasource/products')}
            >
              <span>📦</span> PRODUCT CATALOG
            </button>
            <button 
              className={`w-full text-left font-sans font-bold uppercase text-[12px] py-2 px-3.5 cursor-pointer shadow-[2px_2px_0px_#000000] border-2 border-black transition-[transform,box-shadow,background] duration-75 text-text-primary flex items-center gap-2 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000000] ${
                currentPath === '/v1/datasource/apis' ? 'bg-accent-pink text-black shadow-[3px_3px_0px_#000000]' : 'bg-bg-card'
              }`}
              onClick={() => onNavigate('/v1/datasource/apis')}
            >
              <span>📡</span> CORE REST APIs
            </button>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          <div className="font-display text-[12.8px] font-black uppercase tracking-wider text-text-primary mb-2 flex items-center gap-1.5">
            <span>📁</span> ACTIVE_THREADS
          </div>
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
            {threads.length > 0 ? (
              threads.map(t => (
                <div 
                  key={t.id} 
                  className={`flex items-center gap-1 px-4 py-1.5 cursor-pointer transition-all duration-75 ${
                    currentThreadId === t.id 
                      ? 'bg-accent-yellow border-3 border-black shadow-[3px_3px_0px_#000000]' 
                      : 'bg-bg-card border border-black hover:bg-accent-cyan'
                  }`}
                  onClick={() => onSelectThread(t.id)}
                >
                  <span className="text-sm">🤖</span>
                  <span className="flex-1 font-sans text-[12.5px] font-bold text-black truncate" title={t.title}>{t.title}</span>
                  <button 
                    className="bg-transparent border-none text-[12px] cursor-pointer opacity-70 hover:opacity-100 hover:text-accent-rose" 
                    onClick={(e) => { e.stopPropagation(); onDeleteThread(t.id); }}
                    title="TERMINATE THREAD"
                  >
                    ✖
                  </button>
                </div>
              ))
            ) : (
              <div className="text-xs italic text-text-muted">No active threads. Start typing below!</div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
