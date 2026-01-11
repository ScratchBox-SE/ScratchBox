import { db } from "../../utils/drizzle";
import * as schema from "../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { gt, or, isNull } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "SB_TOKEN");
  let decoded: string | JwtPayload | undefined;
  
  if (!token) return [];
  try {
    decoded = jwt.verify(token, useRuntimeConfig().jwtSecret);
  } catch {
    return [];
  }

  const roles = await db
    .select({
      user: schema.userRoles.user,
      role: schema.userRoles.role,
      expiresAt: schema.userRoles.expiresAt,
      description: schema.userRoles.description,
    })
    .from(schema.userRoles)
    .where(or(
      isNull(schema.userRoles.expiresAt),
      gt(schema.userRoles.expiresAt, new Date())
    ));

  return roles;
});
