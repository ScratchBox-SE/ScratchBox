<script setup lang="ts">
useHead({
  bodyAttrs: {
    class: "rules-page",
  },
});
</script>
<template>
  <div class="rules">
    <h1>Rules</h1>
    <h2>Be Respectful</h2>
    <p>
      Treat everyone with respect. Absolutely no harassment, witch hunting,
      sexism, racism, or hate speech will be tolerated.
    </p>
    <h2>No NSFW Content</h2>
    <p>
      No age-restricted or obscene content. This includes text, images, or links
      featuring nudity, sex, hard violence, or other graphically disturbing
      content.
    </p>
    <h2>English Only</h2>
    <p>
      Please keep conversations on this site English only. It's perfectly fine
      to use a translator like Google Translate, this just makes moderation
      easier.
    </p>
    <h2>Respect Staff</h2>
    <p>
      We work on this in our free time for free, so please be patient. If we ask
      you a question and you don't give us an answer, don't expect us to help
      you. If we remove or edit your project understand that there was a reason.
    </p>
    <h2>No Bots</h2>
    <p>
      ScratchBox doesn't allow any bots to be used on the site. The API is free
      to use for everyone and the only other reason anyone could possibly need a
      bot is to make spam projects/comments which we don't allow.
    </p>
    <h2>Provide Accurate Information and Give Credit</h2>
    <p>
      Please only provide accurate in descriptions, titles, and supported
      platforms. We also require you to if your project is a modification of
      another, that you link to the original project in the description of your
      project.
    </p>
  </div>
</template>
<style>
body.rules-page main {
  max-width: 1024px;
  display: grid;
  place-content: center;
}

.rules {
  background: var(--color-secondary-background);
  padding: 2rem;
  border-radius: 2rem;

  & h2 {
    margin-bottom: 0.5rem;
    margin-top: 1.5rem;
  }

  & h1 {
    margin-bottom: 2rem;
  }
}
</style>
