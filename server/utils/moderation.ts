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

export const ELEVATED_ROLES = ["admin", "moderator"];

export const getActiveRoles = async (user: string): Promise<string[]> => {
  return (await db.select({ role: schema.userRoles.role })
    .from(schema.userRoles)
    .where(
      and(
        eq(schema.userRoles.user, user),
        or(
          isNull(schema.userRoles.expiresAt),
          gt(schema.userRoles.expiresAt, new Date()),
        ),
      ),
    )).map((r) => r.role);
};

export const assertCanModerate = async (user: string) => {
  const roles = await getActiveRoles(user);
  if (!roles.includes("admin") && !roles.includes("moderator")) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }
  return roles;
};

export const assertCanActOnTarget = async (
  actingRoles: string[],
  targetUser: string,
) => {
  if (actingRoles.includes("admin")) return;

  const targetRoles = await getActiveRoles(targetUser);
  if (targetRoles.some((r) => ELEVATED_ROLES.includes(r))) {
    throw createError({
      statusCode: 403,
      statusMessage: "Moderators can't act on admins or other moderators",
    });
  }
};

export const assertCanManageRole = async (
  actingRoles: string[],
  targetUser: string,
  role: string,
) => {
  if (actingRoles.includes("admin")) return;

  if (ELEVATED_ROLES.includes(role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Only admins can manage the admin/moderator roles",
    });
  }

  await assertCanActOnTarget(actingRoles, targetUser);
};
