import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Custom hook for WebSocket-based chat with the LangGraph agent.
 * Manages connection lifecycle, message state, tool calls, streaming, and persistent threads.
 */
const getSessionIdFromUrl = () => {
  const match = window.location.pathname.match(/\/v1\/agent\/c\/([^/]+)/)
  return match ? match[1] : null
}

export function useChat(user) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected, connecting, connected
  const [threads, setThreads] = useState([])
  const [threadId, setThreadId] = useState(() => {
    const urlId = getSessionIdFromUrl()
    return urlId || null
  })

  // Synchronize URL pathname with active thread state
  useEffect(() => {
    if (threadId) {
      const currentUrlId = getSessionIdFromUrl()
      if (currentUrlId !== threadId) {
        window.history.pushState(null, '', `/v1/agent/c/${threadId}`)
      }
    } else {
      if (window.location.pathname !== '/v1/agent/ask') {
        window.history.pushState(null, '', '/v1/agent/ask')
      }
    }
  }, [threadId])
  
  const wsRef = useRef(null)
  const pendingToolCalls = useRef(new Map())

  // Fetch threads from backend
  const fetchThreads = useCallback(() => {
    if (!user?.id) return
    fetch(`/api/v1/chat/threads?user_id=${user.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load threads')
        return res.json()
      })
      .then(data => setThreads(data || []))
      .catch(err => console.error('Error fetching threads:', err))
  }, [user?.id])

  // Delete thread
  const deleteThread = useCallback((id) => {
    if (!user?.id) return
    fetch(`/api/v1/chat/threads/${id}?user_id=${user.id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          fetchThreads()
          if (id === threadId) {
            setMessages([])
            setThreadId(null)
          }
        }
      })
      .catch(err => console.error('Error deleting thread:', err))
  }, [user?.id, threadId, fetchThreads])

  // Connect WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (!user?.id) return

    setConnectionStatus('connecting')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Pass user_id query parameter
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/chat?user_id=${user.id}`)

    ws.onopen = () => {
      setConnectionStatus('connected')
      console.log('🔌 WebSocket connected')
    }

    ws.onclose = () => {
      setConnectionStatus('disconnected')
      console.log('🔌 WebSocket disconnected')
      // Auto-reconnect after 3 seconds
      setTimeout(connect, 3000)
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      setConnectionStatus('disconnected')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleServerEvent(data)
    }

    wsRef.current = ws
  }, [user?.id])

  // Handle events from the server
  const handleServerEvent = useCallback((data) => {
    switch (data.type) {
      case 'tool_call':
        const toolCallId = `${data.name}-${Date.now()}`
        pendingToolCalls.current.set(data.name, toolCallId)
        setMessages(prev => [...prev, {
          id: toolCallId,
          type: 'tool_call',
          name: data.name,
          args: data.args,
          status: 'calling',
          result: null,
          timestamp: Date.now(),
        }])
        break

      case 'tool_result':
        setMessages(prev => prev.map(msg => {
          if (msg.type === 'tool_call' && msg.name === data.name && msg.status === 'calling') {
            return { ...msg, status: 'done', result: data.result }
          }
          return msg
        }))
        break

      case 'agent_message':
        setMessages(prev => [...prev, {
          id: `agent-${Date.now()}`,
          type: 'assistant',
          content: data.content,
          timestamp: Date.now(),
        }])
        setIsLoading(false)
        break

      case 'error':
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'error',
          content: data.content,
          timestamp: Date.now(),
        }])
        setIsLoading(false)
        break

      case 'done':
        setIsLoading(false)
        if (data.thread_id) {
          setThreadId(data.thread_id)
        }
        fetchThreads() // Refresh the thread titles in sidebar
        break
    }
  }, [fetchThreads])

  // Send a message
  const sendMessage = useCallback((text) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    if (!user?.id) return

    const activeThreadId = threadId

    const proceedSend = (tid) => {
      // Add user message
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        type: 'user',
        content: text,
        timestamp: Date.now(),
      }])

      setIsLoading(true)
      pendingToolCalls.current.clear()

      // Send to server
      wsRef.current.send(JSON.stringify({
        message: text,
        thread_id: tid,
      }))
    }

    if (!activeThreadId) {
      // Create new thread first on the backend
      fetch(`/api/v1/chat/threads?user_id=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' })
      })
        .then(res => res.json())
        .then(data => {
          setThreadId(data.id)
          proceedSend(data.id)
          fetchThreads()
        })
        .catch(err => console.error('Failed to create thread for message:', err))
    } else {
      proceedSend(activeThreadId)
    }
  }, [threadId, user?.id, fetchThreads])

  // Start a new conversation
  const newChat = useCallback(() => {
    setMessages([])
    setThreadId(null)
    setIsLoading(false)
    pendingToolCalls.current.clear()
  }, [])

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlId = getSessionIdFromUrl()
      if (urlId && urlId !== threadId) {
        setThreadId(urlId)
      } else if (!urlId) {
        setThreadId(null)
        setMessages([])
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [threadId])

  // Fetch threads on mount or when user changes
  useEffect(() => {
    if (user) {
      fetchThreads()
    }
  }, [user, fetchThreads])

  // Fetch chat history from the backend when threadId changes
  useEffect(() => {
    if (!threadId) {
      setMessages([])
      return
    }

    let active = true
    setIsLoading(true)

    fetch(`/api/v1/chat/${threadId}/history`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch history')
        return res.json()
      })
      .then(data => {
        if (active) {
          setMessages(data.messages || [])
          setIsLoading(false)
        }
      })
      .catch(err => {
        console.warn('Could not load chat history:', err)
        if (active) {
          setMessages([])
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [threadId])

  // Connect on mount
  useEffect(() => {
    if (user) {
      connect()
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect, user])

  return {
    messages,
    isLoading,
    connectionStatus,
    threads,
    threadId,
    setThreadId,
    sendMessage,
    newChat,
    deleteThread,
    fetchThreads
  }
}
