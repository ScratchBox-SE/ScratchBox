import jwt, { JwtPayload } from "jsonwebtoken";
import { stopAllToolkitBuilds } from "../../../packager/packageToolkit";

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

  const stopped = stopAllToolkitBuilds();
  return { stopped };
});
