<script setup lang="ts">
const user = await useCurrentUser();

const expiryText = computed(() => {
  if (!user.ban?.expiresAt) return null;
  return new Date(user.ban.expiresAt).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
});
</script>
<template>
  <div class="ban-notice" v-if="user.ban">
    <Icon name="ri:forbid-2-line" size="24" />
    <p>
    Your account has been banned{{ expiryText ? ` until ${expiryText}` : "" }}{{ user.ban.reason ? ` because: "${user.ban.reason}"${["!", ".", "?"].includes(user.ban.reason.at(-1) as string) ? "" : "."}` : "." }}
      You can still browse ScratchBox, but you can't comment, like, or
      create/edit projects while banned.
    </p>
  </div>
</template>
<style>
.ban-notice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--color-error-background);
  color: var(--color-error);
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0.5rem;

  & * {
    color: var(--color-error);
  }

  & p {
    margin: 0;
  }
}
</style>
