import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const user = getRouterParam(event, "name") as string;
  const token = getCookie(event, "SB_TOKEN");
  let decoded: string | JwtPayload | undefined;
  
  if (!token) return [];
  try {
    decoded = jwt.verify(token, useRuntimeConfig().jwtSecret);
  } catch {
    return [];
  }

  const tokenUser = typeof decoded !== "string" ? decoded.username : null;
  const tokenRoles = typeof decoded !== "string" ? (
    await db
      .select({role: schema.userRoles.role})
      .from(schema.userRoles)
      .where(eq(schema.userRoles.user, tokenUser))
  ).map(r => r.role) : [];

  const roles = (
    await db
      .select({role: schema.userRoles.role})
      .from(schema.userRoles)
      .where(eq(schema.userRoles.user, user))
  ).map(r => r.role);

  // prevent non-admin users from accessing other people's data
  if (!tokenRoles.includes("admin") && user !== tokenUser) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden"
    });
  }

  return roles;
});
