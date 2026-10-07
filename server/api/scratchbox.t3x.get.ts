import { createReadStream } from "fs";
import { isUnistoreEnabled, regenTex3DSUnsafe } from "../utils/tex3ds";
import fs from "node:fs";

export default defineEventHandler(async (event) => {
  if (!isUnistoreEnabled()) {
    throw createError({
      statusCode: 404,
      statusMessage: "Unistore is not enabled on this server.",
    });
  }

  try {
    let filePath = getFileLocally("scratchbox.t3x", "/unistore");

    if (!fs.existsSync(filePath)) {
      await regenTex3DSUnsafe();
    }

    setHeader(
      event,
      "Content-Disposition",
      `attachment; filename="scratchbox.t3x"`,
    );

    setHeader(event, "Access-Control-Allow-Origin", "*");

    return sendStream(event, createReadStream(filePath));
  } catch (e) {
    console.error(e);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
