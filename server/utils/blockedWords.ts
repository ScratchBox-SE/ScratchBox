import {
  blockedWordErrorMessage,
  findBlockedWordField,
} from "../../shared/wordFilter";

export const assertNoBlockedWords = (
  fields: Record<string, string | null | undefined>,
): void => {
  const label = findBlockedWordField(fields);
  if (label) {
    throw createError({
      statusCode: 422,
      statusMessage: blockedWordErrorMessage(label),
    });
  }
};
