import { db } from "../utils/drizzle";
import * as schema from "../database/schema";
import { count, desc, eq, not } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const query = getQuery<{ sort: string; p: string; ps: string }>(event);
  const pageSize = Number(query.ps || "20");
  const offset = (Number(query.p || "1") - 1) * pageSize;

  let dbOperation;

  if (query.sort === "likes") {
    dbOperation = db.select({
      name: schema.projects.name,
      description: schema.projects.description,
      id: schema.projects.id,
    }).from(schema.projects).leftJoin(
      schema.projectLikes,
      eq(schema.projects.id, schema.projectLikes.projectId),
    )
      .where(not(schema.projects.private))
      .groupBy(schema.projects.id)
      .orderBy(desc(count(schema.projectLikes.projectId))).limit(pageSize)
      .offset(offset);
  } else {
    dbOperation = db.select({
      name: schema.projects.name,
      description: schema.projects.description,
      id: schema.projects.id,
    }).from(schema.projects).where(not(schema.projects.private)).limit(
      pageSize,
    ).offset(offset);
  }

  return await dbOperation.execute();
});
