<script setup lang="ts">
const platformsMap = {
  scratch: "Scratch",
  turbowarp: "TurboWarp",
  wasm: "WASM (SE! Web)",
  "3ds": "3DS",
  wiiu: "Wii U",
  switch: "Switch",
  wii: "Wii",
  gamecube: "GameCube",
  vita: "Vita",
  ps4: "PS4",
  ds: "DS",
} as const;

const platformSupportMap = {
  // Scratch and TurboWarp are here for type safety
  "scratch": {
    name: false,
    author: false,
    description: false,
    version: false,
  },
  "turbowarp": {
    name: false,
    author: false,
    description: false,
    version: false,
  },
  "wasm": {
    name: false,
    author: false,
    description: false,
    version: false,
  },
  "3ds": {
    name: true,
    author: true,
    description: true,
    version: false,
  },
  "wiiu": {
    name: true,
    author: true,
    description: true,
    version: true,
  },
  "switch": {
    name: true,
    author: true,
    description: false,
    version: true,
  },
  "wii": {
    name: true,
    author: true,
    description: true,
    version: true,
  },
  "gamecube": {
    name: false,
    author: false,
    description: false,
    version: false,
  },
  "vita": {
    name: true,
    author: false,
    description: false,
    version: false,
  },
  "ps4": {
    name: true,
    author: false,
    description: false,
    version: true,
  },
  "ds": {
    name: true,
    author: true,
    description: true,
    version: false,
  },
} as const;

const projectId = useRoute().params.id;

// FIXME: Simplify type
const { data: fetchedProject, error: fetchError } = await useFetch<{
  id: string;
  name: string;
  description: string;
  createdAt: string;
  private: boolean;
  user: string;
  likes: number;
  platforms: (keyof typeof platformsMap)[];
  comments: {
    id: number;
    originalId: number;
    user: string;
    createdAt: string;
    content: string;
    edited: boolean;
  }[];
}>(`/api/project/${projectId}`);

if (fetchError.value && projectId) {
  throw createError(fetchError.value);
}

const project = ref() as typeof fetchedProject;
watch(fetchedProject, (val) => (project.value = val), { immediate: true });

const platforms = reactive(
  project.value?.platforms.toSorted(
    (a, b) =>
      Object.keys(platformsMap).indexOf(a) -
      Object.keys(platformsMap).indexOf(b),
  ) as (keyof typeof platformsMap)[],
);

const selectedPlatform = ref<keyof typeof platformsMap | null>(null);

const name = ref(project.value?.name || "");
const description = ref(project.value?.description || "");
const author = ref(project.value?.user || "");
const version = ref("");
const titleId = ref("");
const contentId = ref("");

if (description.value.length > 50) {
  description.value = description.value.slice(0, 50) + "...";
}

const building = ref(false);
const logs = reactive<string[]>([]);
const taskId = ref<string | null>(null);
const startBuild = () => {
  building.value = true;
  const source = new EventSource(`/api/project/${projectId}/package`);

  source.addEventListener("log", (event) => {
    logs.push(event.data);
  });

  source.addEventListener("completed", (event) => {
    const data = JSON.parse(event.data);
    taskId.value = data.taskId;
    building.value = false;
    source.close();
  });

  source.addEventListener("error", (event) => {
    // FIXME: Present errors to user
    console.error(
      "error happened while packaging (idk might be the event source as well)",
      event,
    );
    building.value = false;
    source.close();
  });
};
</script>
<template>
  <div class="package-wrapper">
    <h1>Packager</h1>
    <template v-if="project">
      <template v-if="building">
        <h2>Logs</h2>
        <pre>{{ logs.join("\n") }}</pre>
      </template>
      <template v-else-if="taskId != null">
        <h2>Built!</h2>
        <a :href="`/api/project/${projectId}/package?taskId=${taskId}`" download
        >Download</a>
      </template>
      <template v-else>
        <p v-if="projectId">
          Project: <NuxtLink :to="`/project/${projectId}`">{{
            project.name
          }}</NuxtLink>
        </p>
        <h2>Select a Platform</h2>
        <div class="platforms">
          <button
            v-for='
              platform in             platforms.filter((platform) =>
                platform !== "scratch" && platform !== "turbowarp"
              )
            '
            @click="selectedPlatform = platform"
            :class="{ active: selectedPlatform === platform }"
          >
            {{ platformsMap[platform] }}
          </button>
        </div>
        <template v-if="selectedPlatform !== null">
          <h2>Application Info</h2>
          <div
            class="app-info"
            v-if="platformSupportMap[selectedPlatform].name"
          >
            <label for="name">Name</label>
            <input id="name" placeholder="Name" v-model="name" />
          </div>
          <div
            class="app-info"
            v-if="platformSupportMap[selectedPlatform].description"
          >
            <label for="description">Description</label>
            <input
              id="description"
              placeholder="Description"
              v-model="description"
            />
          </div>
          <div
            class="app-info"
            v-if="platformSupportMap[selectedPlatform].author"
          >
            <label for="author">Author</label>
            <input id="author" placeholder="Author" v-model="author" />
          </div>
          <div
            class="app-info"
            v-if="platformSupportMap[selectedPlatform].version"
          >
            <label for="version">Version</label>
            <input id="version" placeholder="Version" v-model="version" />
          </div>
          <div
            class="app-info"
            v-if='
              selectedPlatform === "vita" ||
                selectedPlatform === "ps4"
            '
          >
            <label for="titleid">Title ID</label>
            <input id="titleid" placeholder="Title ID" v-model="titleId" />
          </div>
          <div
            class="app-info"
            v-if='selectedPlatform === "ps4"'
          >
            <label for="contentid">Content ID</label>
            <input id="content" placeholder="Content ID" v-model="contentId" />
          </div>
          <p>Custom icon support coming soon!</p>
        </template>
        <button class="package" @click="startBuild">Package</button>
      </template>
    </template>
    <template v-else>
      <p>Non-ScratchBox projects aren't supported yet.</p>
    </template>
  </div>
</template>
<style>
.package-wrapper {
  background-color: var(--color-secondary-background);
  border-radius: 1rem;
  display: flex;
  gap: 2rem;
  flex-direction: column;
  padding: 2rem;
  min-height: 32rem;
  text-align: center;
  min-width: 48rem;

  & p {
    font-size: 1.15rem;
  }

  & .platforms {
    display: flex;
    margin: 0 auto;
    flex-wrap: wrap;
    gap: 0.5rem;
    max-width: 48rem;

    & button {
      color: var(--color-text);
      background-color: var(--color-background);
      border: none;
      font-size: 1rem;
      cursor: pointer;
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      display: flex;
      align-items: center;
      transition: 100ms all ease-in-out;

      &.active {
        color: var(--color-primary-text);
        background-color: var(--color-primary);
      }
    }
  }

  & .app-info {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: center;

    & label {
      font-weight: bold;
    }

    & input {
      background-color: var(--color-background);
      color: var(--color-text);
      border-radius: 1rem;
      border: none;
      padding: 1rem;
      outline: none;
      transition: 100ms background ease-in-out;
      font-size: 1rem;

      &:active, &:focus {
        background-color: var(--color-card-background);
      }
    }
  }

  & .package {
    width: max-content;
    margin: 0 auto;
    font-size: 1.25rem;
    padding: 0.75rem 1.25rem;
    border-radius: 1rem;
  }
}

pre {
  background: var(--color-background) !important;
  padding: 1rem !important;
  width: 50rem;
  min-height: 20rem;
  margin: auto;
  overflow: scroll;
}
</style>
