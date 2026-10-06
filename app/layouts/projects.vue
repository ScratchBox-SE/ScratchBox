<script setup lang="ts">
const props = useAttrs();
const route = useRoute();

const buildPageLink = (p: number) => ({
  path: route.path,
  query: { ...route.query, p: String(p) },
});

const currentPage = computed(() => Number(route.query.p || "1"));

const selectedSort = computed(() =>
  (route.query.sort as string) || (route.query.q ? "relevance" : "newest")
);

const selectedTags = computed(() =>
  ((route.query.tags as string) || "").split(",").filter(Boolean)
);

const updateQuery = (overrides: Record<string, string | undefined>) => {
  const query: Record<string, string> = {
    ...route.query as Record<string, string>,
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (!value) delete query[key];
    else query[key] = value;
  }
  query.p = "1";
  navigateTo({ path: route.path, query });
};

const onSortChange = (e: Event) => {
  const sort = (e.target as HTMLSelectElement).value;
  updateQuery({ sort: sort === "relevance" ? undefined : sort });
};

const toggleTag = (tag: string) => {
  const tags = new Set(selectedTags.value);
  if (tags.has(tag)) tags.delete(tag);
  else tags.add(tag);
  updateQuery({ tags: [...tags].join(",") || undefined });
};
</script>

<template>
  <div class="filters">
    <select :value="selectedSort" @change="onSortChange">
      <option v-if="route.query.q" value="relevance">Relevance</option>
      <option value="likes">Most Liked</option>
      <option value="newest">Newest</option>
    </select>

    <div class="tags">
      <TagPill
        v-for="(label, tag) in tagsMap"
        :key="tag"
        :label="label"
        :selected="selectedTags.includes(tag)"
        @toggle="toggleTag(tag)"
      />
    </div>
  </div>

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
      v-if="currentPage > 1"
      :to="buildPageLink(currentPage - 1)"
    >
      Back
    </NuxtLink>
    <p>{{ currentPage }}</p>
    <NuxtLink :to="buildPageLink(currentPage + 1)"> Next </NuxtLink>
  </div>
</template>
<style>
body main {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.filters {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;

  & select {
    padding: 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text);
    background-color: var(--color-secondary-background);
    border: none;
  }

  & .tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
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
