<script setup lang="ts">
const props = useAttrs();
const route = useRoute();

var url = new URL(`https://scratchbox.dev/${props.path}`); // not like the url will matter anyway since we're just going to use it for the back/next path

var back = new URLSearchParams(url.search);
back.set("p", Number(route.query.p || "1") - 1);

var next = new URLSearchParams(url.search);
next.set("p", Number(route.query.p || "1") + 1);
</script>

<template>
  <div class="content">
    <h1 v-if="props.pending">Loading...</h1>
    <h1 v-else-if="props.projects?.length === 0">No results found.</h1>
    <template v-else>
      <slot />
      <Project
        v-for="project in props.projects"
        :name="project.name"
        :description="project.description"
        :id="project.id"
      />
    </template>
  </div>
  <div class="page-controls">
    <NuxtLink
      v-if="Number(route.query.p || '1') > 1"
      :to="`${url.pathname}?${back.toString()}`"
    >
      Back
    </NuxtLink>
    <p>{{ route.query.p || "1" }}</p>
    <NuxtLink :to="`${url.pathname}?${next.toString()}`"> Next </NuxtLink>
  </div>
</template>
<style>
body main {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.content {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  justify-content: center;
  gap: 1rem;
}

.content > h1 {
  grid-column: 1 / -1;
  text-align: center;
  margin: 0;
}

.page-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin: 1rem 0;

  & a {
    background: var(--color-primary);
    border: none;
    color: var(--color-primary-text);
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-weight: bold;
    text-decoration: none;
  }
}
</style>
