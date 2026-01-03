<script setup lang="ts">
const { currentTheme } = useTheme();

const themeClass = computed(() => `theme-${currentTheme.value}`);

useHead({
  title: "ScratchBox",
  meta: [
    {
      name: "description",
      content:
        "A project hosting/distribution platform for Scratch Everywhere!",
    },
    { name: "theme-color", content: "#f9aa37" },
    { property: "og:site_name", content: "ScratchBox" },
    { property: "og:title", content: "ScratchBox" },
    {
      property: "og:description",
      content:
        "A project hosting/distribution platform for Scratch Everywhere!",
    },
    { property: "og:image", content: "/default-thumbnail.png" },
    { property: "og:image:type", content: "image/png" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
  bodyAttrs: {
    class: themeClass,
  },
});
</script>
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  font-family: "Helvetica Neue", "Helvetica", Arial, sans-serif;
  color: var(--color-text);
}

body,
html {
  width: 100vw;
  background: var(--color-background);
  transition: 50ms background ease-in-out;
}

a {
  color: var(--color-primary);
}

main {
  max-width: 1200px;
  padding: 2rem;
  margin: auto;
  margin-top: 3rem;
}

@media (max-width: 912px) {
  main {
    padding: 1rem;
  }
}

body.theme-light {
  --color-background: #eee;
  --color-secondary-background: #dfdfdf;
  --color-primary: #f9aa37;
  --color-primary-text: #fff;
  --color-text: #000;
  --color-blockquote: #d4d4d4;
}

body.theme-dark {
  --color-background: #111;
  --color-secondary-background: #222;
  --color-primary: #d19847;
  --color-primary-text: #fff;
  --color-text: #ccc;
  --color-blockquote: #333;
}

.fade-enter-active,
.fade-leave-active {
  transition: 100ms opacity ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
