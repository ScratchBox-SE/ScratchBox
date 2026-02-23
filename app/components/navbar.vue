<script setup lang="ts">
const authRedirect = btoa(`${useRequestURL().origin}/api/auth`);

const user = await useCurrentUser();
const profilePicture = await getProfilePicture(user?.username);

const upload = useTemplateRef("upload") as Ref<HTMLInputElement>;
const { handleFileInput, files } = useFileStorage({ clearOldFiles: false });

const search = ref(useRoute().query.q || "");

const { currentTheme, toggleTheme } = useTheme();

const onUpload = async (e: Event) => {
  await handleFileInput(e);
  await navigateTo(
    `/project/${await $fetch("/api/upload", {
      method: "POST",
      body: files.value[0],
    })}`,
  );
};

const editorURL = import.meta.dev
  ? "http://localhost:8601"
  : `https://editor.${useRequestURL().hostname}`;

const createDialogOpen = ref(false);
const createProjectName = ref("");

const createProject = async () => {
  await navigateTo(
    `${editorURL}/#${await $fetch("/api/create", {
      method: "POST",
      body: { name: createProjectName.value },
    })}`,
    { external: true },
  );
};

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

const isDropdownOpen = ref(false);
const dropdownRef = useTemplateRef("dropdownRef");

const isMenuOpen = ref(false);
const mobileMenuRef = useTemplateRef("mobileMenuRef");

const isMobileDropdownOpen = ref(false);

const closeIfClickedOutside = (event: Event) => {
  if (
    dropdownRef.value &&
    !dropdownRef.value.contains(event.target as HTMLElement)
  ) {
    isDropdownOpen.value = false;
  }

  if (
    mobileMenuRef.value &&
    !mobileMenuRef.value.contains(event.target as HTMLElement)
  ) {
    isMenuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", closeIfClickedOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", closeIfClickedOutside);
});
</script>
<template>
  <nav>
    <!-- FIXME: combine all of this mess somehow -->
    <div class="desktop">
      <NuxtLink to="/"><img src="/scratchbox-logo-full.svg" alt="ScratchBox" />
      </NuxtLink>
      <ClientOnly>
        <a href="javascript:void(0);" @click="toggleTheme">
          <Icon v-if='currentTheme === "light"' name="ri:moon-fill" />
          <Icon v-else name="ri:sun-line" />
        </a>
      </ClientOnly>
      <template v-if="user.loggedIn">
        <a href="javascript:void(0);" @click="createDialogOpen = true"
        >Create</a>
      </template>
      <NuxtLink v-else :to="editorURL">Create</NuxtLink>
      <NuxtLink to="/explore">Explore</NuxtLink>
      <NuxtLink v-if='userRoles.includes("admin")' to="/admin"
      >Moderate</NuxtLink>
      <input
        type="search"
        placeholder="Search..."
        v-model="search"
        @keyup.enter='navigateTo({ path: "/search", query: { q: search } })'
      />
      <div
        ref="dropdownRef"
        id="user-dropdown"
        class="dropdown"
        v-if="user.loggedIn"
      >
        <a
          href="javascript:void(0);"
          @click="isDropdownOpen = !isDropdownOpen"
          :class="{ active: isDropdownOpen }"
        >
          <img :src="profilePicture as string" class="avatar" />
          <span>{{ user?.username }}</span>
          <Icon name="ri:arrow-down-s-fill" />
        </a>
        <Transition name="fade">
          <div v-if="isDropdownOpen">
            <a href="javascript:void(0);" @click="upload.click()">Upload</a>
            <NuxtLink :to="`/user/${user.username}`">Profile</NuxtLink>
            <a href="/api/auth/logout">Log Out</a>
          </div>
        </Transition>
      </div>
      <NuxtLink
        :to="`https://auth.itinerary.eu.org/auth/?redirect=${authRedirect}&name=ScratchBox`"
        target="_blank"
        v-else
      >Log In</NuxtLink>
    </div>
    <div class="mobile" ref="mobileMenuRef">
      <div class="bar">
        <NuxtLink to="/"><img
            src="/scratchbox-logo-full.svg"
            alt="ScratchBox"
          />
        </NuxtLink>
        <div class="menu-buttons">
          <ClientOnly>
            <a href="javascript:void(0);" @click="toggleTheme">
              <Icon v-if='currentTheme === "light"' name="ri:moon-fill" />
              <Icon v-else name="ri:sun-line" />
            </a>
          </ClientOnly>
          <a href="javascript:void(0);" @click="isMenuOpen = !isMenuOpen">
            <Icon v-if="isMenuOpen" name="ri:close-large-fill" />
            <Icon v-else name="ri:menu-fill" />
          </a>
        </div>
      </div>
      <Transition name="fade">
        <div class="items" v-if="isMenuOpen">
          <input
            type="search"
            placeholder="Search..."
            v-model="search"
            @keyup.enter='navigateTo({ path: "/search", query: { q: search } })'
          />
          <template v-if="user.loggedIn">
            <a href="javascript:void(0);" @click="createDialogOpen = true"
            >Create</a>
          </template>
          <NuxtLink v-else :to="editorURL">Create</NuxtLink>
          <NuxtLink to="/explore">Explore</NuxtLink>
          <NuxtLink v-if='userRoles.includes("admin")' to="/admin"
          >Moderate</NuxtLink>
          <div class="dropdown" v-if="user.loggedIn">
            <a
              href="javascript:void(0);"
              @click="isMobileDropdownOpen = !isMobileDropdownOpen"
              :class="{ active: isMobileDropdownOpen }"
            >
              <img :src="profilePicture as string" class="avatar" />
              <span>{{ user?.username }}</span>
              <Icon name="ri:arrow-down-s-fill" />
            </a>
            <Transition name="fade">
              <div v-if="isMobileDropdownOpen">
                <a href="javascript:void(0);" @click="upload.click()">Upload</a>
                <NuxtLink :to="`/user/${user.username}`">Profile</NuxtLink>
                <a href="/api/auth/logout">Log Out</a>
              </div>
            </Transition>
          </div>
          <NuxtLink
            :to="`https://auth.itinerary.eu.org/auth/?redirect=${authRedirect}&name=ScratchBox`"
            target="_blank"
            v-else
          >Log In</NuxtLink>
        </div>
      </Transition>
    </div>
    <Dialog title="Create Project" v-model:open="createDialogOpen">
      <input
        type="text"
        placeholder="Project Name..."
        v-model="createProjectName"
      />
      <button @click="createProject">Create</button>
    </Dialog>
    <input type="file" hidden ref="upload" accept=".sb3" @input="onUpload" />
  </nav>
