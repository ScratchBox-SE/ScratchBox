import path from "node:path";
import fs from "node:fs/promises";

export default defineTask({
  meta: {
    name: "cleanup-packager-builds",
    description: "Deletes build folders older than 1 hour",
  },
  async run() {
    const buildsPath = path.join(
      process.env.MOUNT as string,
      "tmp",
      "builds",
    );

    try {
      const folders = await fs.readdir(buildsPath);
      const now = Date.now();

      for (const folder of folders) {
        const folderPath = path.join(buildsPath, folder);
        const stats = await fs.stat(folderPath);

        if (now - stats.mtimeMs > 3600000) {
          await fs.rm(folderPath, { recursive: true, force: true });
          console.log(`Cleaned up build folder: ${folder}`);
        }
      }
    } catch (e) {
      console.error("Packager Cleanup task failed", e);
    }

    return { result: "success" };
  },
});
