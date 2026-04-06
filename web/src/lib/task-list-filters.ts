import type { TaskLike, TaskNode } from "@/lib/task-tree";

export type ListFilterState = {
  search: string;
  assigneeId: string;
  priority: string;
  dueMode: string;
  kanbanColumnId: string;
};

export const defaultListFilterState = (): ListFilterState => ({
  search: "",
  assigneeId: "",
  priority: "",
  dueMode: "",
  kanbanColumnId: "",
});

export function hasActiveListFilter(state: ListFilterState): boolean {
  return !!(
    state.search.trim() ||
    state.assigneeId ||
    state.priority ||
    state.dueMode ||
    state.kanbanColumnId
  );
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function passesDueFilter(
  task: { dueDate: string | null; done: boolean },
  dueMode: string,
): boolean {
  if (!dueMode) return true;
  const due = task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : null;
  const today = todayYmd();
  if (dueMode === "none") return !due;
  if (!due) return false;
  if (dueMode === "today") return due === today;
  if (dueMode === "overdue") return due < today && !task.done;
  if (dueMode === "next7") {
    if (due < today) return false;
    const a = new Date(`${today}T12:00:00`);
    const b = new Date(`${due}T12:00:00`);
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
    return diff >= 0 && diff <= 7;
  }
  return true;
}

export type FilterableTask = TaskLike & {
  title: string;
  description: string | null;
  assigneeIds?: string[] | null;
  priority: string;
  kanbanColumnId: string;
  dueDate: string | null;
  done: boolean;
};

export function taskMatchesFilter(task: FilterableTask, state: ListFilterState): boolean {
  const q = state.search.trim().toLowerCase();
  if (q) {
    const title = (task.title || "").toLowerCase();
    const desc = (task.description || "").toLowerCase();
    if (!title.includes(q) && !desc.includes(q)) return false;
  }
  if (state.assigneeId) {
    const ids = task.assigneeIds || [];
    if (!ids.includes(state.assigneeId)) return false;
  }
  if (state.priority && task.priority !== state.priority) return false;
  if (state.kanbanColumnId && task.kanbanColumnId !== state.kanbanColumnId) return false;
  if (!passesDueFilter(task, state.dueMode)) return false;
  return true;
}

export function filterTaskTree<T extends FilterableTask>(nodes: TaskNode<T>[], state: ListFilterState): TaskNode<T>[] {
  const out: TaskNode<T>[] = [];
  for (const n of nodes) {
    const kids = filterTaskTree(n.children as TaskNode<T>[], state);
    if (taskMatchesFilter(n, state) || kids.length) {
      out.push({ ...n, children: kids });
    }
  }
  return out;
}
