"use client";

import { useMemo } from "react";
import type { TaskLike as LibTaskLike, TaskNode } from "@/lib/task-tree";

type GraphTaskLike = LibTaskLike & {
  title: string;
  dependsOnTaskIds?: string[] | null;
};

const X_STEP = 200;
const Y_STEP = 48;
const NODE_W = 168;
const NODE_H = 34;
const PAD = 20;

type Pos = { x: number; y: number; title: string };

function collectIds<T extends GraphTaskLike>(nodes: TaskNode<T>[], out: Set<string>) {
  for (const n of nodes) {
    out.add(n.id);
    collectIds(n.children as TaskNode<T>[], out);
  }
}

/** Hierarchisches Layout: Tiefe = Spalte (x), Blätter belegen Zeilen (y); Eltern vertikal zentriert. */
function layoutForest<T extends GraphTaskLike>(roots: TaskNode<T>[]): Map<string, Pos> {
  const pos = new Map<string, Pos>();
  let nextLeafRow = 0;

  function layout(node: TaskNode<T>, depth: number): { min: number; max: number } {
    if (node.children.length === 0) {
      const row = nextLeafRow++;
      pos.set(node.id, {
        x: PAD + depth * X_STEP,
        y: PAD + row * Y_STEP,
        title: node.title,
      });
      return { min: row, max: row };
    }
    const ranges: { min: number; max: number }[] = [];
    for (const c of node.children) {
      ranges.push(layout(c as TaskNode<T>, depth + 1));
    }
    const min = Math.min(...ranges.map((r) => r.min));
    const max = Math.max(...ranges.map((r) => r.max));
    const mid = (min + max) / 2;
    pos.set(node.id, {
      x: PAD + depth * X_STEP,
      y: PAD + mid * Y_STEP,
      title: node.title,
    });
    return { min, max };
  }

  for (const root of roots) {
    layout(root, 0);
    nextLeafRow += 2;
  }

  return pos;
}

function centerOf(id: string, pos: Map<string, Pos>): { cx: number; cy: number } | null {
  const p = pos.get(id);
  if (!p) return null;
  return { cx: p.x + NODE_W / 2, cy: p.y + NODE_H / 2 };
}

type Props<T extends GraphTaskLike> = {
  roots: TaskNode<T>[];
};

export default function TaskTreeGraph<T extends GraphTaskLike>({ roots }: Props<T>) {
  const { pos, size, parentEdges, depEdges } = useMemo(() => {
    const posMap = layoutForest(roots);
    const visible = new Set<string>();
    collectIds(roots, visible);

    let maxX = PAD;
    let maxY = PAD;
    for (const [, p] of posMap) {
      maxX = Math.max(maxX, p.x + NODE_W + PAD);
      maxY = Math.max(maxY, p.y + NODE_H + PAD);
    }

    const pEdges: { from: string; to: string }[] = [];
    function walkParent(n: TaskNode<T>) {
      for (const c of n.children) {
        pEdges.push({ from: n.id, to: c.id });
        walkParent(c as TaskNode<T>);
      }
    }
    for (const r of roots) walkParent(r);

    const dEdges: { from: string; to: string }[] = [];
    const depSeen = new Set<string>();
    for (const id of visible) {
      const node = findNode(roots, id);
      if (!node) continue;
      const deps = node.dependsOnTaskIds;
      if (!Array.isArray(deps)) continue;
      for (const predId of deps) {
        if (visible.has(predId) && predId !== id) {
          const key = `${predId}→${id}`;
          if (depSeen.has(key)) continue;
          depSeen.add(key);
          dEdges.push({ from: predId, to: id });
        }
      }
    }

    return {
      pos: posMap,
      size: { w: maxX, h: maxY },
      parentEdges: pEdges,
      depEdges: dEdges,
    };
  }, [roots]);

  return (
    <div className="task-tree-graph">
      <p className="task-tree-graph__legend">
        Durchgezogen: Hierarchie (Hauptaufgabe → Unteraufgabe). Gestrichelt: Abhängigkeit (Vorgänger → Nachfolger).
      </p>
      <div className="task-tree-graph__scroll">
        <svg width={size.w} height={size.h} className="task-tree-graph__svg" aria-label="Aufgabenbaum">
          {depEdges.map((e) => {
            const a = centerOf(e.from, pos);
            const b = centerOf(e.to, pos);
            if (!a || !b) return null;
            const mx = (a.cx + b.cx) / 2;
            const d = `M${a.cx},${a.cy} Q${mx},${a.cy - 28} ${b.cx},${b.cy}`;
            return (
              <path
                key={`dep-${e.from}-${e.to}`}
                d={d}
                fill="none"
                stroke="rgba(96,165,250,0.75)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
            );
          })}

          {parentEdges.map((e) => {
            const p = pos.get(e.from);
            const c = pos.get(e.to);
            if (!p || !c) return null;
            const x1 = p.x + NODE_W;
            const y1 = p.y + NODE_H / 2;
            const x2 = c.x;
            const y2 = c.y + NODE_H / 2;
            const midX = (x1 + x2) / 2;
            return (
              <path
                key={`par-${e.from}-${e.to}`}
                d={`M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`}
                fill="none"
                stroke="rgba(167,139,250,0.55)"
                strokeWidth={1.5}
              />
            );
          })}

          {[...pos.entries()].map(([id, p]) => (
            <g key={id}>
              <rect
                x={p.x}
                y={p.y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                className="task-tree-graph__node-rect"
              />
              <text x={p.x + 8} y={p.y + NODE_H / 2 + 4} className="task-tree-graph__node-text">
                {p.title.length > 22 ? `${p.title.slice(0, 20)}…` : p.title}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function findNode<T extends GraphTaskLike>(roots: TaskNode<T>[], id: string): TaskNode<T> | null {
  for (const r of roots) {
    if (r.id === id) return r;
    const d = findNode(r.children as TaskNode<T>[], id);
    if (d) return d;
  }
  return null;
}
