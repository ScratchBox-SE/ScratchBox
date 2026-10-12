import { randomInt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { H3Event } from "h3";
import type { ServerFile } from "nuxt-file-storage";

export interface UploadedFile {
  name: string;
  type: string;
  data: Buffer;
}

export type ProjectTag =
  | "dual-screen"
  | "heavy"
  | "light"
  | "balanced"
  | "cursor";

export interface EditRequest {
  file?: UploadedFile;
  thumbnail?: UploadedFile;
  name: string;
  description: string;
  tags?: ProjectTag[];
  private?: boolean;
  reason?: string;
}

const badRequest = (message: string) =>
  createError({ statusCode: 400, statusMessage: message });

const isMultipart = (event: H3Event): boolean =>
  (getRequestHeader(event, "content-type") ?? "")
    .toLowerCase()
    .startsWith("multipart/form-data");

const fromServerFile = (file: ServerFile): UploadedFile => {
  if (
    !file || typeof file.name !== "string" || typeof file.content !== "string"
  ) {
    throw badRequest("Invalid file upload");
  }
  try {
    return {
      name: file.name,
      type: file.type,
      data: parseDataUrl(file.content).binaryString,
    };
  } catch {
    throw badRequest("Invalid file upload");
  }
};

interface ParsedForm {
  fields: Record<string, string>;
  files: Record<string, UploadedFile>;
}

const readForm = async (event: H3Event): Promise<ParsedForm> => {
  const parts = await readMultipartFormData(event);
  if (!parts) throw badRequest("Invalid form data");

  const form: ParsedForm = { fields: {}, files: {} };
  for (const part of parts) {
    if (!part.name) continue;
    if (part.filename !== undefined) {
      if (part.data.length === 0) continue;
      form.files[part.name] = {
        name: part.filename,
        type: part.type ?? "application/octet-stream",
        data: part.data,
      };
    } else {
      form.fields[part.name] = part.data.toString("utf8");
    }
  }
  return form;
};

export const readUploadedFile = async (
  event: H3Event,
): Promise<UploadedFile> => {
  if (isMultipart(event)) {
    const { files } = await readForm(event);
    if (!files.file) throw badRequest("No file was uploaded");
    return files.file;
  }
  return fromServerFile(await readBody<ServerFile>(event));
};

export const readEditRequest = async (event: H3Event): Promise<EditRequest> => {
  if (!isMultipart(event)) {
    const body = await readBody<
      & Omit<EditRequest, "file" | "thumbnail">
      & { file?: ServerFile; thumbnail?: ServerFile }
    >(event);
    return {
      ...body,
      file: body.file ? fromServerFile(body.file) : undefined,
      thumbnail: body.thumbnail ? fromServerFile(body.thumbnail) : undefined,
    };
  }

  const { fields, files } = await readForm(event);
  if (fields.name === undefined || fields.description === undefined) {
    throw badRequest("Missing project name or description");
  }

  let tags: ProjectTag[] | undefined;
  if (fields.tags !== undefined) {
    try {
      const parsed = JSON.parse(fields.tags);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      tags = parsed;
    } catch {
      throw badRequest("Invalid tags");
    }
  }

  return {
    file: files.file,
    thumbnail: files.thumbnail,
    name: fields.name,
    description: fields.description,
    tags,
    private: fields.private === undefined
      ? undefined
      : fields.private === "true",
    reason: fields.reason,
  };
};

export const storeBufferLocally = async (
  data: Buffer,
  filename: string,
  location: string,
  flag: "w" | "wx" = "w",
): Promise<void> => {
  const target = getFileLocally(filename, location);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data, { flag });
};

const ID_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const storeNewBufferLocally = async (
  data: Buffer,
  extension: string,
  location: string,
  idLength = 12,
): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = Array.from(
      { length: idLength },
      () => ID_CHARACTERS[randomInt(ID_CHARACTERS.length)],
    ).join("");
    try {
      await storeBufferLocally(data, `${id}.${extension}`, location, "wx");
      return id;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
  throw createError({
    statusCode: 500,
    statusMessage: "Could not allocate an id for the upload",
  });
};
