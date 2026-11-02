import { db } from "../utils/drizzle";
import * as schema from "../database/schema";

export default defineNitroPlugin(() => {
  (async () => {
    const projects = await db.select({
      id: schema.projects.id,
      fileType: schema.projects.fileType,
    }).from(schema.projects);

    let generated = 0;
    for (const project of projects) {
      if (project.fileType !== "sb3" || hasThumbnail(project.id)) continue;
      if (await generateProjectThumbnail(project.id, project.fileType)) {
        generated++;
      }
    }

    if (generated > 0) {
      console.log(`Generated ${generated} missing thumbnail(s)`);
      await syncUnistore();
    }
  })().catch((e) => console.error("Thumbnail backfill failed:", e));
});
