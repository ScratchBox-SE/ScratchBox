<script setup lang="ts">
const route = useRoute();

const { data: projects, pending } = await useAsyncData(
  "explore-results",
  () => {
    return $fetch<{ name: string; description: string; id: string }[]>(
      "/api/projects",
      {
        query: {
          sort: route.query.sort || "newest",
          tags: route.query.tags,
          p: route.query.p || "1",
          ps: 12,
        },
      },
    );
  },
  {
    watch: [
      () => route.query.p,
      () => route.query.sort,
      () => route.query.tags,
    ],
  },
);

useHead({
  title: "Explore - ScratchBox",
  bodyAttrs: {
    class: "explore-page",
  },
});
</script>
<template>
  <NuxtLayout
    name="projects"
    :projects="projects"
    :pending="pending"
  />
</template>
