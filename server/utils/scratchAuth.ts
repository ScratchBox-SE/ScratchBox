import { randomBytes } from "node:crypto";

export const AUTH_TOKEN_VALIDITY_MS = 5 * 60 * 1000;

export const generatePublicCode = () => {
  let code: string;
  do {
    code = randomBytes(10).toString("hex");
  } while (/\d{10}/.test(code));
  return code;
};

export const generatePrivateCode = () => randomBytes(48).toString("hex");

export const findVerifyingComment = async (publicCode: string) => {
  const { authProjectId, authProjectAuthor } = useRuntimeConfig();

  const comments = await $fetch<
    { content: string; author: { username: string } }[]
  >(
    `https://api.scratch.mit.edu/users/${authProjectAuthor}/projects/${authProjectId}/comments`,
    { query: { offset: 0, limit: 40, cache: Date.now() } },
  );

  return comments.find((comment) => comment.content.trim() === publicCode)
    ?.author.username;
};
