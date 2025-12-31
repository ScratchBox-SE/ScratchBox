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

  const body = await readRawBody(event);
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "No request body provided",
    });
  }

  const { id, content } = JSON.parse(body as string) as {id: number; content: string};

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "No comment ID provided",
    });
  }
  else if (!content) {
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

  const commentAuthor = db.select({
    user: schema.projectComments.user
  }).from(schema.projectComments).where(eq(schema.projectComments.id, id)).get();

  if (typeof decoded !== "string" && decoded.username !== commentAuthor?.user) {
    throw createError({
      statusCode: 403,
      statusMessage: "Comment author does not match requesting user"
    });
  }

  // create new comment and mark the old one
  // as edited by setting its `editId` to the new comment's ID
  const result = db.transaction((tx) => {
    const newComment = tx.insert(schema.projectComments).values({
      projectId: getRouterParam(event, "id") as string,
      user: (decoded as { username: string }).username,
      content,
      createdAt: new Date(),
    }).returning().get();

    const newCommentId = newComment.id;

    const updateResult = tx.update(schema.projectComments).set({
      editId: newCommentId,
    }).where(eq(schema.projectComments.id, id)).run();

    if (updateResult.changes === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: `Comment ID ${id.toString()} not found`,
      });
    }

    return newCommentId;
  });

  return result;
});
