<script setup lang="ts">
const route = useRoute();

const projects = await $fetch<
  {
    public: { name: string; description: string; id: string }[];
    private?: { name: string; description: string; id: string }[];
  }
>(`/api/user/${route.params.name}/projects`, {
  headers: useRequestHeaders(["cookie"]),
});

const profilePicture = await getProfilePicture(route.params.name as string);

useHead({
  bodyAttrs: {
    class: "profile-page",
  },
});
</script>
<template>
  <div class="profile">
    <h1>
      <img :src="profilePicture as string" /> {{
        projects.private ? "Your" : `${route.params.name}'s`
      }} Profile
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
            :description='
              project.description.length > 75
                ? project.description.slice(0, 75) + "..."
                : project.description
            '
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
            :description='
              project.description.length > 75
                ? project.description.slice(0, 75) + "..."
                : project.description
            '
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
  padding: 1rem 0;
  width: 65rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  & h1 {
    display: flex;
    align-items: center;
    gap: 0.5ch;
    margin-bottom: 2rem;

    & img {
      border-radius: 0.75rem;
      height: 3rem;
    }
  }
}

.user-projects {
  display: flex;
  gap: 1rem;
}
</style>
