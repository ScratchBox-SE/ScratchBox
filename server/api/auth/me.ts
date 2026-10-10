import jwt from "jsonwebtoken";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "SB_TOKEN");

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  setHeaders(
    event,
    {
      "Access-Control-Allow-Origin": process.env.NODE_ENV === "production"
        ? "https://editor." + getRequestURL(event).hostname
        : "http://localhost:8601",
      "Access-Control-Allow-Credentials": true,
    },
  );

  try {
    const decoded = jwt.verify(token, useRuntimeConfig().jwtSecret);
    const ban = await getActiveBan((decoded as { username: string }).username);

    return {
      user: decoded,
      ban: ban ? { reason: ban.description, expiresAt: ban.expiresAt } : null,
    };
  } catch (e) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }
});
