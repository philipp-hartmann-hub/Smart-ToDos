import { useCallback, useEffect, useState } from 'react'
import type { Priority, Task } from '../types/task'
import { PRIORITY_ORDER } from '../types/task'

const STORAGE_KEY = 'smart-todo-tasks'

function isTask(value: unknown): value is Task {
  if (value === null || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    (o.priority === 'low' || o.priority === 'medium' || o.priority === 'high') &&
    typeof o.done === 'boolean' &&
    typeof o.createdAt === 'string'
  )
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTask)
  } catch {
    return []
  }
}

function sortTasks(a: Task, b: Task): number {
  const pa = PRIORITY_ORDER[a.priority]
  const pb = PRIORITY_ORDER[b.priority]
  if (pa !== pb) return pa - pb
  return a.createdAt.localeCompare(b.createdAt)
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks().sort(sortTasks))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const addTask = useCallback((title: string, priority: Priority) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const task: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      priority,
      done: false,
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => [...prev, task].sort(sortTasks))
  }, [])

  const toggleDone = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)).sort(sortTasks),
    )
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { tasks, addTask, toggleDone, removeTask }
}
