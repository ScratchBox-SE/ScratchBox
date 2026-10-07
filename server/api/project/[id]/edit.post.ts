import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { and, eq } from "drizzle-orm";
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
  ))[0]!;

  const username = (decoded as { username: string }).username;
  const isOwner = project.user === username;

  let isModEdit = false;
  if (!isOwner) {
    const roles = await getActiveRoles(username);
    const isModerator = roles.includes("admin") || roles.includes("moderator");
    if (!isModerator) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }
    await assertCanActOnTarget(roles, project.user);
    isModEdit = true;
  }

  await assertNotBanned(username);

  const body = await readBody<
    {
      file?: ServerFile;
      thumbnail?: ServerFile;
      name: string;
      description: string;
      tags: ("dual-screen" | "heavy" | "light" | "balanced" | "cursor")[];
      private: boolean;
      reason?: string;
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

  if (isModEdit) {
    if (body.file || body.thumbnail) {
      throw createError({
        statusCode: 403,
        statusMessage: "Moderators can't replace a project's file or thumbnail",
      });
    }
    if (!body.reason || !body.reason.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "A reason is required when editing another user's project",
      });
    }

    await db.update(schema.projects).set({
      description: body.description,
      name: body.name,
      lastUpdated: new Date(),
    }).where(
      eq(schema.projects.id, projectId),
    );
  } else {
    await db.update(schema.projects).set({
      description: body.description,
      name: body.name,
      private: body.private,
      lastUpdated: new Date(),
    }).where(
      eq(schema.projects.id, projectId),
    );
  }

  await db.insert(schema.projectEditLog).values({
    projectId,
    editedBy: username,
    reason: body.reason?.trim() || null,
  });

  if (body.tags) {
    const allTags = [
      "dual-screen",
      "balanced",
      "heavy",
      "light",
      "cursor",
    ] as const;

    const currentTags = (await db.select({
      tag: schema.projectTags.tag,
    }).from(
      schema.projectTags,
    ).where(
      and(
        eq(schema.projectTags.projectId, projectId),
      ),
    )).map((item) => item.tag);

    for (const tag of allTags) {
      if (body.tags.includes(tag) === currentTags.includes(tag)) continue;

      if (
        body.tags.includes(tag) && !currentTags.includes(tag)
      ) {
        await db.insert(schema.projectTags).values({ projectId, tag });
        continue;
      }

      await db.delete(schema.projectTags).where(
        and(
          eq(schema.projectTags.projectId, projectId),
          eq(schema.projectTags.tag, tag),
        ),
      );
    }
  }

  if (body.file) {
    const extension = getProjectExtension(body.file.name);
    if (!extension) {
      throw createError({
        statusCode: 415,
        statusMessage: "Invalid file type",
      });
    }

    validateProjectFile(
      parseDataUrl(body.file.content).binaryString,
      extension,
    );

    if (extension !== project.fileType) {
      await deleteFile(`${projectId}.${project.fileType}`, "/projects").catch(
        () => {},
      );
      await db.update(schema.projects).set({ fileType: extension }).where(
        eq(schema.projects.id, projectId),
      );
    }

    await storeFileLocally(body.file, projectId, "/projects");
  }

  await db.update(schema.unistoreData).set({
    revision: (await db.select().from(schema.unistoreData))[0]!.revision + 1,
  });

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
