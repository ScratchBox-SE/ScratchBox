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

  const body = await readRawBody(event);
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "No request body provided",
    });
  }

  const { id } = JSON.parse(body as string) as { id: number };

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "No comment ID provided",
    });
  }

  const projectId = getRouterParam(event, "id") as string;

  const existingComment = db.select({
    user: schema.projectComments.user,
    projectId: schema.projectComments.projectId,
    originalId: schema.projectComments.originalId,
    deleted: schema.projectComments.deleted,
  }).from(schema.projectComments).where(eq(schema.projectComments.id, id))
    .get();

  if (!existingComment || existingComment.projectId !== projectId) {
    throw createError({
      statusCode: 404,
      statusMessage: "Comment not found",
    });
  }

  if (
    typeof decoded !== "string" &&
    decoded.username !== existingComment.user
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: "Comment author does not match requesting user",
    });
  }

  if (existingComment.deleted) {
    throw createError({
      statusCode: 409,
      statusMessage: "Comment is already deleted",
    });
  }

  const newComment = await db.insert(schema.projectComments).values({
    projectId,
    originalId: existingComment.originalId,
    user: (decoded as { username: string }).username,
    content: "",
    deleted: true,
    createdAt: new Date(),
  });

  return newComment.lastInsertRowid;
});
