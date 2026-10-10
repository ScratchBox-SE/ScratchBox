import { db } from "../../utils/drizzle";
import * as schema from "../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { eq } from "drizzle-orm";

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

  const reportId = Number(getRouterParam(event, "id"));
  if (!reportId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid report ID",
    });
  }

  const { status } = await readBody<{ status: string }>(event);
  if (status !== "resolved" && status !== "dismissed") {
    throw createError({
      statusCode: 400,
      statusMessage: "Status must be 'resolved' or 'dismissed'",
    });
  }

  const report = (await db.select().from(schema.reports).where(
    eq(schema.reports.id, reportId),
  ))[0];

  if (!report) {
    throw createError({
      statusCode: 404,
      statusMessage: "Report not found",
    });
  }

  if (report.type === "project") {
    const project = (await db.select().from(schema.projects).where(
      eq(schema.projects.id, report.projectId),
    ))[0];
    if (project?.user === decoded.username) {
      throw createError({
        statusCode: 403,
        statusMessage: "Can't act on a report filed against yourself",
      });
    }
  } else if (report.commentId) {
    const comment = (await db.select().from(schema.projectComments).where(
      eq(schema.projectComments.id, report.commentId),
    ))[0];
    if (comment?.user === decoded.username) {
      throw createError({
        statusCode: 403,
        statusMessage: "Can't act on a report filed against yourself",
      });
    }
  }

  const result = await db.update(schema.reports).set({
    status,
    resolvedAt: new Date(),
    resolvedBy: decoded.username,
  }).where(eq(schema.reports.id, reportId));

  return result.changes > 0;
});
