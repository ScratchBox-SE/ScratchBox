<script setup lang="ts">
const user = await useCurrentUser();

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
else {
  throw createError({
    statusCode: 401,
    statusMessage: "Unauthorized",
  });
}

if (!userRoles.includes("admin")) {
  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
  });
}

interface RoleFormState {
  targetUsername: string;
  selectedRole: string;
  isLoading: boolean;
  errorMessage: string;
  successMessage: string;
}

const formState = reactive<RoleFormState>({
  targetUsername: "",
  selectedRole: "",
  isLoading: false,
  errorMessage: "",
  successMessage: "",
});

const submitRole = async (remove: boolean) => {
  formState.errorMessage = "";
  formState.successMessage = "";

  if (!formState.targetUsername.trim()) {
    formState.errorMessage = "Please enter a username";
    return;
  }
  if (!formState.selectedRole) {
    formState.errorMessage = "Please select a role";
    return;
  }

  formState.isLoading = true;
  formState.errorMessage = "";
  formState.successMessage = "";

  let res;
  try {
    res = await $fetch(`/api/user/${formState.targetUsername}/roles`, {
      method: remove ? "DELETE" : "POST",
      headers: useRequestHeaders(["cookie"]),
      body: {role: formState.selectedRole},
    });
    if (res) {
      formState.successMessage = `Successfully ${remove ? "removed" : "assigned"} '${formState.selectedRole}' role for ${formState.targetUsername}`;
      formState.targetUsername = "";
      formState.selectedRole = "";
    }
    else {
      formState.errorMessage = remove
        ? `${formState.targetUsername} does not have the '${formState.selectedRole}' role`
        : `Failed to assign role`;
    }
  } catch {
    formState.errorMessage = `Failed to ${remove ? "remove" : "assign"} role`;
  } finally {
    formState.isLoading = false;
  }
};

</script>
<template>
  <section class="container">
    <h1>Admin Panel</h1>

    <h3>Modify roles</h3>
    <section class="user-mod-section">
      <input
        v-model="formState.targetUsername"
        placeholder="Username"
        :disabled="formState.isLoading"
      />
      <select
        v-model="formState.selectedRole"
        :disabled="formState.isLoading"
      >
        <option value="" disabled>Please select</option>
        <option value="admin">Admin</option>
        <option value="banned">Banned</option>
      </select>
      <button @click="submitRole(false)" :disabled="formState.isLoading">
        <Icon name="ri:send-fill" /> Add
      </button>
      <button @click="submitRole(true)" :disabled="formState.isLoading">
        <Icon name="ri:send-fill" /> Remove
      </button>
    </section>

    <div v-if="formState.errorMessage" class="message error">
      {{ formState.errorMessage }}
    </div>
    <div v-if="formState.successMessage" class="message success">
      {{ formState.successMessage }}
    </div>
  </section>
</template>
<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  input, select, option {
    padding: 0.25rem;
    border-radius: 0.25rem;
    font-size: 1rem;
    color: black;
  }
  button {
    padding: 0.25rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    border-radius: 0.25rem;
    font-size: 1rem;
    background-color: var(--color-primary);
    color: var(--color-primary-text);
  }

  .container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem 0;
    width: 65rem;
  }

  .user-mod-section {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .message {
    margin-top: 1rem;
    padding: 0.5rem;
    border-radius: 0.25rem;
  }
  .message.error {
    color: var(--color-error);
  }
  .message.success {
    color: var(--color-success);
  }
</style>