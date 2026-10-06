import { db } from "../utils/drizzle";
import * as schema from "../database/schema";
import { and, count, desc, eq, inArray, not, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const query = getQuery<
    { sort: string; p: string; ps: string; tags?: string }
  >(event);
  const pageSize = Number(query.ps || "20");
  const offset = (Number(query.p || "1") - 1) * pageSize;

  const tags = (query.tags || "").split(",").map((t) => t.trim()).filter(
    Boolean,
  );

  const conditions = [not(schema.projects.private)];
  if (tags.length > 0) {
    conditions.push(
      inArray(
        schema.projects.id,
        db.select({ projectId: schema.projectTags.projectId })
          .from(schema.projectTags)
          .where(inArray(schema.projectTags.tag, tags))
          .groupBy(schema.projectTags.projectId)
          .having(
            sql`count(distinct ${schema.projectTags.tag}) = ${tags.length}`,
          ),
      ),
    );
  }

  const selection = {
    name: schema.projects.name,
    description: schema.projects.description,
    id: schema.projects.id,
  };

  if (query.sort === "likes") {
    return await db.select(selection).from(schema.projects).leftJoin(
      schema.projectLikes,
      eq(schema.projects.id, schema.projectLikes.projectId),
    )
      .where(and(...conditions))
      .groupBy(schema.projects.id)
      .orderBy(desc(count(schema.projectLikes.projectId)))
      .limit(pageSize)
      .offset(offset);
  }

  return await db.select(selection).from(schema.projects)
    .where(and(...conditions))
    .orderBy(desc(schema.projects.createdAt))
    .limit(pageSize)
    .offset(offset);
});
