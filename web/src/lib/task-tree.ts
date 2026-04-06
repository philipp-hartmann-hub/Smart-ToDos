export type TaskLike = {
  id: string;
  parentId: string | null;
};

export type TaskNode<T extends TaskLike> = T & { children: TaskNode<T>[] };

/** Flache Liste → Baum (nur bekannte Eltern; verwaiste `parentId` werden als Wurzel behandelt). */
export function buildTaskTree<T extends TaskLike>(tasks: T[]): TaskNode<T>[] {
  const map = new Map<string, TaskNode<T>>();
  for (const t of tasks) {
    map.set(t.id, { ...t, children: [] });
  }
  const roots: TaskNode<T>[] = [];
  for (const t of tasks) {
    const n = map.get(t.id)!;
    if (t.parentId && map.has(t.parentId)) {
      map.get(t.parentId)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  function sortRec(nodes: TaskNode<T>[]) {
    nodes.sort((a, b) => a.id.localeCompare(b.id));
    for (const n of nodes) sortRec(n.children);
  }
  sortRec(roots);
  return roots;
}
