<script setup lang="ts">
const platformsMap = {
  "scratch": "Scratch",
  "turbowarp": "TurboWarp",
  "3ds": "3DS",
  "wiiu": "Wii U",
  "switch": "Switch",
  "wii": "Wii",
  "gamecube": "GameCube",
  "vita": "Vita",
  "ps4": "PS4",
  "ds": "DS",
  "wasm": "WASM (SE! Web)",
};

const projectId = useRoute().params.id;

const { data: fetchedProject } = await useFetch<
  {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    private: boolean;
    user: string;
    likes: number;
    platforms: (keyof typeof platformsMap)[];
    comments: { id: number, originalId: number, user: string; createdAt: string; content: string, edited: boolean }[];
  }
>(`/api/project/${projectId}`);
const project = ref() as typeof fetchedProject;
watch(fetchedProject, (val) => project.value = val, { immediate: true });

const sortedComments = computed(() => {
  if (!project.value || !project.value.comments) return [];

  return project.value.comments.toSorted((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).map((comment) => ({
    ...comment,
    timeSince: useFormatedTime(new Date(comment.createdAt)),
  }));
});
const commentProfiles = ref<string[]>([]);
watch(sortedComments, async () => {
  if (sortedComments.value.length === 0) {
    commentProfiles.value = [];
    return;
  }

  commentProfiles.value = await Promise.all(
    sortedComments.value.map((comment) =>
      getProfilePicture(comment.user).catch(() => null) // handle errors per request
    ),
  ) as string[];
}, { immediate: true });

const profilePicture = await getProfilePicture(project.value?.user);
const { data: liked } = await useFetch<boolean>(
  `/api/project/${projectId}/liked`,
  {
    headers: useRequestHeaders(["cookie"]),
  },
);

const name = ref("");
watch(project, (newProject) => {
  if (newProject?.name) {
    name.value = newProject.name;
  }
}, { immediate: true });

const description = ref("");
watch(project, (newProject) => {
  if (newProject?.description) {
    description.value = newProject.description;
  }
}, { immediate: true });

const isPrivate = ref(true);
watch(project, (newProject) => {
  if (newProject?.private !== undefined) {
    isPrivate.value = newProject.private;
  }
}, { immediate: true });

const platforms = reactive(
  project.value?.platforms
    .toSorted((a, b) =>
      Object.keys(platformsMap).indexOf(a) -
      Object.keys(platformsMap).indexOf(b)
    ) as (keyof typeof platformsMap)[],
);

const user = await useCurrentUser();

const editing = ref(false);

const projectUpload = useTemplateRef("projectUpload") as Ref<HTMLInputElement>;
const { handleFileInput: handleProjectFileInput, files: projectFiles } =
  useFileStorage({
    clearOldFiles: true,
  });

const thumbnailUpload = useTemplateRef("thumbnailUpload") as Ref<
  HTMLInputElement
>;
const { handleFileInput: handleThumbnailFileInput, files: thumbnailFiles } =
  useFileStorage({
    clearOldFiles: true,
  });

const commentContent = ref("");

const onLike = async () => {
  await $fetch(`/api/project/${projectId}/like`, {
    method: liked.value ? "DELETE" : "POST",
    headers: useRequestHeaders(["cookie"]),
  });

  project.value!.likes += liked.value ? -1 : 1;
  liked.value = !liked.value;
};

const nameInput = useTemplateRef("nameInput") as Ref<HTMLTextAreaElement>;

const resizeNameInput = () => {
  nextTick(() => {
    nameInput.value.style.height = "auto";
    nameInput.value.style.height = `${nameInput.value.scrollHeight}px`;
  });
};

const addOrRemovePlatform = (platform: keyof typeof platformsMap) => {
  if (platforms.includes(platform)) {
    platforms.splice(platforms.indexOf(platform), 1);
    return;
  }
  platforms.push(platform);
  platforms.sort((a, b) =>
    Object.keys(platformsMap).indexOf(a) - Object.keys(platformsMap).indexOf(b)
  );
};

const deleteProject = async () => {
  await $fetch(`/api/project/${projectId}`, {
    method: "DELETE",
    headers: useRequestHeaders(["cookie"]),
  });
  navigateTo("/");
};

const save = async () => {
  await $fetch(`/api/project/${projectId}/edit`, {
    method: "POST",
    headers: useRequestHeaders(["cookie"]),
    body: {
      file: projectFiles.value[0],
      thumbnail: thumbnailFiles.value[0],
      name: name.value,
      description: description.value,
      platforms: platforms,
      private: isPrivate.value,
    },
  });
  editing.value = false;
};

const comment = async () => {
  const commentId = await $fetch(`/api/project/${projectId}/comment`, {
    method: "POST",
    headers: useRequestHeaders(["cookie"]),
    body: commentContent.value,
  });
  project.value!.comments = [...project.value!.comments, {
    id: commentId,
    originalId: commentId,
    user: user.username,
    createdAt: new Date().toString(),
    content: commentContent.value,
    edited: false,
  }];
  commentContent.value = "";
};

// Int that points to the comment ID you're editing (and zero represents not editing)
const editingComment = ref<{id: number, content: string}>({id: 0, content: ""});

const editComment = (comment: {id: number, content: string}) => editingComment.value = {id: comment.id, content: comment.content};
const stopEditingComment = () => editingComment.value = {id:0, content:''};
const saveComment = async () => {
  // exit if no changes made to save wasting server resources
  const original = project.value!.comments.find(
    (c) => c.id === editingComment.value.id
  );
  if (!original || editingComment.value.content === original.content) {
    editingComment.value = {id: 0, content: ""};
    return;
  }

  const res = await $fetch(`/api/project/${projectId}/comment`, {
    method: "PATCH",
    headers: useRequestHeaders(["cookie"]),
    body: {id: editingComment.value.id, originalId: original.originalId, content: editingComment.value.content},
  });

  // using this as an OK response check for now
  if (typeof res === "number") {
    if (original) {
      original.content = editingComment.value.content;
      original.edited = true;
      original.id = res;
    }
    editingComment.value = {id: 0, content: ""};
  }
};

onMounted(() => {
  resizeNameInput();
});

useHead({
  bodyAttrs: {
    class: "project-page",
  },
});

const editorURL = import.meta.dev
  ? "http://localhost:8601"
  : `https://editor.${useRequestURL().hostname}`;

const openEditor = async () => {
  await navigateTo(`${editorURL}/#${projectId}`, { external: true });
};
</script>
<template>
  <div
    class="project-section"
    :class='{ vertical: platforms.includes("turbowarp") }'
  >
    <div class="left">
      <textarea
        v-model="name"
        :disabled="!editing"
        @keydown.enter.prevent
        @input="resizeNameInput"
        ref="nameInput"
        rows="1"
      />
      <div class="platforms" v-if="platforms?.length > 0 || editing">
        <p
          v-for="(name, platform) in platformsMap"
          v-show="platforms.includes(platform) || editing"
        >
          {{ name }} <Icon
            v-if="editing"
            :name='
              platforms.includes(platform)
                ? "ri:close-line"
                : "ri:add-line"
            '
            @click="addOrRemovePlatform(platform)"
          />
        </p>
      </div>
      <p>
        <img :src="profilePicture as string"> By <NuxtLink
          :to="`/user/${project?.user}`"
        >{{ project?.user }}</NuxtLink>

        <div class="options-right">
          <button @click="openEditor" v-if="!editing">
            <Icon name="ri:edit-line" /> Editor
          </button>
          <template v-if="user.loggedIn && user.username == project?.user">
            <button @click="editing = true" v-if="!editing">
              <Icon name="ri:settings-4-line" /> Settings
            </button>
            <template v-else>
              <button @click="isPrivate = !isPrivate">
                <Icon name="ri:user-line" /> {{
                  isPrivate ? "Make Public" : "Make Private"
                }}
              </button>
              <button @click="save">
                <Icon name="ri:save-line" /> Save
              </button>
            </template>
          </template>
        </div>
      </p>
      <iframe
        v-if='platforms.includes("wasm")'
        :src="`https://scratcheverywhere.github.io/ScratchEverywhere/?project_url=${useRequestURL().host}/api/project/${projectId}/download`"
        allowtransparency="true"
        scrolling="no"
        allowfullscreen="true"
      />
      <iframe
        v-else-if='platforms.includes("turbowarp")'
        :src="`${editorURL}/embed.html?addons=gamepad,pause#${projectId}`"
        allowtransparency="true"
        scrolling="no"
        allowfullscreen="true"
      />
      <object
        :data="`/api/project/${projectId}/thumbnail`"
        type="image/png"
        v-else
      >
        <img src="/default-thumbnail.png" />
      </object>
    </div>
    <div class="right">
      <h2>Description</h2>
      <template v-if="project">
        <textarea
          v-if="editing"
          :disabled="!editing"
          v-model="description"
        />
        <MarkdownText :markdown="description" v-else />
      </template>
      <button class="likes" @click="onLike">
        <Icon :name='liked ? "ri:thumb-up-fill" : "ri:thumb-up-line"' /> {{
          project?.likes
        }}
      </button>
      <a
        class="download"
        :href="`/api/project/${projectId}/download`"
        download
        v-if="!editing"
      >
        <Icon name="ri:download-line" />
        Download
      </a>
      <button class="upload" v-if="editing" @click="projectUpload.click()">
        <Icon name="ri:upload-line" /> Upload
      </button>
      <input
        type="file"
        hidden
        ref="projectUpload"
        accept=".sb3"
        @input="handleProjectFileInput"
      />
      <button
        class="thumbnail-upload"
        v-if="editing"
        @click="thumbnailUpload.click()"
      >
        <Icon name="ri:image-line" /> Set Thumbnail
      </button>
      <input
        type="file"
        hidden
        ref="thumbnailUpload"
        accept="image/*"
        @input="handleThumbnailFileInput"
      />
      <button class="delete" v-if="editing" @click="deleteProject">
        <Icon name="ri:delete-bin-line" /> Delete
      </button>
    </div>
  </div>
  <div
    class="comment-section"
    v-if="user.loggedIn || project?.comments.length > 0"
  >
    <template v-if="user.loggedIn">
      <textarea
        name="comment-create-field"
        placeholder="Leave a comment!"
        v-model="commentContent"
        maxlength="500"
        style="font-size: 1rem;"
      />
      <button @click="comment">
        <Icon name="ri:send-plane-fill" /> Comment
      </button>
    </template>

    <div class="comment" v-for="(comment, i) in sortedComments">
      <div class="comment-header">
        <NuxtLink class="comment-profile" :to="`/user/${comment.user}`">
          <img :src="commentProfiles[i]" />
          {{ comment.user }}
        </NuxtLink>

        <button v-if="editingComment.id === 0 && comment.user === user.username" @click="editComment(comment)">
          <Icon id="edit-icon" name="ri:pencil-fill" />
        </button>
      </div>

      <MarkdownText v-if="editingComment.id !== comment.id" :markdown="comment.content" />
      <div id="edit-container" v-else>
        <textarea
          name="comment-edit-field"
          v-model="editingComment.content"
          @keydown.escape="stopEditingComment()"
          maxlength="500"
        />

        <div id="button-spacer">
          <button @click="stopEditingComment()">
            <Icon name="ri:close-fill" /> Cancel
          </button>
          <button @click="saveComment()">
            <Icon name="ri:send-plane-fill" /> Save
          </button>
        </div>
      </div>
      
      <div v-if="editingComment.id !== comment.id">
        <span id="timeago">{{ comment.timeSince }}</span>
        <span id="editedmark" v-if="comment.edited">(edited)</span>
      </div>
    </div>
  </div>
</template>
<style>
body.project-page main {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.comment {
  background: var(--color-background);
  border-radius: 1rem;
  padding: 1rem;
  padding-bottom: 2rem;
  min-height: 12rem;
  position: relative;

  & #timeago, #editedmark {
    position: absolute;
    opacity: 0.5;
    bottom: 1rem;
  }
  & #timeago {
    right: 1rem;
  }
  & #editedmark {
    left: 1rem;
  }

  & #edit-container {
    position: relative;

    & textarea {
      field-sizing: content !important;
      min-height: 6rem;
      height: auto !important;
      max-height: none !important;
      overflow-y: hidden !important;
      resize: none;
      padding: 0.5rem !important;
      margin-bottom: -1rem !important;
      font-size: 1rem;
      background-color: var(--color-secondary-background);
    }

    & #button-spacer {
      position: absolute;
      display: inline-flex;
      bottom: 0;
      right: 1rem;
      gap: 0.5rem;
      pointer-events: auto;
    }

    & #button-spacer button {
      position: relative;
      top: auto;
      right: auto;
    }
  }

  & .comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 1rem;

    & button {
      border: none;
      padding: 0.5rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      position: static;
      border-radius: 100%;

      & #edit-icon {
        position: static;
        opacity: 1;
      }
    }
  }

  & .comment-profile {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1.5ch;
    width: max-content;
  }

  & img {
    height: 3rem;
    width: 3rem;
    border-radius: 0.75rem;
  }
}

