import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { desc, eq } from "drizzle-orm";

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

  if (project.user !== decoded.username) {
    const roles = await getActiveRoles(decoded.username);
    if (!roles.includes("admin") && !roles.includes("moderator")) {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden",
      });
    }
  }

  return await db.select({
    editedBy: schema.projectEditLog.editedBy,
    reason: schema.projectEditLog.reason,
    createdAt: schema.projectEditLog.createdAt,
  }).from(schema.projectEditLog).where(
    eq(schema.projectEditLog.projectId, projectId),
  ).orderBy(desc(schema.projectEditLog.createdAt));
});
