import { useState, useRef, useEffect } from 'react'
import { api } from './api'

function formatMarkdown(text) {
  if (!text) return null
  // Simple renderer for bold, inline code, and line breaks
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    // Process bold **text** and `code`
    const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g)
    const formattedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={pIdx} className="chat-code">{part.slice(1, -1)}</code>
      }
      return part
    })

    const isListItem = line.trim().startsWith('* ') || line.trim().startsWith('- ')
    return (
      <div key={idx} className={isListItem ? 'chat-list-item' : 'chat-line'}>
        {formattedLine}
      </div>
    )
  })
}

export default function ChatWidget({ onTasksChanged }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Task Assistant. Ask me to create, view, update, or delete tasks for you.',
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolStatus, setToolStatus] = useState(null)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      inputRef.current?.focus()
    }
  }, [isOpen, messages, toolStatus])

  async function handleSend(textToSend) {
    const prompt = (textToSend || input).trim()
    if (!prompt || isStreaming) return

    const userMessage = { role: 'user', content: prompt }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsStreaming(true)
    setToolStatus(null)

    // Prepare assistant response holder
    const assistantIndex = updatedMessages.length
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    let toolTriggered = false
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Only send the last N messages to preserve context without excessive tokens
    const contextMessages = updatedMessages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }))

    await api.streamChat(contextMessages, {
      signal: controller.signal,
      onChunk: (chunk) => {
        setMessages(prev => {
          const next = [...prev]
          if (next[assistantIndex]) {
            next[assistantIndex] = {
              ...next[assistantIndex],
              content: next[assistantIndex].content + chunk,
            }
          }
          return next
        })
      },
      onTool: (event) => {
        toolTriggered = true
        if (event.type === 'tool_call') {
          const names = event.tool_calls?.map(t => t.name).join(', ') || 'tool'
          setToolStatus(`Running ${names}…`)
        } else if (event.type === 'tool_result') {
          setToolStatus(`Completed ${event.name || 'action'}`)
          // Refresh tasks immediately when a tool modifies or queries them
          onTasksChanged?.()
        }
      },
      onDone: () => {
        setIsStreaming(false)
        setToolStatus(null)
        if (toolTriggered) {
          onTasksChanged?.()
        }
      },
      onError: (err) => {
        setIsStreaming(false)
        setToolStatus(null)
        setMessages(prev => {
          const next = [...prev]
          if (next[assistantIndex]) {
            next[assistantIndex] = {
              ...next[assistantIndex],
              content: (next[assistantIndex].content ? next[assistantIndex].content + '\n\n' : '') + `⚠️ *Error: ${err}*`,
            }
          }
          return next
        })
      },
    })
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
      setToolStatus(null)
    }
  }

  function handleClear() {
    setMessages([
      {
        role: 'assistant',
        content: 'Conversation cleared. How can I help you manage your tasks today?',
      },
    ])
    setToolStatus(null)
  }

  const suggestions = [
    '📋 List all my tasks',
    '➕ Add task: Buy groceries tomorrow (High)',
    '⚡ What are my active tasks?',
    '✅ Mark the first task as done',
  ]

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        id="chat-toggle-btn"
        className={`chat-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Close chat' : 'Open AI Task Assistant'}
      >
        <span className="chat-toggle-icon">{isOpen ? '✕' : '✨'}</span>
        {!isOpen && <span className="chat-toggle-text">AI Assistant</span>}
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="chat-widget" id="chat-widget">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">🤖</div>
              <div>
                <h3>TaskFlow AI</h3>
                <span className="chat-status">
                  <span className="chat-status-dot" /> Online
                </span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                className="chat-action-btn"
                onClick={handleClear}
                title="Clear conversation"
                disabled={isStreaming}
              >
                🗑
              </button>
              <button
                className="chat-action-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="chat-msg-avatar">✨</div>
                )}
                <div className="chat-msg-bubble">
                  {formatMarkdown(msg.content)}
                  {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                    <span className="chat-cursor" />
                  )}
                </div>
              </div>
            ))}

            {toolStatus && (
              <div className="chat-tool-status">
                <span className="chat-tool-spinner" />
                <span>{toolStatus}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (shown when few messages) */}
          {messages.length <= 2 && (
            <div className="chat-suggestions">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  className="chat-suggestion-chip"
                  onClick={() => handleSend(s.replace(/^[^\s]+\s/, ''))}
                  disabled={isStreaming}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            className="chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <input
              ref={inputRef}
              id="chat-input"
              className="chat-input"
              placeholder={isStreaming ? 'AI is replying…' : 'Ask AI to add, list, or update tasks…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                type="button"
                className="chat-stop-btn"
                onClick={handleStop}
                title="Stop generation"
              >
                ⏹ Stop
              </button>
            ) : (
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!input.trim()}
                title="Send message"
              >
                ➤
              </button>
            )}
          </form>
        </div>
      )}
    </>
  )
}
