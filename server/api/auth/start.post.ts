import { db } from "../../utils/drizzle";
import * as schema from "../../database/schema";
import { generatePrivateCode, generatePublicCode } from "../../utils/scratchAuth";

export default defineEventHandler(async (event) => {
  const privateCode = generatePrivateCode();
  const publicCode = generatePublicCode();

  await db.insert(schema.authTokens).values({ privateCode, publicCode });

  const { authProjectId, authProjectAuthor } = useRuntimeConfig();

  return {
    privateCode,
    publicCode,
    projectId: authProjectId,
    projectAuthor: authProjectAuthor,
  };
});
