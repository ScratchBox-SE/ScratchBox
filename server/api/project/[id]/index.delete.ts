import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import { and, eq, not } from "drizzle-orm";

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

  const projectId = getRouterParam(event, "id") as string;
  const project = (await db.select().from(schema.projects).where(
    eq(schema.projects.id, projectId),
  ))[0]!;

  if (project.user != (decoded as { username: string }).username) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  await db.update(schema.unistoreData).set({
    revision: (await db.select().from(schema.unistoreData))[0]!.revision + 1,
  });

  await deleteFile(projectId + ".sb3", "/projects");
  await db.delete(schema.projectLikes).where(
    eq(schema.projectLikes.projectId, projectId),
  );
  await db.delete(schema.projectTags).where(
    eq(schema.projectTags.projectId, projectId),
  );

  await db.delete(schema.projects).where(eq(schema.projects.id, projectId));

  await regenTex3DS();
});
