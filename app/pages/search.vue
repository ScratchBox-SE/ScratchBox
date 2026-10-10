<script setup lang="ts">
const route = useRoute();
if (route.query.q === undefined || route.query.q === "") {
  throw createError({ statusCode: 400, statusMessage: "No query" });
}
const { data: results, pending } = await useAsyncData(
  "search-results",
  () => {
    return $fetch<{ name: string; description: string; id: string }[]>(
      "/api/search",
      {
        query: {
          q: route.query.q,
          sort: route.query.sort,
          tags: route.query.tags,
          p: route.query.p || "1",
          ps: 12,
        },
      },
    );
  },
  {
    watch: [
      () => route.query.q,
      () => route.query.p,
      () => route.query.sort,
      () => route.query.tags,
    ],
  },
);

useHead({
  title: `Results for "${route.query.q}" - ScratchBox`,
  bodyAttrs: {
    class: "search-page",
  },
});
</script>
<template>
  <NuxtLayout
    name="projects"
    :projects="results"
    :pending="pending"
  >
    <h1>Results for "{{ route.query.q }}"</h1>
  </NuxtLayout>
</template>
