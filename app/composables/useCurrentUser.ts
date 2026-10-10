export const useCurrentUser = async () => {
  try {
    const { data: user } = await useAsyncData(
      "user",
      () =>
        $fetch("/api/auth/me", {
          headers: useRequestHeaders(["cookie"]),
        }).catch(() => null),
    );

    return {
      loggedIn: !!user.value?.user,
      username: (user.value?.user as { username: string }).username || "",
      ban: user.value?.ban ?? null,
    };
  } catch {
    return { loggedIn: false, username: "", ban: null };
  }
};
