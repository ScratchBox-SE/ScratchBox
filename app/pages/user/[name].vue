<script setup lang="ts">
const route = useRoute();

const projects = await $fetch<{
  public: { name: string; description: string; id: string }[];
  private?: { name: string; description: string; id: string }[];
}>(`/api/user/${route.params.name}/projects`, {
  headers: useRequestHeaders(["cookie"]),
});

const profilePicture = await getProfilePicture(route.params.name as string);

useHead({
  title: `${
    projects.private ? "Your" : `${route.params.name}'s`
  } Profile - ScratchBox`,
  meta: [
    { name: "description", content: null },
    { property: "og:title", content: `${route.params.name}'s Profile` },
    { property: "og:description", content: null },
    {
      property: "og:image",
      content: profilePicture,
    },
    { name: "twitter:card", content: "summary" },
  ],
  bodyAttrs: {
    class: "profile-page",
  },
});
</script>
<template>
  <div class="profile">
    <h1>
      <img :src="profilePicture as string" />
      {{ projects.private ? "Your" : `${route.params.name}'s` }} Profile
    </h1>
    <p v-if="projects.private === undefined && projects.public.length === 0">
      {{ route.params.name }} doesn't have any public projects yet.
    </p>
    <p
      v-else-if="projects.private?.length === 0 && projects.public.length === 0"
    >
      You don't have any projects yet.
    </p>
    <template v-else>
      <template v-if="projects.public.length > 0">
        <h2>Public Projects</h2>
        <div class="user-projects">
          <Project
            v-for="project in projects.public"
            :name="project.name"
            :description="project.description"
            :id="project.id"
          />
        </div>
      </template>
      <template v-if="projects.private && projects.private.length > 0">
        <h2>Private Projects</h2>
        <div class="user-projects">
          <Project
            v-for="project in projects.private"
            :name="project.name"
            :description="project.description"
            :id="project.id"
          />
        </div>
      </template>
    </template>
  </div>
</template>
<style>
body.profile-page main {
  display: flex;
  justify-content: center;
}

.profile {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  & h1 {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;

    & img {
      border-radius: 1rem;
      height: 4rem;
    }
  }
}

.user-projects {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  justify-content: center;
  gap: 1rem;
}

@media (max-width: 912px) {
  .profile h1 {
    margin-bottom: 0.5rem;
  }
}
</style>
