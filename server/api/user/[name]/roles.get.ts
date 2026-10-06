import jwt from "jsonwebtoken";

export default defineEventHandler(async (event) => {
  const user = getRouterParam(event, "name") as string;
  const token = getCookie(event, "SB_TOKEN");

  if (!token) return [];
  try {
    jwt.verify(token, useRuntimeConfig().jwtSecret);
  } catch {
    return [];
  }

  return await getActiveRoles(user);
});
