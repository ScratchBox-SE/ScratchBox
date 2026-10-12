import { inArray } from "drizzle-orm";
import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import { PACKAGER_PLATFORMS } from "../../../packager/platforms";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "SB_TOKEN");
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, useRuntimeConfig().jwtSecret);
  } catch {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  if (typeof decoded === "string") {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  await assertIsAdmin(decoded.username);

  const platformIds = PACKAGER_PLATFORMS.map((p) => p.id);
  const rows = await db.select().from(schema.packageToolkits).where(
    inArray(schema.packageToolkits.platform, platformIds),
  );
  const rowsByPlatform = new Map(rows.map((r) => [r.platform, r]));

  return PACKAGER_PLATFORMS.map((platform) => {
    const row = rowsByPlatform.get(platform.id);
    return {
      platform: platform.id,
      displayName: platform.displayName,
      status: row?.status ?? "missing",
      seRef: row?.seRef ?? null,
      seCommit: row?.seCommit ?? null,
      error: row?.error ?? null,
      builtAt: row?.builtAt ?? null,
    };
  });
});
