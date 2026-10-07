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
} else {
  throw createError({
    statusCode: 401,
    statusMessage: "Unauthorized",
  });
}

if (!userRoles.includes("admin") && !userRoles.includes("moderator")) {
  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
  });
}

const isAdmin = userRoles.includes("admin");

const isElevatedUser = (username: string) =>
  allRoles.value.some(
    (r) => r.user === username && ["admin", "moderator"].includes(r.role),
  );

interface RoleReturn {
  role: string;
  user: string;
  expiresAt: string | null;
  description: string | null;
}

const allRoles = ref<RoleReturn[]>(
  await $fetch<RoleReturn[]>("/api/user/roles", {
    method: "GET",
    headers: useRequestHeaders(["cookie"]),
  }),
);

const roleProfiles = ref<string[]>([]);

watch(() => allRoles.value, async () => {
  if (allRoles.value.length === 0) {
    roleProfiles.value = [];
    return;
  }

  roleProfiles.value = await Promise.all(
    allRoles.value.map((r) => getProfilePicture(r.user).catch(() => null) // handle errors per request
    ),
  ) as string[];
}, { immediate: true });

const createFormOpen = ref(false);

const onRoleAssigned = async (role: RoleReturn) => {
  const existingIndex = allRoles.value.findIndex(
    (r) => r.user === role.user && r.role === role.role,
  );
  if (existingIndex !== -1) {
    allRoles.value[existingIndex] = role;
    return;
  }

  allRoles.value.push(role);
  const profilePic = await getProfilePicture(role.user).catch(() => null);
  roleProfiles.value.push(profilePic as string);
};

const deleteForm = ref<{ index: number; user: string; role: string } | null>(
  null,
);
const deleteFormOpen = ref(false);
const deleteLoading = ref(false);
const deleteError = ref("");

watch(deleteForm, () => {
  deleteFormOpen.value = deleteForm.value !== null;
  deleteError.value = "";
});

const setSelectedRole = (index: number) => {
  const role = allRoles.value[index]!;
  deleteForm.value = { index, user: role.user, role: role.role };
};

const confirmRemoveRole = async () => {
  if (!deleteForm.value) return;

  deleteLoading.value = true;
  try {
    const res = await $fetch(`/api/user/${deleteForm.value.user}/roles`, {
      method: "DELETE",
      headers: useRequestHeaders(["cookie"]),
      body: { role: deleteForm.value.role },
    });
    if (res) {
      allRoles.value.splice(deleteForm.value.index, 1);
      roleProfiles.value.splice(deleteForm.value.index, 1);
      deleteForm.value = null;
    } else {
      deleteError.value =
        `${deleteForm.value.user} does not have the '${deleteForm.value.role}' role`;
    }
  } catch {
    deleteError.value = "Failed to remove role";
  } finally {
    deleteLoading.value = false;
  }
};

const isSmallScreen = ref(false);

if (import.meta.client) {
  const updateScreenSize = () => {
    isSmallScreen.value = window.innerWidth < 480;
  };

  onMounted(() => {
    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", updateScreenSize);
  });
}

const formatExpiryDate = computed(() => {
  return (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const getDaySuffix = (d: number) => {
      if (d > 3 && d < 21) return "th";
      switch (d % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };
    const month = isSmallScreen.value
      ? date.toLocaleDateString(undefined, { month: "short" })
      : date.toLocaleDateString(undefined, { month: "long" });
    const year = date.getFullYear();
    const hours = date.getHours() % 12 || 12;
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = date.getHours() >= 12 ? "PM" : "AM";

    return `${day}${
      getDaySuffix(day)
    } ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  };
});
</script>
<template>
  <section class="container">
    <h1>Moderation Panel</h1>

    <section>
      <h3>Active roles</h3>
      <button @click="createFormOpen = true" id="add-button">
        <Icon name="ri:add-fill" style="color: white" /> Add Role
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
            <p class="role-text">{{ formatExpiryDate(role.expiresAt) }}</p>
          </span>

          <span v-if="role.description" class="flex-row">
            <p>due to</p>
            <p class="role-text">{{ role.description }}</p>
          </span>
        </div>

        <button
          v-if='
            !(role.user == user.username && role.role == "admin") &&
            (isAdmin || !isElevatedUser(role.user))
          '
          @click="setSelectedRole(i)"
        >
          <Icon name="ri:delete-bin-line" size="20" style="color: white" />
        </button>
      </div>
    </section>
  </section>

  <Dialog
    title="Remove Role"
    v-model:open="deleteFormOpen"
    v-on:update:open="(open) => { if (!open) deleteForm = null; }"
  >
    <button :disabled="deleteLoading" @click="confirmRemoveRole">
      Confirm
    </button>
    <p class="message error" v-if="deleteError">
      {{ deleteError }}
    </p>
  </Dialog>

  <RoleDialog
    v-model:open="createFormOpen"
    :is-admin="isAdmin"
    @success="onRoleAssigned"
  />
</template>
<style>
main {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  padding: 1rem;
  width: 100%;
  max-width: 65rem;
}

.role-card {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  border: 0.25rem solid var(--color-secondary-background);
  border-radius: 0.5rem;
  background-color: var(--color-card-background);
  padding: 1rem;
  position: relative;

  & .role-text {
    background-color: var(--color-secondary-background);
    padding: 0.25rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    border-radius: 0.25rem;
    white-space: nowrap;
  }

  & .role-profile {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
    white-space: nowrap;

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
    flex: 1;
    min-width: 0;

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
    flex-shrink: 0;
    margin-left: 1rem;
  }
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

@media (max-width: 912px) {
  .container {
    padding: 0.5rem;
  }

  .role-card {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    & .user-details {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      flex: 1;
      min-width: 0;

      & > .role-profile {
        flex-shrink: 0;
      }

      & > .role-text {
        flex-shrink: 0;
      }

      & > .flex-row {
        flex-basis: 100%;
        margin-top: 0.25rem;
        width: 100%;
      }
    }

    & button {
      position: static;
      margin-left: 1rem;
    }
  }
}
</style>
