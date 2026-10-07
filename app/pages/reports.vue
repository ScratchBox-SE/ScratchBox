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

if (
  (!userRoles.includes("admin") && !userRoles.includes("moderator")) ||
  userRoles.includes("banned")
) {
  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
  });
}

const isAdmin = userRoles.includes("admin");

interface Report {
  id: number;
  type: "project" | "comment";
  projectId: string;
  projectName: string | null;
  projectOwner: string | null;
  commentId: number | null;
  commentContent: string | null;
  commentDeleted: boolean | null;
  commentAuthor: string | null;
  reporter: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

const targetUser = (report: Report) =>
  report.type === "project" ? report.projectOwner : report.commentAuthor;

const statusFilter = ref<"open" | "resolved" | "dismissed" | "all">("open");

const fetchReports = async () => {
  reports.value = await $fetch<Report[]>("/api/reports", {
    method: "GET",
    headers: useRequestHeaders(["cookie"]),
    query: { status: statusFilter.value },
  });
};

const reports = ref<Report[]>(
  await $fetch<Report[]>("/api/reports", {
    method: "GET",
    headers: useRequestHeaders(["cookie"]),
    query: { status: statusFilter.value },
  }),
);

watch(statusFilter, fetchReports);

const resolving = ref<number | null>(null);

const resolveReport = async (
  report: Report,
  status: "resolved" | "dismissed",
) => {
  resolving.value = report.id;
  try {
    await $fetch(`/api/reports/${report.id}`, {
      method: "PATCH",
      headers: useRequestHeaders(["cookie"]),
      body: { status },
    });
    reports.value = reports.value.filter((r) => r.id !== report.id);
  } finally {
    resolving.value = null;
  }
};

const deletingComment = ref<number | null>(null);

const quickDeleteComment = async (report: Report) => {
  if (!confirm("Delete this comment? This can't be undone.")) return;

  deletingComment.value = report.id;
  try {
    await $fetch(`/api/project/${report.projectId}/comment`, {
      method: "DELETE",
      headers: useRequestHeaders(["cookie"]),
      body: { id: report.commentId },
    });
    await resolveReport(report, "resolved");
  } finally {
    deletingComment.value = null;
  }
};

const deletingProject = ref<number | null>(null);

const quickDeleteProject = async (report: Report) => {
  if (!confirm("Delete this project? This can't be undone.")) return;

  deletingProject.value = report.id;
  try {
    await $fetch(`/api/project/${report.projectId}`, {
      method: "DELETE",
      headers: useRequestHeaders(["cookie"]),
    });
    await resolveReport(report, "resolved");
  } finally {
    deletingProject.value = null;
  }
};

const roleDialogOpen = ref(false);
const roleDialogReport = ref<Report | null>(null);

const openRoleDialog = (report: Report) => {
  roleDialogReport.value = report;
  roleDialogOpen.value = true;
};

const onRoleAssigned = async () => {
  if (roleDialogReport.value) {
    await resolveReport(roleDialogReport.value, "resolved");
  }
};
</script>
<template>
  <section class="container">
    <h1>Reports</h1>

    <select v-model="statusFilter">
      <option value="open">Open</option>
      <option value="resolved">Resolved</option>
      <option value="dismissed">Dismissed</option>
      <option value="all">All</option>
    </select>

    <p v-if="reports.length === 0" class="empty">No reports to show.</p>

    <div v-for="report in reports" :key="report.id" class="report-card">
      <div class="report-header">
        <span class="badge type">{{ report.type }}</span>
        <span
          v-if="report.status !== 'open'"
          class="badge"
          :class="report.status"
        >
          {{ report.status }}
        </span>
        <span
          class="timestamp">{{ new Date(report.createdAt).toLocaleString() }}</span>
      </div>

      <p class="reason">"{{ report.reason }}"</p>
      <p class="meta">
        Reported by
        <NuxtLink :to="`/user/${report.reporter}`">{{ report.reporter }}</NuxtLink>
      </p>

