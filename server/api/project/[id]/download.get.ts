import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import { eq } from "drizzle-orm";
import { createReadStream } from "fs";

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, "id") as string;

  try {
    const filePath = getFileLocally(
      projectId + ".sb3",
      "/projects",
    );

    if (!filePath) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found.",
      });
    }

    setHeader(
      event,
      "Content-Disposition",
      `attachment; filename="${
        (await db.select().from(schema.projects).where(
          eq(schema.projects.id, projectId),
        ))[0]?.name
      }.sb3"`,
    );

    setHeader(event, "Access-Control-Allow-Origin", "*");

    return sendStream(event, createReadStream(filePath));
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
