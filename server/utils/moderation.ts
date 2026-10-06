import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "./drizzle";
import * as schema from "../database/schema";

export interface ActiveBan {
  description: string | null;
  expiresAt: Date | null;
}

export const getActiveBan = async (
  user: string,
): Promise<ActiveBan | undefined> => {
  return (await db.select({
    description: schema.userRoles.description,
    expiresAt: schema.userRoles.expiresAt,
  }).from(schema.userRoles).where(
    and(
      eq(schema.userRoles.user, user),
      eq(schema.userRoles.role, "banned"),
      or(
        isNull(schema.userRoles.expiresAt),
        gt(schema.userRoles.expiresAt, new Date()),
      ),
    ),
  ))[0];
};

export const assertNotBanned = async (user: string) => {
  const ban = await getActiveBan(user);
  if (ban) {
    throw createError({
      statusCode: 403,
      statusMessage: "Banned",
      data: { reason: ban.description, expiresAt: ban.expiresAt },
    });
  }
};
