import { useState, useEffect } from 'react'
import { useChat } from './hooks/useChat.js'
import Sidebar from './components/Sidebar.jsx'
import ChatInterface from './components/ChatInterface.jsx'

/**
 * Root application component.
 * Layout: Sidebar (left) + Chat Area (right)
 */
export default function App() {
  const { messages, isLoading, connectionStatus, sendMessage, newChat } = useChat()
  
  // Theme state defaulting to 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="app-layout">
      <Sidebar 
        onSendMessage={sendMessage} 
        onNewChat={newChat} 
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        connectionStatus={connectionStatus}
        onSendMessage={sendMessage}
      />
    </div>
  )
}
