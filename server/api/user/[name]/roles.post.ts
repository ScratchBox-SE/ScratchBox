import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";

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

  let body: {
    role: string;
    expiresAt?: number | null;
    description?: string | null;
  };
  try {
    body = JSON.parse((await readRawBody(event)) as string);
  } catch {
    throw createError({
      statusCode: 500,
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
  const result = await db.insert(schema.userRoles).values({
    user,
    role,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    description
  });
  
  return result.lastInsertRowid;
});