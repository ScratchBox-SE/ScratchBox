import { db } from "../utils/drizzle";
import * as schema from "../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { and, desc, eq, not, or } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "SB_TOKEN");

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, useRuntimeConfig().jwtSecret);
  } catch (e) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  if (typeof decoded === "string") {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  await assertCanModerate(decoded.username);

  const { status } = getQuery<{ status?: string }>(event);
  const validStatuses = ["open", "resolved", "dismissed"];

  const conditions = [
    not(
      or(
        and(
          eq(schema.reports.type, "project"),
          eq(schema.projects.user, decoded.username),
        ),
        and(
          eq(schema.reports.type, "comment"),
          eq(schema.projectComments.user, decoded.username),
        ),
      )!,
    ),
  ];

  if (status && validStatuses.includes(status)) {
    conditions.push(eq(schema.reports.status, status));
  }

  return await db.select({
    id: schema.reports.id,
    type: schema.reports.type,
    projectId: schema.reports.projectId,
    projectName: schema.projects.name,
    projectOwner: schema.projects.user,
    commentId: schema.reports.commentId,
    commentContent: schema.projectComments.content,
    commentDeleted: schema.projectComments.deleted,
    commentAuthor: schema.projectComments.user,
    reporter: schema.reports.reporter,
    reason: schema.reports.reason,
    status: schema.reports.status,
    createdAt: schema.reports.createdAt,
    resolvedAt: schema.reports.resolvedAt,
    resolvedBy: schema.reports.resolvedBy,
  }).from(schema.reports).leftJoin(
    schema.projects,
    eq(schema.reports.projectId, schema.projects.id),
  ).leftJoin(
    schema.projectComments,
    eq(schema.reports.commentId, schema.projectComments.id),
  ).where(and(...conditions)).orderBy(desc(schema.reports.createdAt));
});
