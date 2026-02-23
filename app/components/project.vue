<script setup lang="ts">
const props = defineProps<{ name: string; description: string; id: string }>();
</script>
<template>
  <NuxtLink :to="`/project/${props.id}`" class="project-card">
    <object :data="`/api/project/${props.id}/thumbnail`" type="image/png">
      <nuxt-img src="/default-thumbnail.png" />
    </object>
    <h2>{{ props.name }}</h2>
    <MarkdownText
      v-if='props.description !== ""'
      style="margin-bottom: -1rem"
      :markdown='
        props.description.length > 90
          ? props.description.slice(0, 90) + "..."
          : props.description
      '
    />
  </NuxtLink>
</template>
<style>
.project-card {
  background: var(--color-secondary-background);
  color: var(--color-text);
  font-weight: unset;
  text-decoration: none;
  padding: 1rem;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: 50ms background ease-in-out;

  &:hover {
    background: color-mix(
      in srgb,
      rgba(0, 0, 0, 0.125),
      var(--color-secondary-background)
    );
  }

  & object,
  & img {
    width: 100%;
    border-radius: 1rem;
  }
}
</style>
