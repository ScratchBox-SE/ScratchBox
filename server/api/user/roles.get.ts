import { db } from "../../utils/drizzle";
import * as schema from "../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { eq, gt, isNull, or } from "drizzle-orm";

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

  const tokenUser = typeof decoded !== "string" ? decoded.username : null;
  const tokenRoles = typeof decoded !== "string"
    ? (
      await db
        .select({ role: schema.userRoles.role })
        .from(schema.userRoles)
        .where(eq(schema.userRoles.user, tokenUser))
    ).map((r) => r.role)
    : [];

  if (!tokenRoles.includes("admin")) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
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
      gt(schema.userRoles.expiresAt, new Date()),
    ));

  return roles;
});
