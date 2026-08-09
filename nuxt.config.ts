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
  nitro: {
    scheduledTasks: {
      "0 * * * *": ["cleanup-packager-builds"],
    },
    experimental: {
      tasks: true,
    },
  },
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET,
  },
  fileStorage: {
    mount: process.env.MOUNT,
  },
  routeRules: {
    "/": { redirect: "/explore" },
  },
});
