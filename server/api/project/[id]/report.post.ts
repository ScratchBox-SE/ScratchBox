import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
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

  const username = (decoded as { username: string }).username;
  await assertNotBanned(username);

  const projectId = getRouterParam(event, "id") as string;
  const project = (await db.select().from(schema.projects).where(
    eq(schema.projects.id, projectId),
  ))[0];

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project not found",
    });
  }

  if (project.user === username) {
    throw createError({
      statusCode: 403,
      statusMessage: "Can't report your own project",
    });
  }

  const { reason } = await readBody<{ reason: string }>(event);
  if (!reason || !reason.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "A reason is required",
    });
  }

  const result = await db.insert(schema.reports).values({
    type: "project",
    projectId,
    reporter: username,
    reason: reason.trim(),
  });

  return result.lastInsertRowid;
});
