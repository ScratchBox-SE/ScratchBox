export default defineEventHandler(async (event) => {
  const user = getRouterParam(event, "name") as string;
  return await getActiveRoles(user);
});
