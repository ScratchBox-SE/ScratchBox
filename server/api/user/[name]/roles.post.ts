import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { eq } from "drizzle-orm";

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

  let body: {
    role: string;
    expiresAt?: number | null;
    description?: string | null;
  };
  try {
    body = JSON.parse((await readRawBody(event)) as string);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid body structure"
    });
  }
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "No request body provided",
    });
  }
  const { role, expiresAt, description } = body;

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Expiry date cannot be in the past",
    });
  }

  const result = await db.insert(schema.userRoles).values({
    user,
    role,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    description
  });
  
  return result.lastInsertRowid;
});