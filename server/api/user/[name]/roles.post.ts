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

  if (typeof decoded === "string") {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const actingRoles = await assertCanModerate(decoded.username);

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
      statusMessage: "Invalid body structure",
    });
  }
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "No request body provided",
    });
  }
  const { role, expiresAt, description } = body;

  await assertCanManageRole(actingRoles, user, role);

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Expiry date cannot be in the past",
    });
  }

  const result = await db.insert(schema.userRoles)
    .values({
      user,
      role,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      description,
    })
    .onConflictDoUpdate({
      target: [schema.userRoles.user, schema.userRoles.role],
      set: {
        addedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        description,
      },
    });

  return true;
});
