export const useFormatedTime = (date: Date) => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval) return `${interval} year${interval !== 1 ? "s" : ""}`;
  interval = Math.floor(seconds / 2592000);
  if (interval) return `${interval} month${interval !== 1 ? "s" : ""}`;
  interval = Math.floor(seconds / 86400);
  if (interval) return `${interval} day${interval !== 1 ? "s" : ""}`;
  interval = Math.floor(seconds / 3600);
  if (interval) return `${interval} hour${interval !== 1 ? "s" : ""}`;
  interval = Math.floor(seconds / 60);
  if (interval) return `${interval} minute${interval !== 1 ? "s" : ""}`;
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
};
