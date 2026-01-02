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

const submitRole = async () => {
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

  try {
    await $fetch(`/api/user/${formState.targetUsername}/roles`, {
      method: "POST",
      headers: useRequestHeaders(["cookie"]),
      body: {role: formState.selectedRole},
    });
    formState.errorMessage = "";
    formState.successMessage = `Successfully assigned ${formState.selectedRole} role to ${formState.targetUsername}`;
    formState.targetUsername = "";
    formState.selectedRole = "";
  } catch {
    formState.successMessage = "";
    formState.errorMessage = "Failed to assign role";
  } finally {
    formState.isLoading = false;
  }
};

</script>
<template>
  <h1>Admin Panel</h1>

  <section id="user-mod-section">
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
    <button @click="submitRole" :disabled="formState.isLoading">
      <Icon name="ri:send-fill" /> Submit
    </button>
  </section>

  <div v-if="formState.errorMessage" class="message error">
    {{ formState.errorMessage }}
  </div>
  <div v-if="formState.successMessage" class="message success">
    {{ formState.successMessage }}
  </div>
</template>
<style>
  input, select, button {
    padding: 0.25rem;
    border-radius: 0.25rem;
    font-size: 1rem;
  }
  button {
    background-color: cornflowerblue;
  }

  #user-mod-section {
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
    color: #c33;
  }
  .message.success {
    color: #3c3;
  }
</style>