import { db } from "../../utils/drizzle";
import * as schema from "../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { gt, isNull, or } from "drizzle-orm";

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

  if (typeof decoded === "string") {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  await assertCanModerate(decoded.username);

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
