import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import { count, desc, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, "id") as string;

  const project = (await db.select().from(schema.projects).where(
    eq(schema.projects.id, projectId),
  ).limit(1))[0];

  if (project === undefined) {
    throw createError({
      statusCode: 404,
      statusMessage: "Project not found",
    });
  }

  // select all comments from newest to oldest
  const allComments = await db.select().from(schema.projectComments).where(
    eq(schema.projectComments.projectId, projectId),
  ).orderBy(desc(schema.projectComments.createdAt));

  const commentsById = new Map<number, typeof allComments[0]>();
  allComments.forEach((comment) => {
    commentsById.set(comment.id, comment);
  });

  const seenOriginalIds = new Set<number>();
  const processedComments: Array<typeof allComments[0] & { edited: boolean }> =
    [];

  for (const comment of allComments) {
    // only push unique originalIds (so you only see the newest edit)
    if (!seenOriginalIds.has(comment.originalId)) {
      seenOriginalIds.add(comment.originalId);
      const originalComment = commentsById.get(comment.originalId);
      const createdAt = originalComment?.createdAt ?? comment.createdAt;
      processedComments.push({
        ...comment,
        edited: comment.originalId !== comment.id,
        createdAt,
      });
    }
  }

  setHeader(event, "Access-Control-Allow-Origin", "*");

  return {
    ...project,
    likes: (await db.select({ count: count() }).from(schema.projectLikes).where(
      eq(schema.projectLikes.projectId, projectId),
    ))[0].count,
    platforms: (await db.select().from(schema.projectPlatforms).where(
      eq(schema.projectPlatforms.projectId, projectId),
    )).map((projectPlatform) => projectPlatform.platform),
    comments: processedComments,
  };
});
