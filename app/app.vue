<script setup lang="ts">
const { currentTheme } = useTheme();

const themeClass = computed(() => `theme-${currentTheme.value}`);

useHead({
  bodyAttrs: {
    class: () => themeClass,
  },
});
</script>
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  font-family: "Helvetica Neue", "Helvetica", Arial, sans-serif;
  color: var(--color-text);
}

body, html {
  width: 100vw;
  background: var(--color-background);
}

a {
  color: var(--color-primary);
  font-weight: bold;
}

main {
  margin-top: 4rem;
}

body.theme-light {
  --color-background: #eee;
  --color-secondary-background: #dfdfdf;
  --color-primary: #f9aa37;
  --color-primary-text: #fff;
  --color-text: #000;
  --color-blockquote: #d4d4d4;
  --color-success: #3c3;
  --color-error: #c33;
}

body.theme-dark {
  --color-background: #111;
  --color-secondary-background: #222;
  --color-primary: #d19847;
  --color-primary-text: #fff;
  --color-text: #ccc;
  --color-blockquote: #333;
  --color-success: #3c3;
  --color-error: #c33;
}
</style>
