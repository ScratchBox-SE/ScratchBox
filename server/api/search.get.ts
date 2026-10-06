import { db } from "../utils/drizzle";
import * as schema from "../database/schema";
import { sql } from "drizzle-orm";

const buildMatchQuery = (q: string) => {
  const terms = q.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return null;
  return terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(" AND ");
};

const buildTagFilter = (tags: string[]) => {
  if (tags.length === 0) return sql``;
  const tagList = sql.join(tags.map((tag) => sql`${tag}`), sql`, `);
  return sql`AND p.id IN (SELECT project_id FROM project_tags WHERE tag IN (${tagList}) GROUP BY project_id HAVING COUNT(DISTINCT tag) = ${tags.length})`;
};

const buildSortClause = (sort: string | undefined) => {
  switch (sort) {
    case "likes":
      return sql`ORDER BY (SELECT COUNT(*) FROM project_likes WHERE project_likes.project_id = p.id) DESC`;
    case "newest":
      return sql`ORDER BY p.created_at DESC`;
    default:
      return sql`ORDER BY bm25(projects_fts) ASC`;
  }
};

export default defineEventHandler(async (event) => {
  const query = getQuery<
    { q: string; p: string; ps: string; sort?: string; tags?: string }
  >(event);
  const pageSize = Number(query.ps || "20");

  const matchQuery = buildMatchQuery(query.q || "");
  if (!matchQuery) return [];

  const tags = (query.tags || "").split(",").map((t) => t.trim()).filter(
    Boolean,
  );

  return db
    .all(
      sql`SELECT p.id, p.name, p.description FROM ${schema.projects} AS p JOIN projects_fts AS pf ON p.id = pf.id WHERE pf.projects_fts MATCH ${matchQuery} AND p.private = false ${
        buildTagFilter(tags)
      } ${buildSortClause(query.sort)} LIMIT ${pageSize} OFFSET ${
        (Number(query.p || "1") - 1) * pageSize
      };`,
    );
});
