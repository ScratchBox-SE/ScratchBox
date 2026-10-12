import { Category, Profanease } from "profanease";
import { categorized } from "profanease/langs/en";

const filter = new Profanease({
  languages: [categorized],
  categories: [Category.SLUR, Category.SEXUAL, Category.DRUGS],
  normalize: "aggressive",
});

export const containsBlockedWord = (text?: string | null): boolean =>
  !!text && filter.check(text);

export const findBlockedWordField = (
  fields: Record<string, string | null | undefined>,
): string | undefined =>
  Object.keys(fields).find((label) => containsBlockedWord(fields[label]));

export const blockedWordErrorMessage = (label: string): string =>
  `${label} contains language that isn't allowed on ScratchBox.`;
