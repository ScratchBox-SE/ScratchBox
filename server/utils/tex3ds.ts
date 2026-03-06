import { db } from "./drizzle";
import * as schema from "../database/schema";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

export const regenTex3DS = async () => {
  const projects = await db.select().from(schema.projects);

  const thumbnailPaths = await Promise.all(
    projects.map(async (project) => {
      if (
        !fs.existsSync(getFileLocally(project.id + ".png", "/thumbnails"))
      ) return null;

      await sharp(
        getFileLocally(project.id + ".png", "/thumbnails"),
      ).resize({
        width: 48,
        height: 48,
      }).png().toFile(getFileLocally(project.id + ".png", "/unistore"));

      return path.join(
        process.env.MOUNT as string,
        "unistore",
        `${project.id}.png`,
      );
    }),
  );

  fs.writeFileSync(
    path.join(process.env.MOUNT as string, "unistore", "scratchbox.t3s"),
    "--atlas -f rgba -z auto\n\n" +
      thumbnailPaths.filter((path) => path != null).join("\n"),
  );

  execSync(
    `tex3ds -i ${
      path.join(process.env.MOUNT as string, "unistore", "scratchbox.t3s")
    } -o ${
      path.join(process.env.MOUNT as string, "unistore", "scratchbox.t3x")
    }`,
  );
};
