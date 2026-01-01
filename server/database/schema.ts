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
});

export const projectLikes = sqliteTable("project_likes", {
  projectId: text("project_id").notNull().references(() => projects.id),
  user: text("user").notNull(),
}, (t) => [
  primaryKey({ columns: [t.projectId, t.user] }),
]);

export const projectPlatforms = sqliteTable("project_platforms", {
  projectId: text("project_id").notNull().references(() => projects.id),
  platform: text("platform").notNull(),
}, (t) => [
  primaryKey({ columns: [t.projectId, t.platform] }),
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
});

export const unistoreData = sqliteTable("unistore_data", {
  revision: integer("revision").notNull(),
});

export const userRoles = sqliteTable("user_roles", {
  user: text("user").primaryKey(),
  roles: text("roles", { mode: "json" }).notNull(), // array stored as JSON, allows multiple roles per user
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ).notNull(),
  lastUpdated: integer("last_updated", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ).notNull(),
});