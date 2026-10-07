<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  isAdmin: boolean;
  username?: string | null;
}>();

const emit = defineEmits<{
  "update:open": [boolean];
  success: [
    {
      user: string;
      role: string;
      expiresAt: string | null;
      description: string | null;
    },
  ];
}>();

const targetUsername = ref(props.username ?? "");
const selectedRole = ref("banned");
const expiryDate = ref<number | null>(null);
const description = ref("");
const isLoading = ref(false);
const errorMessage = ref("");

watch(() => props.open, (isOpen) => {
  if (!isOpen) return;
  targetUsername.value = props.username ?? "";
  selectedRole.value = "banned";
  expiryDate.value = null;
  description.value = "";
  errorMessage.value = "";
});

const submit = async () => {
  errorMessage.value = "";

  if (!targetUsername.value.trim()) {
    errorMessage.value = "Please enter a username";
    return;
  }
  if (!selectedRole.value) {
    errorMessage.value = "Please select a role";
    return;
  }
  if (
    expiryDate.value && new Date(expiryDate.value).getTime() < Date.now()
  ) {
    errorMessage.value = "Expiry date cannot be in the past";
    return;
  }

  isLoading.value = true;
  try {
    const res = await $fetch(`/api/user/${targetUsername.value}/roles`, {
      method: "POST",
      headers: useRequestHeaders(["cookie"]),
      body: {
        role: selectedRole.value,
        expiresAt: expiryDate.value,
        description: description.value,
      },
    });
    if (res) {
      emit("success", {
        user: targetUsername.value,
        role: selectedRole.value,
        expiresAt: expiryDate.value
          ? new Date(expiryDate.value).toISOString()
          : null,
        description: description.value || null,
      });
      emit("update:open", false);
    } else {
      errorMessage.value = "Failed to assign role";
    }
  } catch {
    errorMessage.value = "Failed to assign role";
  } finally {
    isLoading.value = false;
  }
};
</script>
<template>
  <Dialog
    title="Assign Role"
    :open="open"
    @update:open="$emit('update:open', $event)"
  >
    <template v-if="username">
      <p>
        Target:
        <NuxtLink :to="`/user/${username}`">{{ username }}</NuxtLink>
      </p>
    </template>
    <template v-else>
      <label for="roleDialogUsername">
        Username <span class="required">*</span>
      </label>
      <input id="roleDialogUsername" v-model="targetUsername" />
    </template>

    <label for="roleDialogRole">Role <span class="required">*</span></label>
    <select id="roleDialogRole" v-model="selectedRole">
      <option value="banned">Banned</option>
      <template v-if="isAdmin">
        <option value="moderator">Moderator</option>
        <option value="admin">Admin</option>
      </template>
    </select>

    <label for="roleDialogExpiry">Expires At</label>
    <input id="roleDialogExpiry" type="date" v-model="expiryDate" />
    <label for="roleDialogReason">Reason</label>
    <input id="roleDialogReason" type="text" v-model="description" />
    <button :disabled="isLoading" @click="submit">
      <Icon name="ri:user-settings-line" /> Assign Role
    </button>
    <p class="message error" v-if="errorMessage">{{ errorMessage }}</p>
  </Dialog>
</template>
<style>
.required {
  color: var(--color-error) !important;
}

.message {
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
}
.message.error {
  color: var(--color-error) !important;
  text-align: center;
  background-color: var(--color-error-background);
}
</style>
