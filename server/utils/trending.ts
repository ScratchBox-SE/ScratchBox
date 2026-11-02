import { and, eq, gte, ne, not } from "drizzle-orm";
import { db } from "./drizzle";
import * as schema from "../database/schema";

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 14;
const HALF_LIFE_DAYS = 3;
const LIKE_WEIGHT = 3;
const COMMENT_WEIGHT = 1;
const NEW_PROJECT_WEIGHT = 2;

const decay = (at: Date, now: number) =>
  Math.pow(0.5, (now - at.getTime()) / DAY / HALF_LIFE_DAYS);

export const getTrendingScores = async () => {
  const now = Date.now();
  const since = new Date(now - WINDOW_DAYS * DAY);
  const scores = new Map<string, number>();
  const add = (id: string, amount: number) =>
    scores.set(id, (scores.get(id) ?? 0) + amount);

  const likes = await db.select({
    projectId: schema.projectLikes.projectId,
    createdAt: schema.projectLikes.createdAt,
  }).from(schema.projectLikes)
    .where(gte(schema.projectLikes.createdAt, since));
  for (const like of likes) {
    if (like.createdAt) {
      add(like.projectId, LIKE_WEIGHT * decay(like.createdAt, now));
    }
  }

  const comments = await db.select({
    projectId: schema.projectComments.projectId,
    createdAt: schema.projectComments.createdAt,
  }).from(schema.projectComments)
    .innerJoin(
      schema.projects,
      eq(schema.projects.id, schema.projectComments.projectId),
    )
    .where(and(
      gte(schema.projectComments.createdAt, since),
      not(schema.projectComments.deleted),
      ne(schema.projectComments.user, schema.projects.user),
    ));
  for (const comment of comments) {
    add(comment.projectId, COMMENT_WEIGHT * decay(comment.createdAt, now));
  }

  const created = await db.select({
    id: schema.projects.id,
    createdAt: schema.projects.createdAt,
  }).from(schema.projects)
    .where(gte(schema.projects.createdAt, since));
  for (const project of created) {
    add(project.id, NEW_PROJECT_WEIGHT * decay(project.createdAt, now));
  }

  return scores;
};
