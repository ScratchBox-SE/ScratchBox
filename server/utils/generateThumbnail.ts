import fs from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "./drizzle";
import * as schema from "../database/schema";
import { generateSb3Thumbnail } from "./sb3Thumbnail";
import { regenTex3DS } from "./tex3ds";

const markerName = (projectId: string) => `${projectId}.auto`;

export const hasThumbnail = (projectId: string) =>
  fs.existsSync(getFileLocally(`${projectId}.png`, "/thumbnails"));

export const hasCustomThumbnail = (projectId: string) =>
  hasThumbnail(projectId) &&
  !fs.existsSync(getFileLocally(markerName(projectId), "/thumbnails"));

export const markThumbnailCustom = async (projectId: string) => {
  await deleteFile(markerName(projectId), "/thumbnails").catch(() => {});
};

export const generateProjectThumbnail = async (
  projectId: string,
  fileType: string,
): Promise<boolean> => {
  if (fileType !== "sb3" || hasCustomThumbnail(projectId)) return false;

  try {
    const png = await generateSb3Thumbnail(
      fs.readFileSync(getFileLocally(`${projectId}.sb3`, "/projects")),
    );
    await storeBufferLocally(png, `${projectId}.png`, "/thumbnails");
    await storeBufferLocally(
      Buffer.alloc(0),
      markerName(projectId),
      "/thumbnails",
    );
    return true;
  } catch (e) {
    console.error(`Failed to generate thumbnail for ${projectId}:`, e);
    return false;
  }
};

export const syncUnistore = async () => {
  await db.update(schema.unistoreData).set({
    revision: sql`${schema.unistoreData.revision} + 1`,
  });
  await regenTex3DS();
};
