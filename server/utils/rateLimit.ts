const buckets = new Map<string, number[]>();

export const checkRateLimit = (
  key: string,
  max: number,
  windowMs: number,
): boolean => {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }

  recent.push(now);
  buckets.set(key, recent);
  return true;
};
