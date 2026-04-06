"use client";

import { useState } from "react";
import ProjectTasks from "./project-tasks";
import ProjectKanban from "./project-kanban";

type Task = {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  priority: string;
  done: boolean;
  archived: boolean;
  startDate: string | null;
  dueDate: string | null;
  description: string | null;
  kanbanColumnId: string;
  swimlaneId: string;
};

export default function ProjectWorkspace({ projectId, initialTasks }: { projectId: string; initialTasks: Task[] }) {
  const [mode, setMode] = useState<"list" | "kanban">("list");
  return (
    <>
      <div className="card">
        <div className="row">
          <button className={mode === "list" ? "" : "secondary"} onClick={() => setMode("list")}>
            Aufgabenliste
          </button>
          <button className={mode === "kanban" ? "" : "secondary"} onClick={() => setMode("kanban")}>
            Kanban
          </button>
        </div>
      </div>
      {mode === "list" ? (
        <ProjectTasks projectId={projectId} initialTasks={initialTasks} />
      ) : (
        <ProjectKanban projectId={projectId} initialTasks={initialTasks} />
      )}
    </>
  );
}