</template>
<style>
/* FIXME: clean up the css as well */

.dropdown {
  position: relative;
  flex-shrink: 0;

  & > div {
    width: 100%;
    min-width: 6rem;
    right: 0;
    position: absolute;
    background-color: var(--color-primary);
    border-radius: 0 0 0.5rem 0.5rem;
    box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.125);

    & > a {
      height: 2.5rem;
      font-weight: unset;
    }
  }
}

nav {
  display: flex;
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 100;

  & .desktop,
  & .mobile > .bar,
  & .mobile > .bar > .menu-buttons,
  & .mobile > .items {
    display: flex;
    background: var(--color-primary);
  }

  & .mobile {
    position: relative;
  }

  & .mobile > .bar {
    width: 100%;
    justify-content: space-between;
  }

  & .mobile > items {
    position: absolute;
  }

  & .mobile,
  & .mobile > .items {
    flex-direction: column;
  }

  & .desktop,
  & .mobile > .bar {
    height: 3rem;
  }

  & .mobile > .bar > .menu-buttons > * {
    width: 3rem;
    height: 3rem;
  }

  & .mobile > .items > *:not(input) {
    height: 2.5rem;
  }

  &,
  & .desktop,
  & .mobile,
  & .mobile > .items {
    width: 100%;
    justify-content: center;

    & > input {
      font-size: 0.875rem;
      background: rgba(0, 0, 0, 0.125);
      color: var(--color-primary-text);
      border: none;
      outline: none;
      margin: 0.5rem;
      padding: 0.5rem;
      border-radius: 0.5rem;
      width: 100%;
      max-width: 25rem;
      transition: 50ms background ease-in-out;

      &::placeholder {
        color: var(--color-primary-text);
        opacity: 50%;
      }

      &:active,
      &:focus {
        background: rgba(0, 0, 0, 0.25);
      }
    }
  }

  & .mobile > .items > input {
    margin: 0.5rem 0.75rem;
    padding: 0.5rem 0.75rem;
    width: calc(100% - 1.5rem);
    max-width: unset;
  }

  & .mobile > .items > .dropdown > div {
    border-radius: 0;
    box-shadow: unset;

    & > a {
      height: 2rem;
      padding: 1rem 3rem;
    }
  }

  & img {
    height: 1.6rem;
  }

  & * {
    color: var(--color-primary-text);
  }

  & a {
    padding: 1rem;
    font-weight: bold;
    font-size: 0.875rem;
    text-decoration: none;
    display: flex;
    align-items: center;
    height: 100%;
    color: var(--color-primary-text);
    transition: 50ms background ease-in-out;
    gap: 0.5rem;

    &:hover,
    &.active {
      background: rgba(0, 0, 0, 0.125);
    }

    & img.avatar {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 0.5rem;
    }
  }

  & .mobile {
    display: none;
  }

  @media (max-width: 640px) {
    & .desktop {
      display: none;
    }

    & .mobile {
      display: flex;
    }
  }
}

@media (max-width: 800px) {
  #user-dropdown a > span:not(.iconify) {
    display: none;
  }
}
</style>
