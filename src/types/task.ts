export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  priority: Priority
  done: boolean
  createdAt: string
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
}
