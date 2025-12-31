<script setup lang="ts">
const props = withDefaults(
  defineProps<{ title?: string; close?: boolean; open?: boolean }>(),
  {
    close: true,
    open: false,
  },
);

const dialogRef = useTemplateRef("dialogRef");

const emit = defineEmits(["update:open"]);

watch(() => props.open, (open) => {
  if (open) {
    dialogRef.value?.showModal();
  } else {
    dialogRef.value?.close();
  }
}, { immediate: true });

onMounted(() => {
  if (props.open) {
    dialogRef.value?.showModal();
  }
});

const handleClick = (e: MouseEvent) => {
  const rect = dialogRef.value?.getBoundingClientRect();
  if (!rect) return;

  if (
    e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top ||
    e.clientY > rect.bottom
  ) emit("update:open", false);
};
</script>
<template>
  <dialog
    ref="dialogRef"
    @cancel.prevent='emit("update:open", false)'
    @click="handleClick"
  >
    <header>
      <h3 v-if="props.title">{{ props.title }}</h3>
      <Icon name="ri:close-circle-fill" @click='emit("update:open", false)' />
    </header>
    <div class="content">
      <slot />
    </div>
  </dialog>
</template>
<style>
dialog {
  background: var(--color-secondary-background);
  border: none;
  position: fixed;
  left: 50vw;
  top: 50vh;
  translate: -50% -50%;
  box-shadow: rgba(0, 0, 0, 0.1) 0 0 0.25rem 0.25rem;
  border-radius: 1rem;
  min-width: 20rem;
  min-height: 10rem;
  padding: 1.25rem;

  & * {
    color: var(--color-text) !important;
  }

  & > header {
    display: flex;
    position: relative;
    margin-bottom: 0.75rem;

    & > span {
      position: absolute;
      right: 0;
      cursor: pointer;
    }
  }

  &::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    & input {
      background-color: var(--color-background);
      border: none;
      padding: 0.5rem;
      border-radius: 0.5rem;
      border: 2px solid var(--color-background);

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }

    & button {
      background-color: var(--color-primary);
      padding: 0.5rem;
      color: var(--color-primary-text) !important;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }
  }
}
</style>
