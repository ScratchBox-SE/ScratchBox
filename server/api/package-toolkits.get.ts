import { inArray } from "drizzle-orm";
import { db } from "../utils/drizzle";
import * as schema from "../database/schema";
import { PACKAGER_PLATFORMS } from "../packager/platforms";

export default defineEventHandler(async () => {
  const platformIds = PACKAGER_PLATFORMS.map((p) => p.id);
  const rows = await db.select({
    platform: schema.packageToolkits.platform,
    status: schema.packageToolkits.status,
  }).from(schema.packageToolkits).where(
    inArray(schema.packageToolkits.platform, platformIds),
  );
  const statusByPlatform = new Map(rows.map((r) => [r.platform, r.status]));

  return PACKAGER_PLATFORMS.map((platform) => ({
    platform: platform.id,
    status: statusByPlatform.get(platform.id) ?? "missing",
  }));
});
