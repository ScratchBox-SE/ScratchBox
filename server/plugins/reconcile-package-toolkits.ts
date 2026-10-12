import { eq } from "drizzle-orm";
import { db } from "../utils/drizzle";
import * as schema from "../database/schema";

export default defineNitroPlugin(async () => {
  const stuck = await db.update(schema.packageToolkits).set({
    status: "failed",
    error: "Interrupted - the server restarted while this was building.",
  }).where(eq(schema.packageToolkits.status, "building")).returning({
    platform: schema.packageToolkits.platform,
  });

  for (const row of stuck) {
    console.log(
      `[toolkit:${row.platform}] marked failed (was stuck "building" from before a restart)`,
    );
  }
});
