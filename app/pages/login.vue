<script setup lang="ts">
useHead({
  title: "Log In - ScratchBox",
  bodyAttrs: {
    class: "login-page",
  },
});

const route = useRoute();
const redirect = (route.query.redirect as string) || "/";

const status = ref<"loading" | "waiting" | "expired" | "error" | "success">(
  "loading",
);
const publicCode = ref("");
const projectId = ref<string>();
const privateCode = ref("");
const copied = ref(false);

let pollTimer: ReturnType<typeof setInterval> | undefined;
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

const copyCode = async () => {
  await navigator.clipboard.writeText(publicCode.value);
  copied.value = true;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = false), 2000);
};

const start = async () => {
  status.value = "loading";
  try {
    const data = await $fetch("/api/auth/start", { method: "POST" });
    publicCode.value = data.publicCode;
    projectId.value = data.projectId;
    privateCode.value = data.privateCode;
    status.value = "waiting";
    poll();
  } catch {
    status.value = "error";
  }
};

const poll = () => {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const data = await $fetch("/api/auth/status", {
        query: { privateCode: privateCode.value },
      });
      if (data.valid) {
        clearInterval(pollTimer);
        status.value = "success";
        // Force a full page load so the new SB_TOKEN cookie is picked up
        // by useCurrentUser() (client-side navigation would keep serving
        // the cached logged-out state).
        window.location.href = redirect;
      } else if (data.expired) {
        clearInterval(pollTimer);
        status.value = "expired";
      }
    } catch {
      // transient errors while polling are ignored, just try again
    }
  }, 4000);
};

onMounted(start);
onUnmounted(() => {
  clearInterval(pollTimer);
  clearTimeout(copiedTimer);
});
</script>
<template>
  <div class="login">
    <h1>Log In with Scratch</h1>

    <template v-if="status === 'loading'">
      <p>Setting things up...</p>
    </template>

    <template v-else-if="status === 'waiting'">
      <ol>
        <li>
          Open
          <a
            :href="`https://scratch.mit.edu/projects/${projectId}/`"
            target="_blank"
          >this Scratch project</a>
          (you'll need to be logged in to Scratch).
        </li>
        <li>Post a comment on the project containing exactly this code:</li>
      </ol>
      <p class="code">
        <span>{{ publicCode }}</span>
        <button
          class="copy"
          type="button"
          :title="copied ? 'Copied!' : 'Copy code'"
          @click="copyCode"
        >
          <Icon :name="copied ? 'ri:check-line' : 'ri:file-copy-line'" />
        </button>
      </p>
      <p class="hint">
        We'll detect your comment automatically, usually within a few
        seconds. This page will redirect you once it's found.
      </p>
    </template>

    <template v-else-if="status === 'expired'">
      <p>This code expired before we saw your comment.</p>
      <button @click="start">Try Again</button>
    </template>

    <template v-else-if="status === 'error'">
      <p>Something went wrong starting the login process.</p>
      <button @click="start">Try Again</button>
    </template>
  </div>
</template>
<style>
body.login-page main {
  max-width: 640px;
  display: grid;
  place-content: center;
}

.login {
  background: var(--color-secondary-background);
  padding: 2rem;
  border-radius: 2rem;
  text-align: center;

  & h1 {
    margin-bottom: 1rem;
  }

  & ol {
    text-align: left;
    margin: 0 auto 1rem;
    max-width: 480px;
  }

  & .code {
    font-family: monospace;
    font-size: 1.5rem;
    font-weight: bold;
    background: var(--color-primary);
    color: var(--color-primary-text);
    padding: 0.75rem 1rem;
    border-radius: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    letter-spacing: 0.05em;

    & span {
      color: var(--color-primary-text);
      word-break: break-all;
    }

    & .copy {
      margin: 0;
      flex-shrink: 0;
      padding: 0.25rem;
      background: none;
      color: inherit;
      font-size: 1.1rem;
      line-height: 1;

      &:hover {
        opacity: 0.7;
      }

      &:active {
        opacity: 0.5;
      }
    }
  }

  & .hint {
    margin-top: 1rem;
    opacity: 0.8;
    font-size: 0.9rem;
  }

  & button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 1rem;
    padding: 0.5rem 0.875rem;
    border: none;
    border-radius: 0.5rem;
    background-color: var(--color-primary);
    color: var(--color-primary-text);
    font-size: 0.9rem;
    font-weight: bold;
    cursor: pointer;
    transition: 100ms opacity ease-in-out;

    &:hover {
      opacity: 0.85;
    }

    &:active {
      opacity: 0.7;
    }
  }
}
</style>
