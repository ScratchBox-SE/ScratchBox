<script setup lang="ts">
useHead({
  title: "Terms of Service - ScratchBox",
  bodyAttrs: {
    class: "terms-page",
  },
});
</script>
<template>
  <div class="terms">
    <h1>Terms of Service</h1>
    <p class="updated">Last updated: October 10, 2026</p>

    <p>
      ScratchBox is a project hosting and distribution platform for
      <em>Scratch Everywhere!</em>, run on a volunteer, best-effort basis. By
      creating an account or otherwise using ScratchBox, you agree to these
      Terms of Service. If you don't agree with them, please don't use the
      site.
    </p>

    <h2>1. Eligibility</h2>
    <p>
      You must have an account on scratch.mit.edu to use ScratchBox, since
      that's how we verify who you are. If you're not old enough to agree to
      Scratch's own terms of use, you're not old enough to agree to ours
      either.
    </p>

    <h2>2. How Your Account Works</h2>
    <p>
      ScratchBox does not have its own passwords. Instead, we verify your
      identity with our own comment-verification system: we generate a
      one-time code and ask you to post it as a comment on a specific
      Scratch project from your Scratch account. Once we see that comment,
      we know you control that Scratch username, and we sign you in as that
      username.
    </p>
    <p>
      We never see or store your Scratch password. The login code itself is
      temporary and automatically deleted once it's used or after 5 minutes,
      whichever comes first. Signing in sets a session cookie that keeps you
      logged in for up to 14 days.
    </p>
    <p>
      You're responsible for anything that happens under your Scratch
      username while logged into ScratchBox, the same way you'd be
      responsible for your own Scratch account.
    </p>

    <h2>3. Your Content</h2>
    <p>
      When you upload a project (<code>.sb</code>, <code>.sb2</code>, or
      <code>.sb3</code> file), write a description, post a comment, or
      upload a thumbnail, you still own that content. By submitting it to
      ScratchBox, you give us a non-exclusive, worldwide license to host,
      store, display, and distribute it through the site and its API for as
      long as it stays on ScratchBox, so that other people can view, play,
      and download it.
    </p>
    <p>
      You're responsible for what you upload or post. Don't submit anything
      you don't have the right to share, and if your project is a
      modification of someone else's work, credit the original per our
      <NuxtLink to="/rules">Rules</NuxtLink>.
    </p>
    <p>
      Projects are private by default when first uploaded; it's on you to
      make a project public (and to understand that anything you mark
      public, or any comment you post, is visible to anyone who visits the
      site or uses the API).
    </p>

    <h2>4. Acceptable Use</h2>
    <p>
      Using ScratchBox also means following our
      <NuxtLink to="/rules">Rules</NuxtLink>, which cover things like
      harassment, NSFW content, bots/spam, and giving credit. We reserve the
      right to edit, remove, or restrict access to any project, comment, or
      account that violates these Terms, our Rules, or applicable law, at
      our discretion and without prior notice.
    </p>
    <p>
      Don't attempt to disrupt the service (e.g. abusive automated traffic),
      circumvent moderation or bans, or use the API to do anything you
      couldn't do through the normal site.
    </p>

    <h2>5. Moderation</h2>
    <p>
      Projects and comments can be reported by any user. Admins and
      moderators may review reports, edit project info (they are required to
      give a reason, which is kept in a visible edit log), remove content, or
      suspend/ban accounts for violations. Comment edits are not destructive
      - we keep prior versions of an edited comment so moderators can review
      comment history.
    </p>
    <p>
      A ban may be temporary or permanent, and may be accompanied by a
      reason that's shown to you and to moderators. A banned account can
      still browse ScratchBox but can't upload, comment, like, or edit
      projects while the ban is active.
    </p>

    <h2>6. What Data We Store</h2>
    <p>
      We only store information about things you actually do on ScratchBox.
      There is no analytics, telemetry, or tracking of any kind on this
      site - we don't log your visits, page views, IP address, device
      info, or browsing behavior. If you log in and never upload a project,
      post a comment, like something, or otherwise interact with the site,
      <strong>
        no record of you is stored on our servers at all
      </strong>. Your session simply lives in a cookie in your own browser;
      nothing is written to our database until you create something.
    </p>
    <p>Once you do start creating or interacting, here's what gets stored, and only for that:</p>
    <ul>
      <li>
        <strong>Projects you upload</strong>: the project file itself,
        generated thumbnails, and metadata like name, description, tags,
        and whether it's public or private, tagged with your Scratch
        username as the owner.
      </li>
      <li>
        <strong>Activity tied to your username</strong>: likes, comments
        (and prior versions of edited comments), and reports you file or
        that are filed against your content.
      </li>
      <li>
        <strong>Moderation records</strong>, but only if they apply to you:
        roles (such as moderator, admin, or banned), ban reasons/expirations,
        and a log of any moderator edits made to project info.
      </li>
      <li>
        A short-lived login code during sign-in, which is deleted
        automatically once used or after it expires - this is temporary and
        isn't tied to your username until you successfully verify.
      </li>
    </ul>
    <p>
      We never collect or store your email address or password - your
      Scratch password never touches our servers. Your profile picture
      shown on ScratchBox is fetched live from Scratch's own servers using
      your username - we don't keep a copy of it.
    </p>
    <p>
      We don't sell your data, and we don't share it with third parties
      except as described here (e.g. a self-hosted ScratchBox instance's
      operator can access its own database) or as required by law.
    </p>

    <h2>7. Third-Party Services</h2>
    <p>
      Signing in and displaying profile pictures relies on the public
      scratch.mit.edu API, which is operated by the Scratch Team, not us.
      Your use of Scratch itself is governed by
      <a href="https://scratch.mit.edu/terms_of_use" target="_blank"
      >Scratch's own Terms of Use</a>.
    </p>

    <h2>8. Account Termination</h2>
    <p>
      You may stop using ScratchBox at any time. We may suspend or terminate
      your access, or remove your content, if you violate these Terms or our
      Rules. You can ask us to delete your account and associated content by
      contacting the instance's operator/admin team; we'll remove what we
      reasonably can, though some records (like moderation logs) may be
      retained for accountability.
    </p>

    <h2>9. No Warranty</h2>
    <p>
      ScratchBox is provided "as is," developed and maintained on a
      volunteer basis, without warranties of any kind, express or implied.
      We don't guarantee the site will be available, error-free, or that
      uploaded content will never be lost - please keep your own backups of
      anything important. To the fullest extent permitted by law, we are not
      liable for any damages arising from your use of, or inability to use,
      ScratchBox.
    </p>

    <h2>10. Changes to These Terms</h2>
    <p>
      We may update these Terms as the site evolves. Continued use of
      ScratchBox after changes are posted means you accept the revised
      Terms. If a change is significant, we'll try to make that visible on
      the site.
    </p>

    <h2>11. Contact</h2>
    <p>
      Questions about these Terms, moderation decisions, or your data can be
      directed to the admin team of the ScratchBox instance you're using.
    </p>
  </div>
</template>
<style>
body.terms-page main {
  max-width: 1024px;
  display: grid;
  place-content: center;
}

.terms {
  background: var(--color-secondary-background);
  padding: 2rem;
  border-radius: 2rem;
  max-width: 960px;

  & h2 {
    margin-bottom: 0.5rem;
    margin-top: 1.5rem;
  }

  & h1 {
    margin-bottom: 0.5rem;
  }

  & .updated {
    opacity: 0.7;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  & ul {
    margin: 1rem 0 1rem 1.25rem;

    & li {
      margin-bottom: 0.5rem;
    }
  }

  & code {
    background: rgba(0, 0, 0, 0.125);
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
  }
}
</style>