      <div class="target">
        <template v-if="report.type === 'project'">
          <NuxtLink :to="`/project/${report.projectId}`">
            {{ report.projectName ?? "(deleted project)" }}
          </NuxtLink>
        </template>
        <template v-else>
          <p class="comment-snapshot">
            {{
              report.commentContent == null
                ? "(no longer available)"
                : report.commentDeleted
                ? "[deleted]"
                : report.commentContent
            }}
          </p>
          <NuxtLink :to="`/project/${report.projectId}`">
            View on {{ report.projectName ?? "(deleted project)" }}
          </NuxtLink>
        </template>
      </div>

      <p v-if="report.status !== 'open'" class="meta">
        {{ report.status === "resolved" ? "Resolved" : "Dismissed" }} by
        {{ report.resolvedBy }}
        on {{ new Date(report.resolvedAt!).toLocaleString() }}
      </p>

      <div v-else class="report-actions">
        <div class="quick-actions">
          <button
            v-if="targetUser(report)"
            class="quick-action"
            @click="openRoleDialog(report)"
          >
            <Icon name="ri:user-settings-line" /> Assign Role
          </button>
          <button
            v-if="report.type === 'comment' && !report.commentDeleted"
            class="quick-action"
            :disabled="deletingComment === report.id"
            @click="quickDeleteComment(report)"
          >
            <Icon name="ri:delete-bin-line" /> Delete Comment
          </button>
          <button
            v-if="report.type === 'project'"
            class="quick-action"
            :disabled="deletingProject === report.id"
            @click="quickDeleteProject(report)"
          >
            <Icon name="ri:delete-bin-line" /> Delete Project
          </button>
        </div>
        <div class="resolution-actions">
          <button
            :disabled="resolving === report.id"
            @click="resolveReport(report, 'resolved')"
          >
            <Icon name="ri:check-line" /> Resolve
          </button>
          <button
            class="dismiss"
            :disabled="resolving === report.id"
            @click="resolveReport(report, 'dismissed')"
          >
            <Icon name="ri:close-line" /> Dismiss
          </button>
        </div>
      </div>
    </div>
  </section>

  <RoleDialog
    v-model:open="roleDialogOpen"
    :is-admin="isAdmin"
    :username="roleDialogReport ? targetUser(roleDialogReport) : null"
    @success="onRoleAssigned"
  />
</template>
<style>
main {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  width: 100%;
  max-width: 50rem;
}

select {
  align-self: flex-start;
  padding: 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text);
  background-color: var(--color-secondary-background);
  border: none;
}

.empty {
  opacity: 0.6;
  text-align: center;
  margin-top: 1rem;
}

.report-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 0.25rem solid var(--color-secondary-background);
  border-radius: 0.5rem;
  background-color: var(--color-card-background);
  padding: 1rem;

  & .report-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    & .timestamp {
      opacity: 0.6;
      font-size: 0.875rem;
      margin-left: auto;
    }
  }

  & .badge {
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: bold;
    background: var(--color-secondary-background);
    text-transform: capitalize;

    &.type {
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    &.resolved {
      background: var(--color-primary);
      color: var(--color-primary-text);
    }

    &.dismissed {
      background: var(--color-error-background);
      color: var(--color-error);
    }
  }

  & .reason {
    font-weight: bold;
  }

  & .meta {
    opacity: 0.7;
    font-size: 0.875rem;
  }

  & .target {
    background: var(--color-secondary-background);
    border-radius: 0.5rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    & .comment-snapshot {
      white-space: pre-line;
      word-wrap: break-word;
    }
  }

  & .report-actions {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;

    & .quick-actions,
    & .resolution-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    & button {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      font-weight: bold;
      background: var(--color-primary);
      color: var(--color-primary-text);

      & * {
        color: inherit !important;
      }

      &.dismiss {
        background: var(--color-error);
        color: var(--color-primary-text);
      }

      &.quick-action {
        background: var(--color-secondary-background);
        color: var(--color-text);
      }
    }
  }
}
</style>
