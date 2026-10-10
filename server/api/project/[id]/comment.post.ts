import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { and, eq } from "drizzle-orm";

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

  const body = await readRawBody(event);
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "No request body provided",
    });
  }

  const { content, parentId } = JSON.parse(body as string) as {
    content: string;
    parentId?: number | null;
  };

  if (!content) {
    throw createError({
      statusCode: 400,
      statusMessage: "No comment body provided",
    });
  } else if (content.length > 500) {
    throw createError({
      statusCode: 413,
      statusMessage: "Comment body must be 500 characters or less",
    });
  }

  const projectId = getRouterParam(event, "id") as string;

  let validatedParentId: number | null = null;
  if (parentId) {
    const parentExists = db.select({
      originalId: schema.projectComments.originalId,
    })
      .from(schema.projectComments)
      .where(
        and(
          eq(schema.projectComments.projectId, projectId),
          eq(schema.projectComments.originalId, parentId),
        ),
      ).get();

    if (!parentExists) {
      throw createError({
        statusCode: 404,
        statusMessage: "Parent comment not found",
      });
    }
    validatedParentId = parentId;
  }

  const comment = await db.insert(schema.projectComments).values({
    projectId,
    originalId: 0, // we're going to update this in a sec
    parentId: validatedParentId,
    user: (decoded as { username: string }).username,
    content,
    createdAt: new Date(),
  });

  await db.update(schema.projectComments)
    .set({ originalId: Number(comment.lastInsertRowid) })
    .where(eq(schema.projectComments.id, Number(comment.lastInsertRowid)));

  return comment.lastInsertRowid;
});
