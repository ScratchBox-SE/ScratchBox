import { db } from "../../../../utils/drizzle";
import * as schema from "../../../../database/schema";
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
  const { id, reason } = await readBody<{ id: number; reason: string }>(
    event,
  );

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "No comment ID provided",
    });
  }
  if (!reason || !reason.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "A reason is required",
    });
  }

  const comment = (await db.select().from(schema.projectComments).where(
    eq(schema.projectComments.id, id),
  ))[0];

  if (!comment || comment.projectId !== projectId) {
    throw createError({
      statusCode: 404,
      statusMessage: "Comment not found",
    });
  }
  if (comment.deleted) {
    throw createError({
      statusCode: 409,
      statusMessage: "Can't report a deleted comment",
    });
  }
  if (comment.user === username) {
    throw createError({
      statusCode: 403,
      statusMessage: "Can't report your own comment",
    });
  }

  const result = await db.insert(schema.reports).values({
    type: "comment",
    projectId,
    commentId: comment.id,
    reporter: username,
    reason: reason.trim(),
  });

  return result.lastInsertRowid;
});
