export type GanttTaskNode = {
  id: string;
  parentId: string | null;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  done: boolean;
  dependsOnTaskIds: string[];
  kanbanColumnId: string;
  children: GanttTaskNode[];
};

export function ymdToDayIndex(ymd: string | null): number | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function dayIndexToDate(dayIndex: number): Date {
  return new Date(dayIndex * 86400000);
}

export function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type FlatGanttFields = {
  id: string;
  parentId: string | null;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  done: boolean;
  dependsOnTaskIds: string[];
  kanbanColumnId: string;
};

export function buildGanttTree(tasks: FlatGanttFields[]): GanttTaskNode[] {
  const map = new Map<string, GanttTaskNode>();
  for (const t of tasks) {
    map.set(t.id, {
      ...t,
      dependsOnTaskIds: t.dependsOnTaskIds || [],
      children: [],
    });
  }
  const roots: GanttTaskNode[] = [];
  for (const t of tasks) {
    const n = map.get(t.id)!;
    if (t.parentId && map.has(t.parentId)) {
      map.get(t.parentId)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  function sortRec(nodes: GanttTaskNode[]) {
    nodes.sort((a, b) => a.id.localeCompare(b.id));
    for (const n of nodes) sortRec(n.children);
  }
  sortRec(roots);
  return roots;
}

export function collectGanttRows(
  nodes: GanttTaskNode[],
  openMap: Record<string, boolean>,
  out: { node: GanttTaskNode; depth: number }[],
  depth = 0,
) {
  for (const n of nodes) {
    const isOpen = openMap[n.id] !== false;
    out.push({ node: n, depth });
    if (n.children.length && isOpen) {
      collectGanttRows(n.children, openMap, out, depth + 1);
    }
  }
}

export type MonthSegment = { startDay: number; endDay: number; label: string; widthFrac: number };

export function buildMonthSegments(
  minDay: number,
  maxDay: number,
  dayCount: number,
  scale: "day" | "month" | "year",
): MonthSegment[] {
  const out: MonthSegment[] = [];
  if (scale === "year") {
    let cursor = new Date(dayIndexToDate(minDay));
    cursor = new Date(cursor.getFullYear(), 0, 1);
    let y = cursor.getFullYear();
    while (cursor.getTime() <= dayIndexToDate(maxDay).getTime()) {
      const yearStart = Math.floor(new Date(y, 0, 1, 12).getTime() / 86400000);
      const nextYearStart = Math.floor(new Date(y + 1, 0, 1, 12).getTime() / 86400000);
      const from = Math.max(minDay, yearStart);
      const to = Math.min(maxDay + 1, nextYearStart);
      const widthFrac = (to - from) / dayCount;
      out.push({ startDay: from, endDay: to, label: String(y), widthFrac });
      y += 1;
      cursor = new Date(y, 0, 1);
    }
    return out;
  }
  let cursor = new Date(dayIndexToDate(minDay));
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  while (cursor.getTime() <= dayIndexToDate(maxDay).getTime()) {
    const monthStartDay = Math.floor(new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12).getTime() / 86400000);
    const nextMonthDay = Math.floor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12).getTime() / 86400000);
    const from = Math.max(minDay, monthStartDay);
    const to = Math.min(maxDay + 1, nextMonthDay);
    const widthFrac = (to - from) / dayCount;
    const label = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(cursor);
    out.push({ startDay: from, endDay: to, label, widthFrac });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return out;
}

export type BarGeom = { x1: number; x2: number; y: number; row: number };
