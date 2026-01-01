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

    return {
      user: decoded,
    };
  } catch (e) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }
});
