import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { eq, and, or, isNull, gt } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const user = getRouterParam(event, "name") as string;
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
  const tokenRoles = typeof decoded !== "string" ? (
    await db
      .select({role: schema.userRoles.role})
      .from(schema.userRoles)
      .where(eq(schema.userRoles.user, tokenUser))
  ).map(r => r.role) : [];

  if (!tokenRoles.includes("admin")) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }

  const role: string = (JSON.parse(await readRawBody(event) as string)).role;
  if (!role) {
    throw createError({
      statusCode: 400,
      statusMessage: "No role provided",
    });
  }

  // set expiresAt to now
  // means role is no longer active but we still have ban history
  const result = await db
    .update(schema.userRoles).set({ expiresAt: new Date() })
    .where(
      and(
        eq(schema.userRoles.user, user),
        eq(schema.userRoles.role, role),
        or(
          isNull(schema.userRoles.expiresAt),
          gt(schema.userRoles.expiresAt, new Date())
        ),
      )
    );

  return result.changes > 0;
});