import jwt, { JwtPayload } from "jsonwebtoken";
import {
  buildToolkit,
  resolveLatestReleaseTag,
} from "../../../packager/packageToolkit";
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

  const ref = await resolveLatestReleaseTag();

  for (const platform of PACKAGER_PLATFORMS) {
    buildToolkit(platform.id, ref).catch((e) => {
      console.error(`[toolkit:${platform.id}] update failed`, e);
    });
  }

  return { started: PACKAGER_PLATFORMS.map((p) => p.id), ref };
});
