import { db } from "../../../../../utils/drizzle";
import * as schema from "../../../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { and, asc, eq } from "drizzle-orm";

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

  const projectId = getRouterParam(event, "id") as string;
  const originalId = Number(getRouterParam(event, "originalId"));

  if (!originalId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid comment id",
    });
  }

  return await db.select().from(schema.projectComments).where(
    and(
      eq(schema.projectComments.projectId, projectId),
      eq(schema.projectComments.originalId, originalId),
    ),
  ).orderBy(asc(schema.projectComments.createdAt));
});
