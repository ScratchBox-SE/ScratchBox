import AdmZip from "adm-zip";

export const PROJECT_EXTENSIONS = ["sb3", "sb2", "sb"] as const;
export type ProjectExtension = typeof PROJECT_EXTENSIONS[number];

export const getProjectExtension = (
  filename: string,
): ProjectExtension | null => {
  const ext = filename.includes(".")
    ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
    : "";
  return (PROJECT_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as ProjectExtension)
    : null;
};

const SB_MAGIC = Buffer.from("ScratchV", "ascii");

const readZipProjectJson = (
  buffer: Buffer,
  extension: "sb2" | "sb3",
): unknown => {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw createError({
      statusCode: 415,
      statusMessage:
        `Not a valid .${extension} project file (not a zip archive)`,
    });
  }

  const entry = zip.getEntry("project.json");
  if (!entry) {
    throw createError({
      statusCode: 415,
      statusMessage:
        `Not a valid .${extension} project file (missing project.json)`,
    });
  }

  try {
    return JSON.parse(entry.getData().toString("utf-8"));
  } catch {
    throw createError({
      statusCode: 415,
      statusMessage:
        `Not a valid .${extension} project file (project.json is not valid JSON)`,
    });
  }
};

export const validateProjectFile = (
  buffer: Buffer,
  extension: ProjectExtension,
) => {
  if (extension === "sb") {
    if (!buffer.subarray(0, SB_MAGIC.length).equals(SB_MAGIC)) {
      throw createError({
        statusCode: 415,
        statusMessage: "Not a valid .sb project file",
      });
    }
    return;
  }

  const projectJson = readZipProjectJson(buffer, extension);
  if (typeof projectJson !== "object" || projectJson === null) {
    throw createError({
      statusCode: 415,
      statusMessage:
        `Not a valid .${extension} project file (project.json is malformed)`,
    });
  }

  if (extension === "sb3" && !Array.isArray((projectJson as any).targets)) {
    throw createError({
      statusCode: 415,
      statusMessage: "Not a valid .sb3 project file (missing targets)",
    });
  }

  if (extension === "sb2" && !("info" in (projectJson as object))) {
    throw createError({
      statusCode: 415,
      statusMessage: "Not a valid .sb2 project file (missing info)",
    });
  }
};
