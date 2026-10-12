type WordFilter = typeof import("#shared/wordFilter");

let filterModule: Promise<WordFilter> | undefined;

export const useBlockedWordCheck = () => {
  const findBlockedWordError = async (
    fields: Record<string, string | null | undefined>,
  ): Promise<string | null> => {
    filterModule ??= import("#shared/wordFilter");
    const { findBlockedWordField, blockedWordErrorMessage } =
      await filterModule;
    const label = findBlockedWordField(fields);
    return label ? blockedWordErrorMessage(label) : null;
  };

  return { findBlockedWordError };
};
