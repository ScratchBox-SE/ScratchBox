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

  const content = await readRawBody(event) as string;
  if (!content) {
    throw createError({
      statusCode: 400,
      statusMessage: "No comment body provided",
    });
  }
  else if (content.length > 500) {
    throw createError({
      statusCode: 413,
      statusMessage: "Comment body must be 500 characters or less",
    });
  }

  const comment = await db.insert(schema.projectComments).values({
    projectId: getRouterParam(event, "id") as string,
    originalId: 0, // we're going to update this in a sec
    user: (decoded as { username: string }).username,
    content,
    createdAt: new Date(),
  });

  await db.update(schema.projectComments)
    .set({ originalId: Number(comment.lastInsertRowid) })
    .where(eq(schema.projectComments.id, Number(comment.lastInsertRowid)));

  return comment.lastInsertRowid;
});
