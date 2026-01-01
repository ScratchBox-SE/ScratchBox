import { db } from "../../../utils/drizzle";
import * as schema from "../../../database/schema";
import jwt, { JwtPayload } from "jsonwebtoken";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const user = getRouterParam(event, "name") as string;

  const token = getCookie(event, "SB_TOKEN");

  let decoded: string | JwtPayload | undefined;
  const blankResponse = {roles:[]};
  
  if (!token) return blankResponse;
  try {
    decoded = jwt.verify(token, useRuntimeConfig().jwtSecret);
  } catch {
    return blankResponse;
  }

  console.log(await db.select({ roles: schema.userRoles.roles }).from(schema.userRoles).where(eq(schema.userRoles.user, user)));

  return {
    roles: (await db.select({ roles: schema.userRoles.roles }).from(schema.userRoles).where(eq(schema.userRoles.user, user)).limit(1)).at(0)?.roles ?? [],
  };
});
