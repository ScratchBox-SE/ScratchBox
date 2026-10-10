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

  await assertNotBanned((decoded as { username: string }).username);

  const projectId = getRouterParam(event, "id") as string;

  if (
    (await db.select().from(schema.projects).where(
      eq(schema.projects.id, projectId),
    ))[0].user == (decoded as { username: string }).username
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: "Can't like your own post",
    });
  }

  try {
    await db.insert(schema.projectLikes).values({
      projectId,
      user: (decoded as { username: string }).username,
    });

    setResponseStatus(event, 201);
    return;
  } catch (error) {
    if (
      (error as Error).message.includes("SQLITE_CONSTRAINT_PRIMARYKEY") ||
      (error as Error).message.includes("UNIQUE constraint failed")
    ) {
      throw createError({
        statusCode: 409,
        statusMessage: "Project already liked",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
