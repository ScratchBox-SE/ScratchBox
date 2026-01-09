import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { eq, gt, and, or, isNull } from "drizzle-orm";

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

  const roles = (
    await db
      .select({role: schema.userRoles.role})
      .from(schema.userRoles)
      .where(and(eq(schema.userRoles.user, user), or(
        isNull(schema.userRoles.expiresAt),
        gt(schema.userRoles.expiresAt, new Date())
      )))
  ).map(r => r.role);

  return roles;
});
