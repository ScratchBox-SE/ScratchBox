import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastUpdated: integer("last_updated", { mode: "timestamp" }).notNull(),
  private: integer("private", { mode: "boolean" }).notNull(),
  user: text("user").notNull(),
  fileType: text("file_type").default("sb3").notNull(),
});

export const projectLikes = sqliteTable("project_likes", {
  projectId: text("project_id").notNull().references(() => projects.id),
  user: text("user").notNull(),
}, (t) => [
  primaryKey({ columns: [t.projectId, t.user] }),
]);

export const projectTags = sqliteTable("project_tags", {
  projectId: text("project_id").notNull().references(() => projects.id),
  tag: text("tag").notNull(),
}, (t) => [
  primaryKey({ columns: [t.projectId, t.tag] }),
]);

export const projectComments = sqliteTable("project_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalId: integer("original_id").notNull(),
  projectId: text("project_id").notNull().references(() => projects.id),
  user: text("user").notNull(),
  content: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ).notNull(),
  deleted: integer("deleted", { mode: "boolean" }).default(false).notNull(),
});

export const unistoreData = sqliteTable("unistore_data", {
  revision: integer("revision").notNull(),
});

export const authTokens = sqliteTable("auth_tokens", {
  privateCode: text("private_code").notNull().primaryKey(),
  publicCode: text("public_code").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ).notNull(),
});

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // "project" | "comment"
  projectId: text("project_id").notNull().references(() => projects.id),
  commentId: integer("comment_id").references(() => projectComments.id),
  reporter: text("reporter").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("open").notNull(), // "open" | "resolved" | "dismissed"
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ).notNull(),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  resolvedBy: text("resolved_by"),
});

export const userRoles = sqliteTable("user_roles", {
  user: text("user").notNull(),
  role: text("role").notNull(),
  addedAt: integer("added_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ).notNull(),

  // optional fields for bans, but no reason they couldn't be used for other roles
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  description: text("description"),
}, (t) => [
  primaryKey({ columns: [t.user, t.role] }),
]);
