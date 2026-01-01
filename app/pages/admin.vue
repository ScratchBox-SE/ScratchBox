<script setup lang="ts">
const user = await useCurrentUser();

let userRoles: string[] = [];
if (user.loggedIn) {
  try {
    const res = await $fetch<{ roles: string[] }>(`/api/user/${user.username}/user`, {
      method: "GET",
      headers: useRequestHeaders(["cookie"]),
    });
    userRoles = res.roles ?? [];
  } catch {}
}
else {
  throw createError({
    statusCode: 401,
    statusMessage: "Unauthorized",
  });
}

if (!userRoles.includes("admin")) {
  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
  });
}

</script>
<template>
  <h1>Admin Panel</h1>
  <p>Not implemented yet</p>
</template>