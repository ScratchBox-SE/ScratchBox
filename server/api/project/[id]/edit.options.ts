export default defineEventHandler(async (event) => {
  setHeaders(
    event,
    {
      "Access-Control-Allow-Origin": process.env.NODE_ENV === "production"
        ? "https://editor." + getRequestURL(event).hostname
        : "http://localhost:8601",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers": "Content-Type",
    },
  );

  setResponseStatus(event, 204);
});
