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
  if (!file.name.endsWith(".sb3")) {
    throw createError({ statusCode: 415, statusMessage: "Invalid file type" });
  }
  // TODO: implement more in depth checking of format (e.g. check that it's a zip, it has a `project.json`, and that the `project.json` is actually valid)

  const projectId = (await storeFileLocally(file, 12, "/projects")).slice(
    0,
    -4,
  );

  await db.insert(schema.projects).values({
    id: projectId,
    name: file.name.slice(0, -4),
    description: "",
    createdAt: new Date(),
    lastUpdated: new Date(),
    private: true,
    user: (decoded as { username: string }).username,
  });

  return projectId;
});
