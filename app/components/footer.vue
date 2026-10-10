<script setup lang="ts">
const year = new Date().getFullYear();
</script>
<template>
  <footer>
    <div class="content">
      <div class="brand">
        <img src="/scratchbox-logo-full.svg" alt="ScratchBox" />
        <p>
          A project hosting/distribution platform for Scratch Everywhere!
        </p>
      </div>

      <div class="links">
        <div class="group">
          <h3>Community</h3>
          <NuxtLink to="/explore">Explore</NuxtLink>
          <NuxtLink to="/rules">Rules</NuxtLink>
          <NuxtLink to="/terms">Terms of Service</NuxtLink>
        </div>

        <div class="group">
          <h3>Connect</h3>
          <a href="https://github.com/ScratchBox-SE/ScratchBox" target="_blank"
            rel="noopener">
            <Icon name="ri:github-fill" />
            GitHub
          </a>
          <a href="https://discord.gg/Y2gf5vZHpJ" target="_blank"
            rel="noopener">
            <Icon name="ri:discord-fill" />
            Discord
          </a>
          <a href="mailto:scratchbox@grady.link">
            <Icon name="ri:mail-fill" />
            Email
          </a>
        </div>
      </div>
    </div>

    <div class="bottom">
      <p>
        <span class="copyright">&copy;</span>
        {{ year }} ScratchBox. Not affiliated with the Scratch Team.
      </p>
    </div>
  </footer>
</template>
<style>
footer {
  width: 100%;
  margin-top: 3rem;
  background: var(--color-secondary-background);

  & .content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2.5rem 2rem;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 2.5rem;
  }

  & .brand {
    max-width: 22rem;

    & img {
      height: 1.75rem;
      margin-bottom: 0.75rem;
    }

    & p {
      opacity: 0.75;
      font-size: 0.875rem;
      line-height: 1.5;
    }
  }

  & .links {
    display: flex;
    gap: 3rem;
    flex-wrap: wrap;
  }

  & .group {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;

    & h3 {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
      margin-bottom: 0.25rem;
    }

    & a {
      font-size: 0.9rem;
      color: var(--color-text);
      text-decoration: none;
      opacity: 0.85;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: 100ms opacity ease-in-out;

      &:hover,
      &:hover span {
        opacity: 1;
        color: var(--color-primary);
      }
    }
  }

  & .bottom {
    border-top: 1px solid var(--color-blockquote);
    padding: 1rem 2rem;
    text-align: center;

    & p {
      font-size: 0.8rem;
      opacity: 0.6;
    }
  }

  @media (max-width: 640px) {
    & .content {
      flex-direction: column;
      gap: 2rem;
    }

    & .links {
      gap: 2rem;
    }
  }
}

body.theme-dark footer .copyright {
  filter: invert(80%);
}

body.theme-light footer img {
  filter: brightness(0);
}
</style>
