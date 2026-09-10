import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../utils/drizzle";
import * as schema from "../../database/schema";
import { AUTH_TOKEN_VALIDITY_MS, findVerifyingComment } from "../../utils/scratchAuth";

export default defineEventHandler(async (event) => {
  const privateCode = getQuery(event).privateCode as string;

  if (!privateCode) {
    throw createError({ statusCode: 400, statusMessage: "Missing privateCode" });
  }

  const pending = (await db.select().from(schema.authTokens).where(
    eq(schema.authTokens.privateCode, privateCode),
  ))[0];

  if (!pending) {
    return { valid: false, expired: true };
  }

  if (Date.now() - pending.createdAt.getTime() > AUTH_TOKEN_VALIDITY_MS) {
    await db.delete(schema.authTokens).where(
      eq(schema.authTokens.privateCode, privateCode),
    );
    return { valid: false, expired: true };
  }

  const username = await findVerifyingComment(pending.publicCode);

  if (!username) {
    return { valid: false, expired: false };
  }

  await db.delete(schema.authTokens).where(
    eq(schema.authTokens.privateCode, privateCode),
  );

  setCookie(
    event,
    "SB_TOKEN",
    jwt.sign({ username }, useRuntimeConfig().jwtSecret, { expiresIn: "14d" }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1209600, // 14 days
      domain: process.env.NODE_ENV === "production"
        ? getRequestURL(event).hostname
        : undefined,
    },
  );

  return { valid: true, username };
});
