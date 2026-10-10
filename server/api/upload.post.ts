import { ServerFile } from "nuxt-file-storage";
import { db } from "../utils/drizzle";
import * as schema from "../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";

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

  const file = await readBody<ServerFile>(event);
  const extension = getProjectExtension(file.name);
  if (!extension) {
    throw createError({ statusCode: 415, statusMessage: "Invalid file type" });
  }

  validateProjectFile(parseDataUrl(file.content).binaryString, extension);

  const storedFilename = await storeFileLocally(file, 12, "/projects");
  const projectId = storedFilename.slice(0, -(extension.length + 1));

  await db.insert(schema.projects).values({
    id: projectId,
    name: file.name.slice(0, -(extension.length + 1)),
    description: "",
    createdAt: new Date(),
    lastUpdated: new Date(),
    private: true,
    user: (decoded as { username: string }).username,
    fileType: extension,
  });

  return projectId;
});
