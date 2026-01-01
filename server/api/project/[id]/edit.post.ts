import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { and, eq, not } from "drizzle-orm";
import { ServerFile } from "nuxt-file-storage";
import sharp from "sharp";

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
  ))[0];

  if (project.user != (decoded as { username: string }).username) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readBody<
    {
      file?: ServerFile;
      thumbnail?: ServerFile;
      name: string;
      description: string;
      platforms: (
        | "scratch"
        | "turbowarp"
        | "3ds"
        | "wiiu"
        | "switch"
        | "wii"
        | "gamecube"
        | "vita"
        | "wasm"
        | "ds"
        | "ps4"
      )[];
      private: boolean;
    }
  >(event);

  setHeaders(
    event,
    {
      "Access-Control-Allow-Origin": process.env.NODE_ENV === "production"
        ? "https://editor." + getRequestURL(event).hostname
        : "http://localhost:8601",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers": "Content-Type",
    },
  );

  await db.update(schema.projects).set({
    description: body.description,
    name: body.name,
    private: body.private,
    lastUpdated: new Date(),
  }).where(
    eq(schema.projects.id, projectId),
  );

  const allPlatforms = [
    "scratch",
    "turbowarp",
    "3ds",
    "wiiu",
    "switch",
    "wii",
    "gamecube",
    "vita",
    "ps4",
    "ds",
    "wasm",
  ] as (
    | "scratch"
    | "turbowarp"
    | "3ds"
    | "wiiu"
    | "switch"
    | "wii"
    | "gamecube"
    | "vita"
    | "ps4"
    | "ds"
    | "wasm"
  )[];

  const currentPlatforms = (await db.select({
    platform: schema.projectPlatforms.platform,
  }).from(
    schema.projectPlatforms,
  ).where(
    and(
      eq(schema.projectPlatforms.projectId, projectId),
    ),
  )).map((item) => item.platform);

  for (const platform of allPlatforms) {
    if (
      (body.platforms.includes(platform) &&
        currentPlatforms.includes(platform)) ||
      (!body.platforms.includes(platform) &&
        !currentPlatforms.includes(platform))
    ) continue;

    if (
      body.platforms.includes(platform) && !currentPlatforms.includes(platform)
    ) {
      await db.insert(schema.projectPlatforms).values({ projectId, platform });
      continue;
    }

    await db.delete(schema.projectPlatforms).where(
      and(
        eq(schema.projectPlatforms.projectId, projectId),
        eq(schema.projectPlatforms.platform, platform),
      ),
    );
  }

  if (body.file) {
    if (!body.file.name.endsWith(".sb3")) {
      throw createError({
        statusCode: 415,
        statusMessage: "Invalid file type",
      });
    }

    await storeFileLocally(body.file, projectId, "/projects");
  }

  if (
    (await db.select().from(schema.projects).innerJoin(
      schema.projectPlatforms,
      eq(schema.projects.id, schema.projectPlatforms.projectId),
    ).where(
      and(
        eq(schema.projects.id, project.id),
        eq(schema.projectPlatforms.platform, "3ds"),
        not(schema.projects.private),
      ),
    )).length > 0
  ) {
    await db.update(schema.unistoreData).set({
      revision: (await db.select().from(schema.unistoreData))[0].revision + 1,
    });
  }

  if (!body.thumbnail) return;

  const { binaryString: imageBuffer } = parseDataUrl(body.thumbnail.content);
  if (!imageBuffer) {
    throw createError({
      statusCode: 400,
      statusMessage: "Code not parse thumbnail.",
    });
  }

  const processedImageBuffer = await sharp(imageBuffer).resize({
    width: 408,
    height: 306,
  }).png().toBuffer();
  const processedDataUrl = `data:image/png;base64,${
    processedImageBuffer.toString("base64")
  }`;

  await storeFileLocally(
    {
      name: projectId + ".png",
      size: processedImageBuffer.length,
      type: "image/png",
      content: processedDataUrl,
    } as unknown as ServerFile, // There's an issue in the ServerFile type which is why this is needed
    projectId,
    "/thumbnails",
  );

  await regenTex3DS();
});
