"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import ProjectTasks, { type ProjectMember } from "./project-tasks";
import ProjectKanban from "./project-kanban";
import ProjectGantt from "./project-gantt";
import ProjectProtocols from "./project-protocols";

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
  assigneeIds?: string[] | null;
};

type ProtocolTaskLink = {
  rowId: string;
  sessionId: string;
  sessionDate: string;
  groupId: string;
  groupName: string;
};

export default function ProjectWorkspace({
  projectId,
  initialTasks,
  projectMembers,
  initialProtocolLinksByTaskId,
}: {
  projectId: string;
  initialTasks: Task[];
  projectMembers: ProjectMember[];
  initialProtocolLinksByTaskId: Record<string, ProtocolTaskLink[]>;
}) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const initialMode: "list" | "protocols" | "gantt" | "kanban" =
    view === "protocols" || view === "gantt" || view === "kanban" ? view : "list";
  const initialOpenTaskId = searchParams.get("openTaskId");
  const [mode, setMode] = useState<"list" | "protocols" | "gantt" | "kanban">(initialMode);
  return (
    <>
      <div className="card">
        <div className="row">
          <button className={mode === "list" ? "" : "secondary"} onClick={() => setMode("list")}>
            Aufgabenliste
          </button>
          <button className={mode === "protocols" ? "" : "secondary"} onClick={() => setMode("protocols")}>
            Protokolle
          </button>
          <button className={mode === "gantt" ? "" : "secondary"} onClick={() => setMode("gantt")}>
            Projektplan
          </button>
          <button className={mode === "kanban" ? "" : "secondary"} onClick={() => setMode("kanban")}>
            Kanban
          </button>
        </div>
      </div>
      {mode === "list" ? (
        <ProjectTasks
          projectId={projectId}
          initialTasks={initialTasks}
          projectMembers={projectMembers}
          initialProtocolLinksByTaskId={initialProtocolLinksByTaskId}
        />
      ) : mode === "protocols" ? (
        <ProjectProtocols
          projectId={projectId}
          projectMembers={projectMembers}
          initialTasks={initialTasks}
          initialProtocolLinksByTaskId={initialProtocolLinksByTaskId}
        />
      ) : mode === "gantt" ? (
        <ProjectGantt
          projectId={projectId}
          initialTasks={initialTasks}
          initialOpenTaskId={initialOpenTaskId}
          initialProtocolLinksByTaskId={initialProtocolLinksByTaskId}
        />
      ) : (
        <ProjectKanban projectId={projectId} initialTasks={initialTasks} />
      )}
    </>
  );
}
