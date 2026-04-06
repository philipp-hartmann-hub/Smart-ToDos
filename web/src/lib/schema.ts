import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.projectId] }),
  }),
);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  title: text("title").notNull(),
  priority: text("priority").notNull().default("medium"),
  done: boolean("done").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  description: text("description"),
  kanbanColumnId: text("kanban_column_id").notNull().default("kanban-backlog"),
  swimlaneId: text("swimlane_id").notNull().default("kanban-lane-default"),
  dependsOnTaskIds: jsonb("depends_on_task_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  assigneeIds: jsonb("assignee_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  attachments: jsonb("attachments").$type<Array<{ id: string; name: string; size: number; type: string; dataUrl: string }>>().notNull().default(sql`'[]'::jsonb`),
  links: jsonb("links").$type<Array<{ id: string; url: string; label: string }>>().notNull().default(sql`'[]'::jsonb`),
  history: jsonb("history").$type<Array<{ id: string; entryDate: string; participantId: string | null; text: string; createdAt: string }>>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const kanbanColumns = pgTable(
  "kanban_columns",
  {
    /** IDs bleiben textuell kompatibel mit Task-Feld `kanbanColumnId` (z. B. `kanban-backlog`). */
    id: text("id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("kanban_columns_project_id_idx").on(t.projectId),
  }),
);

export const kanbanSwimlanes = pgTable(
  "kanban_swimlanes",
  {
    /** IDs bleiben textuell kompatibel mit Task-Feld `swimlaneId` (z. B. `kanban-lane-default`). */
    id: text("id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("kanban_swimlanes_project_id_idx").on(t.projectId),
  }),
);

export const protocolGroups = pgTable(
  "protocol_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("protocol_groups_project_id_idx").on(t.projectId),
  }),
);

export const protocolSessions = pgTable(
  "protocol_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => protocolGroups.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD */
    date: text("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    groupIdx: index("protocol_sessions_group_id_idx").on(t.groupId),
  }),
);

export const protocolRows = pgTable(
  "protocol_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => protocolSessions.id, { onDelete: "cascade" }),
    /** Verantwortlicher (User-ID) */
    responsibleUserId: uuid("responsible_user_id").references(() => users.id, { onDelete: "set null" }),
    text: text("text").notNull().default(""),
    result: text("result").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sessionIdx: index("protocol_rows_session_id_idx").on(t.sessionId),
    responsibleIdx: index("protocol_rows_responsible_user_id_idx").on(t.responsibleUserId),
  }),
);

export const protocolRowTasks = pgTable(
  "protocol_row_tasks",
  {
    rowId: uuid("row_id")
      .notNull()
      .references(() => protocolRows.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.rowId, t.taskId] }),
    taskIdx: index("protocol_row_tasks_task_id_idx").on(t.taskId),
  }),
);

export type UserRole = "admin" | "user";
