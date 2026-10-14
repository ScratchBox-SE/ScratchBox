import { createHash } from "node:crypto";

const UNIQUE_ID_MIN = 0xf0000;
const UNIQUE_ID_MAX = 0xfffff;

const RESERVED_UNIQUE_IDS = new Set<number>([
  0x2143, // Scratch Everywhere!
  0xff3ff, // 3DS template
  0xf8001, // FBI
  0x43917, // Universal Updater
  0xbeef5, // ftpd
]);

export const deriveCtrUniqueId = (seed: string): number => {
  const digest = createHash("sha256").update(seed).digest();
  const span = UNIQUE_ID_MAX - UNIQUE_ID_MIN + 1;
  let offset = digest.readUInt32BE(0) % span;

  let id = UNIQUE_ID_MIN + offset;
  while (RESERVED_UNIQUE_IDS.has(id)) {
    offset = (offset + 1) % span;
    id = UNIQUE_ID_MIN + offset;
  }
  return id;
};

export const formatCtrUniqueId = (id: number): string =>
  `0x${id.toString(16).toUpperCase()}`;

const UNIQUE_ID_LINE = /^([ \t]*UniqueId[ \t]*:[ \t]*)\S+/m;

export const setRsfUniqueId = (rsf: string, id: number): string => {
  if (!UNIQUE_ID_LINE.test(rsf)) {
    throw new Error(
      "makerom.rsf has no TitleInfo/UniqueId line to replace, refusing to build a CIA that could overwrite another title.",
    );
  }
  return rsf.replace(UNIQUE_ID_LINE, `$1${formatCtrUniqueId(id)}`);
};
