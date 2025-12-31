import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import { count, eq, and, isNull, inArray } from "drizzle-orm";

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

  setHeader(event, "Access-Control-Allow-Origin", "*");

  return {
    ...project,
    likes: (await db.select({ count: count() }).from(schema.projectLikes).where(
      eq(schema.projectLikes.projectId, projectId),
    ))[0].count,
    platforms: (await db.select().from(schema.projectPlatforms).where(
      eq(schema.projectPlatforms.projectId, projectId),
    )).map((projectPlatform) => projectPlatform.platform),

    comments: await (async () => {
      const uneditedComments = await db.select({
        id: schema.projectComments.id,
        user: schema.projectComments.user,
        createdAt: schema.projectComments.createdAt,
        content: schema.projectComments.content,
      }).from(schema.projectComments).where(
        and(
          eq(schema.projectComments.projectId, projectId),

          // don't return comment bodys that have been edited,
          // the edited version (what we want to show) will *not* have an editId
          isNull(schema.projectComments.editId),
        ),
      );

      if (uneditedComments.length === 0) return [];

      const commentIds = uneditedComments.map(c => c.id);
      const editedCommentIds = await db.select({
        editId: schema.projectComments.editId,
      })
        .from(schema.projectComments)
        .where(
          and(
            eq(schema.projectComments.projectId, projectId),
            inArray(schema.projectComments.editId, commentIds),
          )
        );

      const editedIdsSet = new Set(editedCommentIds.map(c => c.editId).filter((id): id is number => id !== null));

      return uneditedComments.map(comment => ({
        ...comment,
        edited: editedIdsSet.has(comment.id),
      }));
    })(),
  };
});
