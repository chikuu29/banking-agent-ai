import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Custom hook for WebSocket-based chat with the LangGraph agent.
 * Manages connection lifecycle, message state, tool calls, and streaming.
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected, connecting, connected
  const [threadId, setThreadId] = useState(() => crypto.randomUUID())
  const wsRef = useRef(null)
  const pendingToolCalls = useRef(new Map())

  // Connect WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setConnectionStatus('connecting')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/chat`)

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
  }, [])

  // Handle events from the server
  const handleServerEvent = useCallback((data) => {
    switch (data.type) {
      case 'tool_call':
        // Agent is calling a tool
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
        // Tool returned a result
        setMessages(prev => prev.map(msg => {
          if (msg.type === 'tool_call' && msg.name === data.name && msg.status === 'calling') {
            return { ...msg, status: 'done', result: data.result }
          }
          return msg
        }))
        break

      case 'agent_message':
        // Agent's text response
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
        break
    }
  }, [])

  // Send a message
  const sendMessage = useCallback((text) => {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

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
      thread_id: threadId,
    }))
  }, [threadId])

  // Start a new conversation
  const newChat = useCallback(() => {
    setMessages([])
    setThreadId(crypto.randomUUID())
    setIsLoading(false)
    pendingToolCalls.current.clear()
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return {
    messages,
    isLoading,
    connectionStatus,
    threadId,
    sendMessage,
    newChat,
  }
}
