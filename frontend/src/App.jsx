import { useState, useEffect, useRef } from 'react'
import { api } from './api'

/* ── small helpers ─────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function priorityBadge(p) {
  if (!p) return null
  const cls = p === 'high' ? 'badge-high' : p === 'medium' ? 'badge-medium' : 'badge-low'
  return <span className={`badge ${cls}`}>{p}</span>
}

/* ── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type }) {
  if (!msg) return null
  return <div className={`toast ${type}`}>{msg}</div>
}

/* ── Check button ──────────────────────────────────────────────── */
function CheckBtn({ checked, onClick }) {
  return (
    <button className={`check-btn ${checked ? 'checked' : ''}`} onClick={onClick} title="Toggle complete">
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </button>
  )
}

/* ── TaskCard ──────────────────────────────────────────────────── */
function TaskCard({ task, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function saveEdit() {
    if (!editTitle.trim() || editTitle.trim() === task.title) { setEditing(false); return }
    setLoading(true)
    await onUpdate(task.id, { title: editTitle.trim() })
    setLoading(false)
    setEditing(false)
  }

  async function toggleComplete() {
    await onUpdate(task.id, { complete: !task.complete })
  }

  return (
    <div className={`task-card ${task.complete ? 'done' : ''}`}>
      <CheckBtn checked={task.complete} onClick={toggleComplete} />

      {editing ? (
        <div className="edit-form">
          <input
            ref={inputRef}
            className="input"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
          />
          <div className="edit-actions">
            <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={loading}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="task-body">
          <div className="task-title">{task.title}</div>
          <div className="task-meta">
            {priorityBadge(task.priority)}
            {task.tags?.map(t => <span key={t} className="badge badge-tag">#{t}</span>)}
            {task.dueDate && <span className="task-date">📅 {fmtDate(task.dueDate)}</span>}
            <span className="task-date">added {fmtDate(task.createdAt)}</span>
          </div>
        </div>
      )}

      {!editing && (
        <div className="task-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)} title="Edit">✏️</button>
          <button className="btn btn-danger" onClick={() => onDelete(task.id)} title="Delete">🗑</button>
        </div>
      )}
    </div>
  )
}

/* ── AddForm ───────────────────────────────────────────────────── */
function AddForm({ onAdd }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    const body = {
      title: title.trim(),
      ...(priority && { priority }),
      ...(dueDate  && { dueDate: new Date(dueDate).toISOString() }),
      ...(tags.trim() && { tags: tags.split(',').map(t => t.trim()).filter(Boolean) }),
    }
    await onAdd(body)
    setTitle(''); setPriority(''); setDueDate(''); setTags('')
    setLoading(false)
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <div className="add-form-row">
        <input
          id="task-title-input"
          className="input"
          placeholder="What needs to be done?"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <button id="add-task-btn" className="btn btn-primary" type="submit" disabled={loading || !title.trim()}>
          {loading ? '…' : '+ Add'}
        </button>
      </div>
      <div className="input-row">
        <select id="priority-select" className="input" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="">Priority (optional)</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <input
          id="due-date-input"
          type="date"
          className="input"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
      </div>
      <input
        id="tags-input"
        className="input"
        placeholder="Tags (comma-separated, e.g. work, urgent)"
        value={tags}
        onChange={e => setTags(e.target.value)}
      />
    </form>
  )
}

/* ── App ───────────────────────────────────────────────────────── */
export default function App() {
  const [tasks, setTasks]   = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [toast, setToast]   = useState({ msg: '', type: '' })

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3000)
  }

  async function load() {
    try {
      const data = await api.list()
      setTasks(Array.isArray(data) ? data : [])
    } catch {
      showToast('Failed to load tasks', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(body) {
    try {
      const t = await api.create(body)
      setTasks(prev => [t, ...prev])
      showToast('Task added!')
    } catch (e) {
      showToast(e?.detail || 'Failed to add task', 'error')
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      showToast('Task deleted')
    } catch (e) {
      showToast(e?.detail || 'Failed to delete task', 'error')
    }
  }

  async function handleUpdate(id, body) {
    try {
      const updated = await api.update(id, body)
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch (e) {
      showToast(e?.detail || 'Failed to update task', 'error')
    }
  }

  const filtered = tasks.filter(t => {
    if (filter === 'active')   return !t.complete
    if (filter === 'done')     return  t.complete
    return true
  })

  const doneCount   = tasks.filter(t => t.complete).length
  const activeCount = tasks.filter(t => !t.complete).length

  return (
    <div className="app">
      <header className="header">
        <div className="header-icon">✅</div>
        <div>
          <h1>TaskFlow</h1>
          <span>Stay on top of your work</span>
        </div>
        <div className="task-count">{activeCount} active · {doneCount} done</div>
      </header>

      <AddForm onAdd={handleAdd} />

      <div className="filters">
        {['all', 'active', 'done'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all'    && ` (${tasks.length})`}
            {f === 'active' && ` (${activeCount})`}
            {f === 'done'   && ` (${doneCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loader">
          <div className="spinner" />
          Loading tasks…
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">{filter === 'done' ? '🎉' : '📋'}</div>
          {filter === 'done' ? 'No completed tasks yet' : filter === 'active' ? 'All caught up!' : 'Add your first task above'}
        </div>
      ) : (
        <div className="task-list">
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  )
}
