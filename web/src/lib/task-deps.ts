/** Abhängigkeiten: taskId hängt von dependsOnTaskIds (Vorgängern) ab. */

export type TaskDepCheck = {
  id: string;
  parentId: string | null;
  dependsOnTaskIds: string[] | null;
};

/** Alle Aufgaben, die transitiv von fromId abhängen (fromId ist Vorgänger). */
export function reachableDependents(tasks: TaskDepCheck[], fromId: string): Set<string> {
  const q = [fromId];
  const seen = new Set<string>();
  while (q.length) {
    const x = q.shift()!;
    if (seen.has(x)) continue;
    seen.add(x);
    for (const t of tasks) {
      const deps = t.dependsOnTaskIds || [];
      if (deps.includes(x)) q.push(t.id);
    }
  }
  return seen;
}

function isDescendantOf(ancestorId: string, nodeId: string, parentById: Map<string, string | null>): boolean {
  let cur: string | null = nodeId;
  while (cur) {
    if (cur === ancestorId) return true;
    cur = parentById.get(cur) ?? null;
  }
  return false;
}

export function validateDependsOnUpdate(
  taskId: string,
  newDeps: string[],
  tasks: TaskDepCheck[],
): { ok: true } | { ok: false; message: string } {
  const uniq = [...new Set(newDeps)];
  if (uniq.includes(taskId)) {
    return { ok: false, message: "Eine Aufgabe kann nicht von sich selbst abhängen." };
  }

  const parentById = new Map<string, string | null>();
  for (const t of tasks) parentById.set(t.id, t.parentId ?? null);

  for (const p of uniq) {
    if (isDescendantOf(taskId, p, parentById)) {
      return { ok: false, message: "Abhängigkeit darf keine Unteraufgabe dieser Karte sein." };
    }
  }

  const merged: TaskDepCheck[] = tasks.map((t) =>
    t.id === taskId ? { ...t, dependsOnTaskIds: uniq } : t,
  );

  const reach = reachableDependents(merged, taskId);
  for (const p of uniq) {
    if (reach.has(p)) {
      return { ok: false, message: "Diese Abhängigkeiten würden einen Zyklus erzeugen." };
    }
  }

  return { ok: true };
}
