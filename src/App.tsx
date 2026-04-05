import { type FormEvent, useState } from 'react'
import { useTasks } from './hooks/useTasks'
import type { Priority } from './types/task'
import { PRIORITY_LABELS } from './types/task'
import './App.css'

const PRIORITIES: Priority[] = ['high', 'medium', 'low']

function App() {
  const { tasks, addTask, toggleDone, removeTask } = useTasks()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    addTask(title, priority)
    setTitle('')
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Smart ToDo</h1>
        <p className="app__subtitle">Aufgaben mit Priorität — lokal gespeichert</p>
      </header>

      <form className="form" onSubmit={handleSubmit} aria-label="Neue Aufgabe">
        <div className="form__row">
          <label htmlFor="task-title" className="visually-hidden">
            Aufgabentitel
          </label>
          <input
            id="task-title"
            className="form__input"
            type="text"
            placeholder="Neue Aufgabe …"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={500}
            autoComplete="off"
          />
        </div>
        <div className="form__row form__row--split">
          <fieldset className="form__priorities">
            <legend className="form__legend">Priorität</legend>
            <div className="form__radioGroup" role="radiogroup" aria-label="Priorität wählen">
              {PRIORITIES.map((p) => (
                <label key={p} className="form__radioLabel">
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                  />
                  <span>{PRIORITY_LABELS[p]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="form__submit" disabled={!title.trim()}>
            Hinzufügen
          </button>
        </div>
      </form>

      <section className="list" aria-label="Aufgabenliste">
        {tasks.length === 0 ? (
          <p className="list__empty">Noch keine Aufgaben. Leg los oben.</p>
        ) : (
          <ul className="list__items">
            {tasks.map((task) => (
              <li
                key={task.id}
                className={`task task--${task.priority}${task.done ? ' task--done' : ''}`}
              >
                <label className="task__check">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleDone(task.id)}
                    aria-label={`Erledigt: ${task.title}`}
                  />
                  <span className="task__title">{task.title}</span>
                </label>
                <span className="task__badge" title="Priorität">
                  {PRIORITY_LABELS[task.priority]}
                </span>
                <button
                  type="button"
                  className="task__delete"
                  onClick={() => removeTask(task.id)}
                  aria-label={`Aufgabe löschen: ${task.title}`}
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
