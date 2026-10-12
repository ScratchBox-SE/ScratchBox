import { and, eq } from "drizzle-orm";
import { createReadStream } from "node:fs";
import * as schema from "~~/server/database/schema";
import path from "node:path";
import fs from "node:fs";

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, "id") as string;
  const query = getQuery(event);

  if (query.taskId != null) {
    const taskId = parseInt(query.taskId as string);

    const task = (await db.select().from(schema.packageTasks).where(
      and(
        eq(schema.packageTasks.id, taskId),
        eq(schema.packageTasks.projectId, projectId),
      ),
    ))[0];

    if (task == null) {
      throw createError({
        statusCode: 404,
        statusMessage: "Task not found.",
      });
    }

    if (!task.outputPath || !fs.existsSync(task.outputPath)) {
      throw createError({
        statusCode: 404,
        statusMessage: "Output not found.",
      });
    }
    const filePath = task.outputPath;

    setHeader(
      event,
      "Content-Disposition",
      `attachment; filename="${projectId}${path.extname(filePath)}"`,
    );

    return createReadStream(filePath);
  }

  try {
    const filePath = getFileLocally(
      projectId + ".sb3",
      "/projects",
    );

    if (!filePath) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found.",
      });
    }

    if (
      query.platform == null || typeof query.platform != "string" ||
      query.platform == ""
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing or invalid platform param.",
      });
    }

    const [task] = await db.insert(schema.packageTasks).values({
      projectId,
      status: "pending",
    }).returning();
    const taskId = task?.id as number;

    const eventStream = createEventStream(event);

    runBuild(projectId, filePath, taskId, query.platform, {
      name: query.name as string | undefined,
      author: query.author as string | undefined,
      description: query.description as string | undefined,
      version: query.version as string | undefined,
      titleId: query.titleId as string | undefined,
      contentId: query.contentId as string | undefined,
    }, (log) => {
      eventStream.push({ event: "log", data: log });
    }).then(async (outputPath) => {
      await db.update(schema.packageTasks).set({
        status: "completed",
        outputPath,
      }).where(eq(schema.packageTasks.id, taskId));
      await eventStream.push({
        event: "completed",
        data: JSON.stringify({ taskId: taskId }),
      });
      await eventStream.close();
    }).catch(async (err: Error) => {
      await db.update(schema.packageTasks).set({ status: "failed" }).where(
        eq(schema.packageTasks.id, taskId),
      );
      await eventStream.push({ event: "error", data: err.message });
      await eventStream.close();
    });

    const timer = setInterval(() => {
      eventStream.push({ event: "ping", data: "heartbeat" });
    }, 5000);
    event.node.res.on("close", () => clearInterval(timer));

    return eventStream.send();
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error",
    });
  }
});
