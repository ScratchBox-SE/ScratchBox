<script setup lang="ts">
const route = useRoute();

const { data: projects, pending } = await useAsyncData(
  "explore-results",
  () => {
    return $fetch<{ name: string; description: string; id: string }[]>(
      `/api/projects?sort=likes&p=${route.query.p || "1"}`,
    );
  },
  {
    watch: [() => route.query.p],
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
    path="explore"
    :projects="projects"
    :pending="pending"
  />
</template>
