<script setup lang="ts">
interface CommentData {
  id: number;
  originalId: number;
  parentId: number | null;
  user: string;
  userPicture: string;
  createdAt: string;
  content: string;
  edited: boolean;
  deleted: boolean;
  timeSince: string;
  replies: CommentData[];
}

interface CommentContext {
  user: { loggedIn: boolean; username: string };
  canModerate: boolean;
  editingComment: Ref<{ id: number; content: string }>;
  editComment: (comment: { id: number; content: string }) => void;
  stopEditingComment: () => void;
  saveComment: () => Promise<void>;
  deleteComment: (comment: { id: number }) => Promise<void>;
  viewHistory: (comment: { originalId: number }) => Promise<void>;
  openReportDialog: (target: { type: "comment"; id: number }) => void;
  replyingTo: Ref<number | null>;
  replyContent: Ref<string>;
  startReply: (originalId: number) => void;
  cancelReply: () => void;
  submitReply: () => Promise<void>;
}

defineProps<{ comment: CommentData }>();

const ctx = inject<CommentContext>("commentContext")!;
</script>

<template>
  <div class="comment">
    <div class="comment-header">
      <NuxtLink class="comment-profile" :to="`/user/${comment.user}`">
        <img :src="comment.userPicture" />
        {{ comment.user }}
      </NuxtLink>

      <div class="comment-actions">
        <button
          v-if="ctx.canModerate"
          title="View history"
          @click="ctx.viewHistory(comment)"
        >
          <Icon id="history-icon" name="ri:history-line" />
        </button>
        <template
          v-if="
            !comment.deleted &&
            ctx.editingComment.value.id === 0 &&
            comment.user === ctx.user.username
          "
        >
          <button @click="ctx.editComment(comment)">
            <Icon id="edit-icon" name="ri:pencil-fill" />
          </button>
          <button @click="ctx.deleteComment(comment)">
            <Icon id="delete-icon" name="ri:delete-bin-line" />
          </button>
        </template>
        <button
          v-if="
            !comment.deleted &&
            ctx.user.loggedIn &&
            comment.user !== ctx.user.username
          "
          title="Report comment"
          @click="ctx.openReportDialog({ type: 'comment', id: comment.id })"
        >
          <Icon id="report-icon" name="ri:flag-line" />
        </button>
      </div>
    </div>

    <p class="deleted-comment" v-if="comment.deleted">
      [deleted]
    </p>
    <MarkdownText
      v-else-if="ctx.editingComment.value.id !== comment.id"
      :markdown="comment.content"
    />
    <div class="textarea-container" v-else>
      <textarea
        name="comment-edit-field"
        v-model="ctx.editingComment.value.content"
        @keydown.escape="ctx.stopEditingComment()"
        maxlength="500"
      />

      <div class="button-spacer">
        <button @click="ctx.stopEditingComment()">
          <Icon name="ri:close-fill" /> Cancel
        </button>
        <button @click="ctx.saveComment()">
          <Icon name="ri:send-plane-fill" /> Save
        </button>
      </div>
    </div>

    <div class="comment-footer" v-if="ctx.editingComment.value.id !== comment.id">
      <a
        v-if="ctx.user.loggedIn"
        href="javascript:void(0);"
        class="reply-link"
        @click="
          ctx.replyingTo.value === comment.originalId
            ? ctx.cancelReply()
            : ctx.startReply(comment.originalId)
        "
      >
        {{ ctx.replyingTo.value === comment.originalId ? "Cancel" : "Reply" }}
      </a>
      <div id="timestamp">
        <span v-if="comment.edited && !comment.deleted">(edited)</span>
        <span>{{ comment.timeSince }}</span>
      </div>
    </div>

    <div
      class="textarea-container reply-box"
      v-if="ctx.replyingTo.value === comment.originalId"
    >
      <textarea
        name="comment-reply-field"
        v-model="ctx.replyContent.value"
        placeholder="Write a reply..."
        maxlength="500"
        @keydown.escape="ctx.cancelReply()"
      />

      <div class="button-spacer">
        <button @click="ctx.cancelReply()">
          <Icon name="ri:close-fill" /> Cancel
        </button>
        <button @click="ctx.submitReply()">
          <Icon name="ri:send-plane-fill" /> Reply
        </button>
      </div>
    </div>

    <div class="replies" v-if="comment.replies.length > 0">
      <CommentNode
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
      />
    </div>
  </div>
</template>
