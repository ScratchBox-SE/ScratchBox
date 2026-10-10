<script setup lang="ts">
const props = withDefaults(
  defineProps<{ label: string; selected: boolean; interactive?: boolean }>(),
  {
    interactive: true,
  },
);

const emit = defineEmits<{ toggle: [] }>();
</script>
<template>
  <p
    class="tag-pill"
    :class="{ selected: props.selected, interactive: props.interactive }"
    @click="props.interactive && emit('toggle')"
  >
    {{ props.label }}
    <Icon
      v-if="props.interactive"
      :name='props.selected ? "ri:close-line" : "ri:add-line"'
    />
  </p>
</template>
<style>
.tag-pill {
  background: var(--color-secondary-background);
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  user-select: none;

  &.interactive {
    cursor: pointer;
  }

  &.selected {
    background: var(--color-primary);

    &,
    & * {
      color: var(--color-primary-text);
    }
  }
}
</style>
