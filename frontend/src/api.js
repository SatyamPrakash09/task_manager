import axios from 'axios'

const client = axios.create({ baseURL: '/api/v1/task' })

export const api = {
  list:   ()         => client.get('/list-task').then(r => r.data),
  create: (body)     => client.post('/create-task', body).then(r => r.data),
  update: (id, body) => client.patch(`/update-task/${id}`, body).then(r => r.data),
  delete: (id)       => client.delete(`/delete-task/${id}`).then(r => r.data),

  streamChat: async (messages, { onChunk, onTool, onDone, onError, signal }) => {
    try {
      const res = await fetch('/api/v1/task/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal,
      })

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()

        for (const part of parts) {
          const lines = part.split('\n')
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            const jsonStr = trimmed.slice(6).trim()
            try {
              const event = JSON.parse(jsonStr)
              if (event.type === 'llm_chunk') {
                onChunk?.(event.content)
              } else if (event.type === 'tool_call' || event.type === 'tool_result') {
                onTool?.(event)
              } else if (event.type === 'done') {
                onDone?.()
              } else if (event.type === 'error') {
                onError?.(event.content)
              }
            } catch (err) {
              console.warn('Failed parsing SSE:', jsonStr, err)
            }
          }
        }
      }
      onDone?.()
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err.message || 'Streaming connection failed')
      }
    }
  },
}
