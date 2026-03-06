import { db } from "../utils/drizzle";
import * as schema from "../database/schema";
import { and, count, eq, not } from "drizzle-orm";
import fs from "node:fs";

export default defineEventHandler(async (event) => {
  let i = 0;

  return {
    storeInfo: {
      title: "ScratchBox",
      author: "ScratchBox Users",
      description:
        "A project hosting/distribution platform for Scratch Everywhere!",
      file: "scratchbox.unistore",
      sheet: "scratchbox.t3x",
      sheetURL: `https://${getRequestHost(event)}/api/scratchbox.t3x`,
      version: 3,
      revision: (await db.select().from(schema.unistoreData))[0]?.revision,
      url: `https://${getRequestHost(event)}/api/scratchbox.unistore`,
    },
    storeContent: (await db.select().from(schema.projects)).map(
      (project) => {
        const hasThumbnail = fs.existsSync(
          getFileLocally(project.id + ".png", "/thumbnails"),
        );

        const dateParts = new Map(
          new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "UTC",
          }).formatToParts(project.lastUpdated).map(
            (part) => [part.type, part.value],
          ),
        );

        const content: { [key: string]: Object } = {
          info: {
            title: project.name,
            author: project.user,
            version: JSON.stringify(
              project.lastUpdated.getTime() -
                project.createdAt.getTime(),
            ), // Calculate version based on when it was updated
            category: ["Games"],
            console: ["3DS"],
            description: project.description.length > 150
              ? project.description.slice(0, 150) + "..."
              : project.description,
            license: "", // I don't enforce any licenses on ScratchBox, if a project is licensed it should be in the description
            icon_index: hasThumbnail ? i : -1,
            last_updated: `${dateParts.get("year")}-${dateParts.get("month")}-${
              dateParts.get("day")
            } at ${dateParts.get("hour")}:${dateParts.get("minute")} (UTC)`,
            stars: db
              .select({ count: count() })
              .from(schema.projectLikes)
              .where(eq(schema.projectLikes.projectId, project.id))
              .get()?.count,
          },
        };
        content[`Download ${project.name}.sb3`] = [{
          type: "downloadFile",
          file: `https://${
            getRequestHost(event)
          }/api/project/${project.id}/download`,
          output: `sdmc:/3ds/scratch-everywhere/${project.name}.sb3`,
        }];

        if (hasThumbnail) i++;

        return content;
      },
    ),
  };
});
