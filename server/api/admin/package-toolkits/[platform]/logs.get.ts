import { eq } from "drizzle-orm";
import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "../../../../utils/drizzle";
import * as schema from "../../../../database/schema";
import { readToolkitLog } from "../../../../packager/packageToolkit";
import { getPlatform } from "../../../../packager/platforms";

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

  const platformId = getRouterParam(event, "platform") as string;
  if (!getPlatform(platformId)) {
    throw createError({ statusCode: 404, statusMessage: "Unknown platform" });
  }

  const row = (await db.select({ status: schema.packageToolkits.status })
    .from(schema.packageToolkits)
    .where(eq(schema.packageToolkits.platform, platformId)))[0];

  return { log: readToolkitLog(platformId), status: row?.status ?? "missing" };
});