.comment-section {
  width: 61rem;
  padding: 1rem;
  border-radius: 1rem;
  background: var(--color-secondary-background);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  & textarea {
    height: 10rem;
    background: var(--color-background);
    width: 100%;
    border: none;
    border-radius: 1rem;
    resize: none;
    padding: 1rem;
  }

  & button {
    background: var(--color-primary);
    font-size: 1rem;
    font-weight: bold;
    border: none;
    padding: 0.5rem;
    border-radius: 1rem;
    right: 2rem;
    top: 8rem;
    position: absolute;
    display: flex;
    align-items: center;
    gap: 0.5ch;
    cursor: pointer;

    & *, & {
      color: var(--color-primary-text);
    }
  }
}

.project-section {
  width: 65rem;
  display: flex;
  gap: 2rem;
  padding: 2rem;

  &.vertical {
    flex-direction: column;

    & .left, & .right {
      width: 100%;
    }

    & .right textarea {
      height: 20rem;
    }

    & .right > div {
      margin-bottom: 3rem;
    }
  }

  & .left {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 50%;

    & .platforms {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;

      & p {
        background: var(--color-secondary-background);
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;

        & span {
          cursor: pointer;
        }
      }
    }

    & > object, & > iframe {
      border-radius: 1rem;
      overflow: hidden;
      aspect-ratio: 480 / 360;
      border: none;

      & * {
        width: 100%;
      }
    }

    & p:has(img) {
      display: flex;
      align-items: center;
      gap: 0.5ch;
      position: relative;

      & img {
        height: 3rem;
        border-radius: 0.75rem;
        margin-right: calc(0.75rem - 0.5ch);
      }

      & .options-right {
        display: flex;
        position: absolute;
        right: 0;
        top: 50%;
        translate: 0 -50%;
        height: 2rem;
        gap: 0.5rem;
        bottom: 1rem;
      }
    }

    & textarea {
      background: none;
      border: none;
      color: var(--color-text);
      font-weight: bold;
      font-size: 2rem;
      cursor: text;
      resize: none;
    }
  }

  & .right {
    background: var(--color-secondary-background);
    padding: 1rem;
    border-radius: 1rem;
    position: relative;
    width: 50%;

    & h2 {
      margin-bottom: 1rem;
    }

    & textarea {
      background: none;
      width: 100%;
      height: calc(100% - 6rem);
      border: none;
      resize: none;
      color: inherit;
      cursor: text;
    }
  }

  & button, & a.download {
    background: var(--color-primary);
    border: none;
    font-size: 1rem;
    padding: 0.5rem;
    border-radius: 1rem;
    display: flex;
    gap: 0.5rem;
    cursor: pointer;
    text-decoration: none;
    font-weight: bold;

    &, & * {
      color: var(--color-primary-text);
    }

    &.likes {
      position: absolute;
      left: 1rem;
    }

    &.download, &.upload, &.thumbnail-upload, &.delete {
      position: absolute;
      right: 1rem;
    }

    &.upload {
      bottom: 3.5rem;
    }

    &.download, &.thumbnail-upload, &.likes {
      bottom: 1rem;
    }

    &.delete {
      bottom: 6rem;
    }
  }
}
</style>
