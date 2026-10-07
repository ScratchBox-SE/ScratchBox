<script setup lang="ts">
const projectId = useRoute().params.id;

const { data: fetchedProject, error: fetchError } = await useFetch<{
  id: string;
  name: string;
  description: string;
  createdAt: string;
  private: boolean;
  user: string;
  userPicture: string;
  likes: number;
  tags: (keyof typeof tagsMap)[];
  comments: {
    id: number;
    originalId: number;
    parentId: number | null;
    user: string;
    userPicture: string;
    createdAt: string;
    content: string;
    edited: boolean;
    deleted: boolean;
  }[];
}>(`/api/project/${projectId}`);

if (fetchError.value) {
  throw createError(fetchError.value);
}

const project = ref() as typeof fetchedProject;
watch(fetchedProject, (val) => (project.value = val), { immediate: true });

interface CommentNodeData {
  id: number;
  originalId: number;
  parentId: number | null;
  user: string;
  userPicture: string;
  createdAt: string;
  content: string;
  edited: boolean;
  deleted: boolean;
  timeSince: string;
  replies: CommentNodeData[];
}

const commentTree = computed<CommentNodeData[]>(() => {
  if (!project.value?.comments) return [];

  const byOriginalId = new Map<number, CommentNodeData>();
  for (const c of project.value.comments) {
    byOriginalId.set(c.originalId, {
      ...c,
      timeSince: useFormatedTime(new Date(c.createdAt)),
      replies: [],
    });
  }

  const roots: CommentNodeData[] = [];
  for (const node of byOriginalId.values()) {
    const parent = node.parentId != null
      ? byOriginalId.get(node.parentId)
      : undefined;
    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortChildren = (node: CommentNodeData) => {
    node.replies.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    node.replies.forEach(sortChildren);
  };
  roots.forEach(sortChildren);

  roots.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return roots;
});

const { data: liked } = await useFetch<boolean>(
  `/api/project/${projectId}/liked`,
  {
    headers: useRequestHeaders(["cookie"]),
  },
);

const name = ref("");
watch(
  project,
  (newProject) => {
    if (newProject?.name) {
      name.value = newProject.name;
    }
  },
  { immediate: true },
);

const description = ref("");
watch(
  project,
  (newProject) => {
    if (newProject?.description) {
      description.value = newProject.description;
    }
  },
  { immediate: true },
);

const isPrivate = ref(true);
watch(
  project,
  (newProject) => {
    if (newProject?.private !== undefined) {
      isPrivate.value = newProject.private;
    }
  },
  { immediate: true },
);

const tags = reactive(
  project.value?.tags.toSorted(
    (a, b) =>
      Object.keys(tagsMap).indexOf(a) -
      Object.keys(tagsMap).indexOf(b),
  ) as (keyof typeof tagsMap)[],
);

const user = await useCurrentUser();

let userRoles: string[] = [];
if (user.loggedIn) {
  try {
    userRoles = await $fetch(`/api/user/${user.username}/roles`, {
      headers: useRequestHeaders(["cookie"]),
    }) ?? [];
  } catch {}
}
const canModerate = userRoles.includes("admin") ||
  userRoles.includes("moderator");

const isOwner = computed(() =>
  user.loggedIn && user.username === project.value?.user
);
const canModEdit = computed(() => canModerate && !isOwner.value);

const editing = ref(false);
const modEditReason = ref("");
const modEditError = ref("");

const resetEditableFields = () => {
  name.value = project.value?.name ?? "";
  description.value = project.value?.description ?? "";
  tags.splice(
    0,
    tags.length,
    ...(project.value?.tags ?? []).toSorted(
      (a, b) =>
        Object.keys(tagsMap).indexOf(a) - Object.keys(tagsMap).indexOf(b),
    ),
  );
  isPrivate.value = project.value?.private ?? true;
};

const startModEdit = () => {
  editing.value = true;
  modEditReason.value = "";
  modEditError.value = "";
};

const cancelModEdit = () => {
  editing.value = false;
  modEditReason.value = "";
  modEditError.value = "";
  resetEditableFields();
};

const projectUpload = useTemplateRef("projectUpload") as Ref<HTMLInputElement>;
const { handleFileInput: handleProjectFileInput, files: projectFiles } =
  useFileStorage({
    clearOldFiles: true,
  });

const thumbnailUpload = useTemplateRef(
  "thumbnailUpload",
) as Ref<HTMLInputElement>;
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

type ReportTarget = { type: "project" } | { type: "comment"; id: number };

const reportDialogOpen = ref(false);
const reportTarget = ref<ReportTarget | null>(null);
const reportReason = ref("");
const reportError = ref("");
const reportSubmitting = ref(false);
const reportSubmitted = ref(false);

const openReportDialog = (target: ReportTarget) => {
  reportTarget.value = target;
  reportReason.value = "";
  reportError.value = "";
  reportSubmitted.value = false;
  reportDialogOpen.value = true;
};

const submitReport = async () => {
  if (!reportReason.value.trim()) {
    reportError.value = "Please enter a reason";
    return;
  }

  reportSubmitting.value = true;
  reportError.value = "";

  try {
    if (reportTarget.value?.type === "comment") {
      await $fetch(`/api/project/${projectId}/comment/report`, {
        method: "POST",
        headers: useRequestHeaders(["cookie"]),
        body: { id: reportTarget.value.id, reason: reportReason.value },
      });
    } else {
      await $fetch(`/api/project/${projectId}/report`, {
        method: "POST",
        headers: useRequestHeaders(["cookie"]),
        body: { reason: reportReason.value },
      });
    }
    reportSubmitted.value = true;
  } catch (e) {
    reportError.value = (e as { data?: { statusMessage?: string } })?.data
      ?.statusMessage ?? "Failed to submit report";
  } finally {
    reportSubmitting.value = false;
  }
};

const nameInput = useTemplateRef("nameInput") as Ref<HTMLTextAreaElement>;

const resizeNameInput = () => {
  nextTick(() => {
    nameInput.value.style.height = "auto";
    nameInput.value.style.height = `${nameInput.value.scrollHeight}px`;
  });
};

const addOrRemoveTag = (tag: keyof typeof tagsMap) => {
  if (tags.includes(tag)) {
    tags.splice(tags.indexOf(tag), 1);
    return;
  }
  tags.push(tag);
  tags.sort(
    (a, b) =>
      Object.keys(tagsMap).indexOf(a) -
      Object.keys(tagsMap).indexOf(b),
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
  if (canModEdit.value && !modEditReason.value.trim()) {
    modEditError.value = "Please enter a reason";
    return;
  }

  try {
    await $fetch(`/api/project/${projectId}/edit`, {
      method: "POST",
      headers: useRequestHeaders(["cookie"]),
      body: {
        file: projectFiles.value[0],
        thumbnail: thumbnailFiles.value[0],
        name: name.value,
        description: description.value,
        tags: tags,
        private: isPrivate.value,
        reason: canModEdit.value ? modEditReason.value : undefined,
      },
    });
    editing.value = false;
    modEditReason.value = "";
    modEditError.value = "";
  } catch (e) {
    modEditError.value = (e as { data?: { statusMessage?: string } })?.data
      ?.statusMessage ?? "Failed to save";
  }
};

const postComment = async (content: string, parentId: number | null) => {
  const commentId = await $fetch(`/api/project/${projectId}/comment`, {
    method: "POST",
    headers: useRequestHeaders(["cookie"]),
    body: { content, parentId },
  });
  project.value!.comments = [
    ...project.value!.comments,
    {
      id: commentId,
      originalId: commentId,
      parentId,
      user: user.username,
      userPicture: await getProfilePicture(user.username) as string,
      createdAt: new Date().toString(),
      content,
      edited: false,
      deleted: false,
    },
  ];
};

const comment = async () => {
  if (!commentContent.value.trim()) return;
  await postComment(commentContent.value, null);
  commentContent.value = "";
};

const replyingTo = ref<number | null>(null);
const replyContent = ref("");

const startReply = (originalId: number) => {
  replyingTo.value = originalId;
  replyContent.value = "";
};
const cancelReply = () => {
  replyingTo.value = null;
  replyContent.value = "";
};
const submitReply = async () => {
  if (!replyContent.value.trim() || replyingTo.value == null) return;
  await postComment(replyContent.value, replyingTo.value);
  cancelReply();
};

// Int that points to the comment ID you're editing (and zero represents not editing)
const editingComment = ref<{ id: number; content: string }>({
  id: 0,
  content: "",
});

const editComment = (
  comment: { id: number; content: string },
) => (editingComment.value = { id: comment.id, content: comment.content });
const stopEditingComment =
  () => (editingComment.value = { id: 0, content: "" });
const saveComment = async () => {
  // exit if no changes made to save wasting server resources
  const original = project.value!.comments.find(
    (c) => c.id === editingComment.value.id,
  );
  if (!original || editingComment.value.content === original.content) {
    editingComment.value = { id: 0, content: "" };
    return;
  }

  const res = await $fetch(`/api/project/${projectId}/comment`, {
    method: "PATCH",
    headers: useRequestHeaders(["cookie"]),
    body: {
      id: editingComment.value.id,
      originalId: original.originalId,
      content: editingComment.value.content,
    },
  });

  // using this as an OK response check for now
  if (typeof res === "number") {
    if (original) {
      original.content = editingComment.value.content;
      original.edited = true;
      original.id = res;
    }
    editingComment.value = { id: 0, content: "" };
  }
};

const deleteComment = async (comment: { id: number }) => {
  if (!confirm("Delete this comment? This can't be undone.")) return;

  const res = await $fetch(`/api/project/${projectId}/comment`, {
    method: "DELETE",
    headers: useRequestHeaders(["cookie"]),
    body: { id: comment.id },
  });

  // using this as an OK response check for now
  if (typeof res === "number") {
    const original = project.value!.comments.find(
      (c) => c.id === comment.id,
    );
    if (original) {
      original.content = "";
      original.deleted = true;
      original.id = res;
    }
    if (editingComment.value.id === comment.id) {
      editingComment.value = { id: 0, content: "" };
    }
  }
};

interface CommentVersion {
  id: number;
  originalId: number;
  user: string;
  content: string;
  createdAt: string;
  deleted: boolean;
}

const historyOpen = ref(false);
const historyLoading = ref(false);
const historyVersions = ref<CommentVersion[]>([]);

const viewHistory = async (comment: { originalId: number }) => {
  historyOpen.value = true;
  historyLoading.value = true;
  historyVersions.value = [];
  try {
    historyVersions.value = await $fetch<CommentVersion[]>(
      `/api/project/${projectId}/comment/${comment.originalId}/history`,
      { headers: useRequestHeaders(["cookie"]) },
    );
  } finally {
    historyLoading.value = false;
  }
};

interface EditLogEntry {
  editedBy: string;
  reason: string | null;
  createdAt: string;
}

const editLogOpen = ref(false);
const editLogLoading = ref(false);
const editLog = ref<EditLogEntry[]>([]);

const viewEditLog = async () => {
  editLogOpen.value = true;
  editLogLoading.value = true;
  editLog.value = [];
  try {
    editLog.value = await $fetch<EditLogEntry[]>(
      `/api/project/${projectId}/edit-log`,
      { headers: useRequestHeaders(["cookie"]) },
    );
  } finally {
    editLogLoading.value = false;
  }
};

provide("commentContext", {
  user,
  canModerate,
  editingComment,
  editComment,
  stopEditingComment,
  saveComment,
  deleteComment,
  viewHistory,
  openReportDialog,
  replyingTo,
  replyContent,
  startReply,
  cancelReply,
  submitReply,
});

onMounted(() => {
  resizeNameInput();
});

let thumbnail = `/api/project/${projectId}/thumbnail`;
try {
  await $fetch(thumbnail);
} catch {
  thumbnail = "/default-thumbnail.png";
}

useHead({
  title: `${name.value} - ScratchBox`,
  meta: [
    { name: "author", content: project.value?.user },
    { name: "description", content: description.value },
    { property: "og:title", content: name.value },
    { property: "og:description", content: description.value },
    {
      property: "og:image",
      content: computed(() => thumbnail),
    },
    { property: "og:image:type", content: "image/png" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
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
  <div class="project-section">
    <div class="left">
      <!-- this probably should be an h1 with a contenteditable instead -->
      <textarea
        v-model="name"
        :disabled="!editing"
        @keydown.enter.prevent
        @input="resizeNameInput"
        ref="nameInput"
        rows="1"
      />
      <div class="tags" v-if="tags.length > 0 || editing">
        <TagPill
          v-for="(name, tag) in tagsMap"
          v-show="tags.includes(tag) || editing"
          :key="tag"
          :label="name"
          :selected="tags.includes(tag)"
          :interactive="editing"
          @toggle="addOrRemoveTag(tag)"
        />
      </div>
      <div>
        <img :src="project?.userPicture" /> By
        <NuxtLink :to="`/user/${project?.user}`">{{ project?.user }}</NuxtLink>

        <div class="options-right">
          <button @click="openEditor" v-if="!editing">
            <Icon name="ri:edit-line" /> Editor
          </button>
          <button
            v-if="isOwner || canModerate"
            @click="viewEditLog"
          >
            <Icon name="ri:history-line" /> Edit History
          </button>
          <template v-if="isOwner">
            <button @click="editing = true" v-if="!editing">
              <Icon name="ri:settings-4-line" /> Settings
            </button>
            <template v-else>
              <button @click="isPrivate = !isPrivate">
                <Icon name="ri:user-line" />
                {{ isPrivate ? "Make Public" : "Make Private" }}
              </button>
              <button @click="save"><Icon name="ri:save-line" /> Save</button>
            </template>
          </template>
          <template v-else-if="canModEdit">
            <button @click="startModEdit" v-if="!editing">
              <Icon name="ri:edit-2-line" /> Edit (Mod)
            </button>
            <template v-else>
              <button @click="cancelModEdit">
                <Icon name="ri:close-line" /> Cancel
              </button>
              <button @click="save"><Icon name="ri:save-line" /> Save</button>
            </template>
          </template>
          <button
            v-else-if="user.loggedIn && !editing"
            @click="openReportDialog({ type: 'project' })"
          >
            <Icon name="ri:flag-line" /> Report
          </button>
        </div>
      </div>
      <div v-if="canModEdit && editing" class="mod-edit-reason">
        <label for="modEditReason">
          Reason for editing <span class="required">*</span>
        </label>
        <input
          id="modEditReason"
          type="text"
          v-model="modEditReason"
          placeholder="Why are you editing this project?"
        />
      </div>
      <p class="form-error" v-if="editing && modEditError">
        {{ modEditError }}
      </p>
      <iframe
        :src="`https://scratcheverywhere.github.io/ScratchEverywhere/?project_url=${useRequestURL().host}/api/project/${projectId}/download`"
        allowtransparency="true"
        scrolling="no"
        allowfullscreen="true"
      />
    </div>
    <div class="right">
      <div class="inner">
        <h2>Description</h2>
        <template v-if="project">
          <textarea v-if="editing" :disabled="!editing" v-model="description" />
          <MarkdownText :markdown="description" v-else />
        </template>
        <div class="options">
          <button class="likes" @click="onLike">
            <Icon :name='liked ? "ri:thumb-up-fill" : "ri:thumb-up-line"' />
            {{ project?.likes }}
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
          <div v-if="editing && isOwner">
            <button class="upload" @click="projectUpload.click()">
              <Icon name="ri:upload-line" /> Upload
            </button>
            <input
              type="file"
              hidden
              ref="projectUpload"
              accept=".sb3,.sb2,.sb"
              @input="handleProjectFileInput"
            />
            <button class="thumbnail-upload" @click="thumbnailUpload.click()">
              <Icon name="ri:image-line" /> Set Thumbnail
            </button>
            <input
              type="file"
              hidden
              ref="thumbnailUpload"
              accept="image/*"
              @input="handleThumbnailFileInput"
            />
            <button class="delete" @click="deleteProject">
              <Icon name="ri:delete-bin-line" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    class="comment-section"
    v-if="user.loggedIn || project?.comments.length > 0"
  >
    <div class="textarea-container" v-if="user.loggedIn">
      <textarea
        name="comment-create-field"
        placeholder="Leave a comment!"
        v-model="commentContent"
        maxlength="500"
        style="font-size: 1rem"
      />
      <div class="button-spacer">
        <button @click="comment">
          <Icon name="ri:send-plane-fill" /> Comment
        </button>
      </div>
    </div>

    <CommentNode
      v-for="node in commentTree"
      :key="node.id"
      :comment="node"
    />
  </div>

  <Dialog title="Comment History" v-model:open="historyOpen">
    <p v-if="historyLoading">Loading...</p>
    <template v-else>
      <p v-if="historyVersions.length === 0">No history found.</p>
      <div
        v-for="(version, i) in historyVersions"
        :key="version.id"
        class="history-version"
      >
        <div class="history-version-header">
          <span>{{ new Date(version.createdAt).toLocaleString() }}</span>
          <span v-if="i === historyVersions.length - 1" class="badge current">
            Current
          </span>
          <span v-if="version.deleted" class="badge deleted">Deleted</span>
        </div>
        <p v-if="version.deleted" class="deleted-comment">[deleted]</p>
        <MarkdownText v-else :markdown="version.content" />
      </div>
    </template>
  </Dialog>

  <Dialog title="Edit History" v-model:open="editLogOpen">
    <p v-if="editLogLoading">Loading...</p>
    <template v-else>
      <p v-if="editLog.length === 0">No edits yet.</p>
      <div
        v-for="(entry, i) in editLog"
        :key="i"
        class="history-version"
      >
        <div class="history-version-header">
          <span>{{ new Date(entry.createdAt).toLocaleString() }}</span>
        </div>
        <p>
          <NuxtLink
            :to="`/user/${entry.editedBy}`">{{ entry.editedBy }}</NuxtLink>
          <template v-if="entry.reason">: {{ entry.reason }}</template>
        </p>
      </div>
    </template>
  </Dialog>

  <Dialog
    :title="reportTarget?.type === 'comment' ? 'Report Comment' : 'Report Project'"
    v-model:open="reportDialogOpen"
  >
    <template v-if="reportSubmitted">
      <p>Thanks, your report has been submitted for review.</p>
      <button @click="reportDialogOpen = false">Close</button>
    </template>
    <template v-else>
      <label for="reportReason">Reason <span class="required">*</span></label>
      <input
        id="reportReason"
        type="text"
        v-model="reportReason"
        maxlength="500"
        placeholder="Why are you reporting this?"
      />
      <button :disabled="reportSubmitting" @click="submitReport">
        <Icon name="ri:flag-line" /> Submit Report
      </button>
      <p class="form-error" v-if="reportError">{{ reportError }}</p>
    </template>
  </Dialog>
</template>
<style>
body.project-page main {
  min-width: 1024px;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 2rem;
}

.comment {
  background: var(--color-background);
  border-radius: 1rem;
  padding: 1rem;

  & .comment-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  & #timestamp {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    opacity: 0.5;
  }

  & .reply-link {
    cursor: pointer;
    font-weight: bold;
    color: var(--color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  & .replies {
    margin-top: 1rem;
    padding-left: 1rem;
    border-left: 2px solid var(--color-secondary-background);
    display: flex;
    flex-direction: column;
    gap: 1rem;

    & .comment {
      padding-right: 0;
    }
  }

  & .reply-box {
    margin-top: 1rem;
  }

  & > .textarea-container > textarea {
    height: 10rem;
    width: 100%;
    border: none;
    border-radius: 1rem;
    resize: vertical;
    padding: 0.5rem;
    background-color: var(--color-secondary-background);
  }

  & .comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 1rem;

    & .comment-actions {
      display: flex;
      gap: 0.5rem;
    }

    & button {
      border: none;
      padding: 0.5rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      position: static;
      border-radius: 100%;

      & #edit-icon,
      & #delete-icon,
      & #history-icon,
      & #report-icon {
        position: static;
        opacity: 1;
      }
    }
  }

  & .deleted-comment {
    opacity: 0.6;
    font-style: italic;
  }

  & .comment-profile {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1.5ch;
    width: max-content;
    font-weight: bold;
  }

  & img {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
  }
}

.history-version {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-secondary-background);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  & .history-version-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    opacity: 0.7;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  & .badge {
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: bold;

    &.current {
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    &.deleted {
      background: var(--color-error-background);
      color: var(--color-error);
    }
  }
}

.comment-section {
  width: 100%;
  padding: 1rem;
  border-radius: 1rem;
  background: var(--color-secondary-background);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  & > .textarea-container > textarea {
    height: 10rem;
    background: var(--color-background);
    width: 100%;
    border: none;
    border-radius: 1rem;
    resize: vertical;
    padding: 1rem;
  }

  & > button {
    right: 2rem;
    top: calc(100% - 14rem);
    position: absolute;

    & *,
    & {
      color: var(--color-primary-text);
    }
  }
}

.textarea-container {
  position: relative;

  & .button-spacer {
    position: absolute;
    display: inline-flex;
    bottom: 1rem;
    right: 1rem;
    gap: 0.5rem;
    pointer-events: auto;
  }

  & .button-spacer button {
    position: relative;
    top: auto;
    right: auto;
  }
}

.project-section {
  width: 100%;
  display: flex;
  gap: 2rem;

  & .left {
    display: flex;
    flex-direction: column;
    width: 50%;

    & textarea {
      overflow: hidden;
    }

    & .tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }

    & > object,
    & > iframe {
      border-radius: 1rem;
      overflow: hidden;
      aspect-ratio: 480 / 360;
      border: none;

      & * {
        width: 100%;
      }
    }

    & div:has(img) {
      display: flex;
      align-items: center;
      gap: 0.5ch;
      position: relative;
      margin-bottom: 1rem;

      & img {
        width: 2rem;
        height: 2rem;
        border-radius: 0.5rem;
        margin-right: 0.25rem;
      }

      & a {
        font-weight: bold;
      }

      & .options-right {
        display: flex;
        position: absolute;
        right: 0;
        gap: 0.5rem;
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
      margin-bottom: 0.5rem;
    }
  }

  & .right {
    background: var(--color-secondary-background);
    border-radius: 1rem;
    position: relative;
    width: 50%;

    & .inner {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;

      & > * {
        position: static;
      }

      & > textarea {
        background: none;
        width: 100%;
        flex: 1;
        min-height: 0;
        border: none;
        resize: none;
        color: inherit;
        cursor: text;
        padding: 0;
      }

      & > .mdtext {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }

      & > .options {
        display: flex;
        width: 100%;
        flex-shrink: 0;
        justify-content: space-between;

        & div {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }
      }
    }
  }
}

/* FIXME: this needs to be a separate component */
button,
a.download {
  background: var(--color-primary);
  border: none;
  font-size: 0.875rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5ch;
  cursor: pointer;
  text-decoration: none;
  font-weight: bold;

  &,
  & * {
    color: var(--color-primary-text);
  }

  &.likes {
    align-self: flex-end;
  }
}

@media (max-width: 912px) {
  body.project-page main {
    gap: 1rem;
  }

  .project-section {
    width: 100%;
    gap: 1rem;
    flex-direction: column;

    & .left,
    & .right {
      width: 100%;
    }

    & .left > object,
    & .left > iframe {
      aspect-ratio: auto;
      height: auto;
    }

    & .right > .inner {
      position: unset;

      & > textarea {
        height: auto;
        min-height: 10rem;
      }
    }
  }
}

.required {
  color: var(--color-error) !important;
}

.mod-edit-reason {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;

  & input {
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: none;
    background-color: var(--color-secondary-background);
    color: var(--color-text);
  }
}

.form-error {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  color: var(--color-error) !important;
  text-align: center;
  background-color: var(--color-error-background);
}
</style>
