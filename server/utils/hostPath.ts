import path from "node:path";

export const toHostPath = (p: string): string => {
  const hostMount = process.env.HOST_MOUNT;
  if (!hostMount) return p;
  const rel = path.relative(process.env.MOUNT as string, p);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `${p} is outside MOUNT; it can't be bind-mounted into a sibling container`,
    );
  }
  return path.join(hostMount, rel);
};
