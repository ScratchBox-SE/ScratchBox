<script setup lang="ts">
const authRedirect = btoa(`${useRequestURL().origin}/api/auth`);

const user = await useCurrentUser();

const upload = useTemplateRef("upload") as Ref<HTMLInputElement>;
const { handleFileInput, files } = useFileStorage({ clearOldFiles: false });

const search = ref(useRoute().query.q || "");

const { currentTheme, toggleTheme } = useTheme();

const onUpload = async (e: Event) => {
  await handleFileInput(e);
  await navigateTo(
    `/project/${await $fetch("/api/upload", {
      method: "POST",
      body: files.value[0],
    })}`,
  );
};

const editorURL = import.meta.dev
  ? "http://localhost:8601"
  : `https://editor.${useRequestURL().hostname}`;

const createDialogOpen = ref(false);
const createProjectName = ref("");

const createProject = async () => {
  await navigateTo(
    `${editorURL}/#${await $fetch("/api/create", {
      method: "POST",
      body: { name: createProjectName.value },
    })}`,
    { external: true },
  );
};

let userRoles: string[] = [];
if (user.loggedIn) {
  try {
    const res = await $fetch(`/api/user/${user.username}/roles`, {
      method: "GET",
      headers: useRequestHeaders(["cookie"]),
    });
    userRoles = res ?? [];
  } catch {}
}
</script>
<template>
  <nav>
    <NuxtLink to="/"><img
        src="/scratchbox-logo-full.svg"
        alt="ScratchBox"
      />
    </NuxtLink>
    <ClientOnly>
      <a href="javascript:void(0);" @click="toggleTheme">
        <Icon v-if='currentTheme === "light"' name="ri:moon-fill" />
        <Icon v-else name="ri:sun-line" />
      </a>
    </ClientOnly>
    <template v-if="user.loggedIn">
      <a href="javascript:void(0);" @click="createDialogOpen = true">Create</a>
      <Dialog title="Create Project" v-model:open="createDialogOpen">
        <input
          type="text"
          placeholder="Project Name..."
          v-model="createProjectName"
        >
        <button @click="createProject">Create</button>
      </Dialog>
    </template>
    <NuxtLink v-else :to="editorURL">Create</NuxtLink>
    <NuxtLink to="/explore">Explore</NuxtLink>
    <NuxtLink v-if="userRoles.includes('admin')" to="/admin">Moderate</NuxtLink>
    <input
      type="search"
      placeholder="Search..."
      v-model="search"
      @keyup.enter='navigateTo({ path: "/search", query: { q: search } })'
    />
    <template v-if="user.loggedIn">
      <a href="javascript:void(0);" @click="upload.click()">Upload</a>
      <NuxtLink :to="`/user/${user.username}`">My Profile</NuxtLink>
      <a href="/api/auth/logout">Log Out</a>
      <input
        type="file"
        hidden
        ref="upload"
        accept=".sb3"
        @input="onUpload"
      />
    </template>
    <NuxtLink
      :to="`https://auth.itinerary.eu.org/auth/?redirect=${authRedirect}&name=ScratchBox`"
      target="_blank"
      v-else
    >Log In</NuxtLink>
  </nav>
</template>
<style>
nav {
  display: flex;
  background: var(--color-primary);
  height: 4rem;
  justify-content: center;
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 100;

  & img {
    height: 100%;
  }

  & * {
    color: var(--color-primary-text);
    font-weight: bold;
    font-size: 1rem;
  }

  & > a {
    padding: 1rem;
    text-decoration: none;
    display: flex;
    align-items: center;
    height: 100%;
    transition: 50ms background ease-in-out;
    &:hover {
      background: rgba(0, 0, 0, 0.25);
    }
  }

  & > input {
    background: rgba(0, 0, 0, 0.25);
    color: var(--color-primary-text);
    border: none;
    margin: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.5rem;
    width: 30rem;

    &::placeholder {
      color: var(--color-primary-text);
    }
  }
}
</style>
