import { db } from "../utils/drizzle";
import * as schema from "../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import fs from "fs/promises";

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

  const { name } = await readBody<{ name: string }>(event);

  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let projectId = "";
  for (let i = 0; i < 12; i++) {
    projectId += characters.charAt(
      Math.floor(Math.random() * characters.length),
    );
  }

  await fs.copyFile(
    getFileLocally("default-project.sb3", "/"),
    getFileLocally(`${projectId}.sb3`, "/projects"),
  );

  await db.insert(schema.projects).values({
    id: projectId,
    name,
    description: "",
    createdAt: new Date(),
    lastUpdated: new Date(),
    private: true,
    user: (decoded as { username: string }).username,
  });

  return projectId;
});
