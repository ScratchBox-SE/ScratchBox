export default defineEventHandler(async (event) => {
  setCookie(event, "SB_TOKEN", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    domain: process.env.NODE_ENV === "production"
      ? getRequestURL(event).hostname
      : undefined,
  });
  sendRedirect(event, "/", 303);
});
