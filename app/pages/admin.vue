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

interface RoleReturn {
  role: string;
  user: string;
  expiresAt: string | null;
}

const allRoles = ref<RoleReturn[]>(await $fetch<RoleReturn[]>("/api/user/roles", {
  method: "GET",
  headers: useRequestHeaders(["cookie"]),
}));

const roleProfiles = ref<string[]>([]);

watch(() => allRoles.value, async () => {
  if (allRoles.value.length === 0) {
    roleProfiles.value = [];
    return;
  }

  roleProfiles.value = await Promise.all(
    allRoles.value.map((r) =>
      getProfilePicture(r.user).catch(() => null) // handle errors per request
    ),
  ) as string[];
}, { immediate: true });

const deleteForm = ref<number | null>(null);
const deleteFormOpen = ref<boolean>(false);
watch (deleteForm, async () => {
  deleteFormOpen.value = deleteForm.value !== null;
});

const createFormOpen = ref<boolean>(false);

const setSelectedRole = (index: number) => {
  const role = allRoles.value[index];
  formState.targetUsername = role!.user;
  formState.selectedRole = role!.role;
  deleteForm.value = index;
};

interface RoleFormState {
  targetUsername: string;
  selectedRole: string;
  isLoading: boolean;
  errorMessage: string;
}

const formState = reactive<RoleFormState>({
  targetUsername: "",
  selectedRole: "",
  isLoading: false,
  errorMessage: "",
});

const submitRole = async (remove: boolean) => {
  formState.errorMessage = "";

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

  let res;
  try {
    res = await $fetch(`/api/user/${formState.targetUsername}/roles`, {
      method: remove ? "DELETE" : "POST",
      headers: useRequestHeaders(["cookie"]),
      body: {role: formState.selectedRole},
    });
    if (res) {
      if (deleteForm.value !== null) {
        allRoles.value.splice(deleteForm.value, 1);
        deleteForm.value = null;
      } else if (createFormOpen.value) {
        // Refetch to get complete data from server
        allRoles.value = await $fetch<RoleReturn[]>("/api/user/roles", {
          method: "GET",
          headers: useRequestHeaders(["cookie"]),
        });
        createFormOpen.value = false;
      }

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

    <section>
      <h3>Active roles</h3>
      <button @click="createFormOpen = true" id="add-button">
        <Icon name="ri:add-fill" style="color: white;" /> Add Role
      </button>
      <div v-for="(role, i) in allRoles" class="role-card">
        <div class="user-details">
          <NuxtLink class="role-profile" :to="`/user/${role.user}`">
            <img :src="roleProfiles[i]" />
            {{ role.user }}
          </NuxtLink>
          <p class="role-text">{{ role.role }}</p>

          <span v-if="role.expiresAt" class="flex-row">
            <p>until</p>
            <p class="role-text">{{
              (() => {
                const date = new Date(role.expiresAt);
                const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
                const day = date.getDate();
                const getDaySuffix = (d: number) => {
                  if (d > 3 && d < 21) return "th";
                  switch (d % 10) {
                    case 1: return "st";
                    case 2: return "nd";
                    case 3: return "rd";
                    default: return "th";
                  }
                };
                const suffix = getDaySuffix(day);
                const month = date.toLocaleDateString(undefined, { month: "long" });
                const year = date.getFullYear();

                let hours = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, "0");
                const ampm = hours >= 12 ? "PM" : "AM";
                hours = hours % 12;
                hours = hours ? hours : 12; // the hour '0' should be '12'

                return `${weekday} ${day}${suffix} ${month} ${year} at ${hours}:${minutes} ${ampm}`;
              })()
            }}</p>
          </span>
        </div>

        <button @click="setSelectedRole(i)">
          <Icon name="ri:delete-bin-line" size="20" style="color: white;" />
        </button>
      </div>
    </section>
  </section>

  <Dialog title="Remove Role" v-model:open="deleteFormOpen" v-on:update:open="deleteForm = null">
    <button @click="submitRole(true)">Confirm</button>
    <p>{{ formState.errorMessage }}</p>
  </Dialog>

  <Dialog title="Add Role" v-model:open="createFormOpen" v-on:update:open="createFormOpen = false">
    <input v-model="formState.targetUsername" />
    <select v-model="formState.selectedRole">
      <option value="banned">Banned</option>
      <option value="admin">Admin</option>
    </select>

    <button @click="submitRole(false)">Create Role</button>
    <p>{{ formState.errorMessage }}</p>
  </Dialog>
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

  .flex-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem 0;
    width: 65rem;
  }

  .role-card {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    border: 0.25rem solid var(--color-secondary-background);
    border-radius: 0.5rem;
    background-color: var(--color-primary-text);
    padding: 1rem;

    & .role-text {
      background-color: var(--color-secondary-background);
      padding: 0.25rem;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      border-radius: 0.25rem;
    }

    & .role-profile {
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      align-items: center;

      & img {
        width: 3rem;
        height: 3rem;
        border-radius: 0.25rem;
      }
    }

    & .user-details {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      
      & p {
        height: fit-content;
      }
    }

    & button {
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      width: 2.5rem;
      height: 2.5rem;
      cursor: pointer;
      border: none;
      background-color: var(--color-error);
    }
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

  #add-button {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    border-radius: 10rem;
    border: none;
    padding: 0.5rem;
    margin-top: 0.75rem;
    color: var(--color-primary-text);
    cursor: pointer;
  }
</style>