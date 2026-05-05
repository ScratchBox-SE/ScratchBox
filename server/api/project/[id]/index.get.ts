import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import { count, desc, eq } from "drizzle-orm";

interface UserData {
  id: number;
  username: string;
  scratchteam: boolean;
  history: {
    joined: string;
  };
  profile: {
    id: number;
    images: {
      "90x90": string;
      "60x60": string;
      "55x55": string;
      "50x50": string;
      "32x32": string;
    };
    status: string;
    bio: string;
    country: string;
  };
}

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
  const processedComments: Array<
    typeof allComments[0] & { edited: boolean; userPicture: string }
  > = [];

  for (const comment of allComments) {
    // only push unique originalIds (so you only see the newest edit)
    if (!seenOriginalIds.has(comment.originalId)) {
      seenOriginalIds.add(comment.originalId);
      const originalComment = commentsById.get(comment.originalId);
      const createdAt = originalComment?.createdAt ?? comment.createdAt;

      // Get user's profile picture
      const data = await $fetch<UserData>(
        `https://api.scratch.mit.edu/users/${comment.user}`,
      );

      processedComments.push({
        ...comment,
        edited: comment.originalId !== comment.id,
        createdAt,
        userPicture: data.profile.images["90x90"],
      });
    }
  }

  setHeader(event, "Access-Control-Allow-Origin", "*");

  const data = await $fetch<UserData>(
    `https://api.scratch.mit.edu/users/${project.user}`,
  );

  return {
    ...project,
    userPicture: data.profile.images["90x90"],
    likes: (await db.select({ count: count() }).from(schema.projectLikes).where(
      eq(schema.projectLikes.projectId, projectId),
    ))[0]?.count,
    tags: (await db.select().from(schema.projectTags).where(
      eq(schema.projectTags.projectId, projectId),
    )).map((projectPlatform) => projectPlatform.tag),
    comments: processedComments,
  };
});
