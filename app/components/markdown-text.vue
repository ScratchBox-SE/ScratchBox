<script setup lang="ts">
import md from "~/utils/markdown";

const props = defineProps<{ markdown: string }>();

const renderedMarkdown = computed(() => md.render(props.markdown));
</script>
<template>
  <div class="mdtext" v-html="renderedMarkdown"></div>
</template>
<style>
*:not(pre) > code,
pre {
  background: var(--color-secondary-background);
  padding: 0.25rem;
  border-radius: 0.25rem;

  &,
  & * {
    font-family: monospace;
  }
}

blockquote {
  border-left: 0.33rem solid var(--color-blockquote);
  padding-left: 0.5rem;
}

hr {
  margin: 1rem 0;
  border: 1px solid var(--color-text);
  border-radius: 1px;
}

.mdtext {
  word-wrap: break-word;
  white-space: pre-line;
}
</style>
