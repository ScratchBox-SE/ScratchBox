// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/fonts", "@nuxt/icon", "@nuxt/image", "nuxt-file-storage"],
  app: {
    head: {
      link: [{
        rel: "icon",
        type: "image/svg+xml",
        href: "/scratchbox-logo-box.svg",
      }],
      title: "ScratchBox",
    },
  },
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET,
    authProjectId: process.env.AUTH_PROJECT_ID,
    authProjectAuthor: process.env.AUTH_PROJECT_AUTHOR,
  },
  fileStorage: {
    mount: process.env.MOUNT,
  },
  routeRules: {
    "/": { redirect: "/explore" },
  },
});
