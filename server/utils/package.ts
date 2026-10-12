import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { eq } from "drizzle-orm";
import { db } from "./drizzle";
import * as schema from "../database/schema";
import {
  BUNDLE_RUNTIME_INCLUDE_DIR,
  type BundleFileEntry,
  prepareBundleSources,
} from "../packager/bundleArchive";
import { getPlatform } from "../packager/platforms";
import { readToolkitMetadata, toolkitDir } from "../packager/packageToolkit";

interface PackagerAppInfo {
  name?: string;
  version?: string;
  author?: string;
  description?: string;
  titleId?: string;
  contentId?: string;
}

export const runBuild = async (
  projectId: string,
  projectPath: string,
  taskId: number,
  platformId: string,
  appInfo: PackagerAppInfo,
  onLog?: (data: string) => void,
): Promise<string> => {
  const log = (line: string) => {
    console.log(`[Build: ${projectId}]: ${line}`);
    onLog?.(line);
  };

  const platform = getPlatform(platformId);
  if (!platform) {
    throw new Error(
      `Platform "${platformId}" isn't supported for packaging yet.`,
    );
  }

  const toolkitRow = (await db.select().from(schema.packageToolkits).where(
    eq(schema.packageToolkits.platform, platformId),
  ))[0];
  if (!toolkitRow || toolkitRow.status !== "ready") {
    throw new Error(
      `No packaging toolkit is ready for ${platform.displayName} yet - an admin needs to build one first.`,
    );
  }

  const metadata = readToolkitMetadata(platformId);
  const tkDir = toolkitDir(platformId);

  const mount = process.env.MOUNT as string;
  const workDir = path.join(mount, "tmp", "builds", taskId.toString());
  const outputDir = path.join(workDir, "out");
  const buildRootDir = path.join(workDir, "buildroot", platform.buildDir);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(buildRootDir, { recursive: true });

  log("Restoring cached toolkit objects...");
  fs.cpSync(
    path.join(tkDir, "objects", path.basename(platform.buildDir)),
    buildRootDir,
    { recursive: true },
  );

  if (metadata.resourceCompileCommand) {
    const rcPath = path.join(buildRootDir, "resource.rc");
    fs.writeFileSync(
      rcPath,
      fs.readFileSync(rcPath, "utf8")
        .replaceAll(
          "__SE_APP_NAME__",
          rcEscape(appInfo.name ?? "Scratch Everywhere!"),
        )
        .replaceAll(
          "__SE_APP_AUTHOR__",
          rcEscape(appInfo.author ?? "Scratch Everywhere! Contributors"),
        )
        .replaceAll(
          "__SE_APP_DESCRIPTION__",
          rcEscape(appInfo.description ?? "Play Scratch games on anything!"),
        )
        .replaceAll("__SE_APP_VERSION__", rcEscape(appInfo.version ?? "1.0.0")),
    );
  }

  const appInfoJsonFiles = listFilesRecursive(buildRootDir).filter(
    (f) => path.basename(f) === "appinfo.json",
  );
  for (const appInfoPath of appInfoJsonFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(appInfoPath, "utf8"));
      data.title = appInfo.name || "Scratch Everywhere!";
      data.appDescription = appInfo.description ||
        "Play Scratch games on anything!";
      data.version = formatWebOSVersion(appInfo.version);
      if (
        appInfo.titleId &&
        /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/.test(appInfo.titleId)
      ) {
        data.id = appInfo.titleId;
      }
      fs.writeFileSync(appInfoPath, JSON.stringify(data, null, 2));
    } catch {
      fs.writeFileSync(
        appInfoPath,
        fs.readFileSync(appInfoPath, "utf8")
          .replaceAll("__SE_APP_NAME__", appInfo.name ?? "Scratch Everywhere!")
          .replaceAll(
            "__SE_APP_DESCRIPTION__",
            appInfo.description ?? "Play Scratch games on anything!",
          )
          .replaceAll(
            "__SE_APP_VERSION__",
            formatWebOSVersion(appInfo.version),
          ),
      );
    }
  }

  let romfsStageDir: string | undefined;
  if (platform.romfsDir) {
    log("Staging project + assets for NitroFS...");
    romfsStageDir = path.join(workDir, "romfs");
    fs.mkdirSync(romfsStageDir, { recursive: true });
    fs.copyFileSync(projectPath, path.join(romfsStageDir, "project.sb3"));
    for (const base of ["gfx", "extensions"]) {
      const src = path.join(tkDir, base);
      if (fs.existsSync(src)) {
        fs.cpSync(src, path.join(romfsStageDir, base), { recursive: true });
      }
    }
  } else {
    log("Rebuilding se_project...");
    prepareBundleSources({
      name: "se_project",
      files: [{ real: projectPath, virtual: "project.sb3" }],
      compression: "store",
      os: platform.bundleOS,
      workDir: buildRootDir,
    });

    log("Rebuilding se_assets...");
    prepareBundleSources({
      name: "se_assets",
      files: collectAssetFiles(tkDir),
      compression: "deflate",
      os: platform.bundleOS,
      workDir: buildRootDir,
    });
  }

  const linkCommand = fs.readFileSync(
    path.join(tkDir, "link_command.txt"),
    "utf8",
  )
    .trim();
  const postbuildCommands = fs.readFileSync(
    path.join(tkDir, "postbuild_commands.txt"),
    "utf8",
  ).split("\n").map((l) => l.trim()).filter(Boolean);

  const script = buildRelinkScript({
    cc: metadata.cc,
    ar: metadata.ar,
    extraCompilerArgs: metadata.extraCompilerArgs,
    resourceCompileCommand: metadata.resourceCompileCommand,
    linkCommand,
    postbuildCommands,
    outputs: platform.outputs,
    appInfo,
    prebuild: platform.prebuild,
    env: platform.env,
    useBundledAssets: !platform.romfsDir,
    cmakePreinstallStub: platform.cmakePreinstallStub,
  });

  const dockerArgs = [
    "run",
    "--rm",
    "-v",
    `${buildRootDir}:${platform.containerRoot}/${platform.buildDir}`,
    "-v",
    `${BUNDLE_RUNTIME_INCLUDE_DIR}:/scratchbox-bundle-runtime:ro`,
    "-v",
    `${outputDir}:/out`,
    "-w",
    `${platform.containerRoot}/${platform.buildDir}`,
  ];

  const toolchainDirsFile = path.join(tkDir, "toolchain-dirs.txt");
  const toolchainDirs = fs.existsSync(toolchainDirsFile)
    ? fs.readFileSync(toolchainDirsFile, "utf8").split("\n").map((l) =>
      l.trim()
    ).filter(Boolean)
    : [];

  const absDir = path.join(tkDir, "abs");
  if (fs.existsSync(absDir)) {
    for (const toolchainDir of toolchainDirs) {
      const hostPath = path.join(absDir, toolchainDir);
      if (fs.existsSync(hostPath)) {
        dockerArgs.push("-v", `${hostPath}:${toolchainDir}:ro`);
      }
    }

    for (const absPath of listFilesRecursive(absDir)) {
      const relPath = path.relative(absDir, absPath);
      if (/^(usr|lib|bin|sbin)(\/|$)/.test(relPath)) continue;
      if (
        platform.romfsDir && `/${relPath}`.startsWith(`${platform.romfsDir}/`)
      ) {
        continue;
      }
      if (toolchainDirs.some((d) => `/${relPath}`.startsWith(`${d}/`))) {
        continue;
      }
      dockerArgs.push("-v", `${absPath}:/${relPath}:ro`);
    }
  }

  if (platform.romfsDir && romfsStageDir) {
    dockerArgs.push("-v", `${romfsStageDir}:${platform.romfsDir}:ro`);
  }

  dockerArgs.push(platform.image, "sh", "-c", script);

  log("Relinking...");
  await runDocker(dockerArgs, log);

  const producedFiles = fs.readdirSync(outputDir);
  if (producedFiles.length === 0) {
    throw new Error("Build finished but no output files were produced.");
  }
  if (producedFiles.length === 1) {
    return path.join(outputDir, producedFiles[0] as string);
  }

  const zipPath = path.join(outputDir, `${platformId}-package.zip`);
  const zip = new AdmZip();
  for (const file of producedFiles) {
    zip.addLocalFile(path.join(outputDir, file));
  }
  zip.writeZip(zipPath);
  return zipPath;
};

const collectAssetFiles = (tkDir: string): BundleFileEntry[] => {
  const entries: BundleFileEntry[] = [];
  for (const base of ["gfx", "extensions"]) {
    const root = path.join(tkDir, base);
    if (fs.existsSync(root)) walk(root, base, entries);
  }
  return entries;
};

const listFilesRecursive = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
};

const walk = (
  dir: string,
  virtualPrefix: string,
  out: BundleFileEntry[],
): void => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const real = path.join(dir, entry.name);
    const virtual = `${virtualPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(real, virtual, out);
    } else {
      out.push({ real, virtual });
    }
  }
};

const buildRelinkScript = (opts: {
  cc: string;
  ar: string;
  extraCompilerArgs: string[];
  resourceCompileCommand?: string;
  linkCommand: string;
  postbuildCommands: string[];
  outputs: string[];
  appInfo: PackagerAppInfo;
  prebuild?: string;
  env?: Record<string, string>;
  useBundledAssets: boolean;
  cmakePreinstallStub?: boolean;
}): string => {
  const flags = opts.extraCompilerArgs.join(" ");
  const lines: string[] = ["set -e"];

  for (const [key, value] of Object.entries(opts.env ?? {})) {
    lines.push(
      key === "PATH"
        ? `export PATH="${value}:$PATH"`
        : `export ${key}=${shellQuote(value)}`,
    );
  }
  if (opts.prebuild) lines.push(opts.prebuild);

  if (opts.cmakePreinstallStub) {
    lines.push(
      [
        "mv /usr/bin/cmake /usr/bin/cmake.real",
        "cat > /usr/bin/cmake <<'CMAKE_PREINSTALL_STUB_EOF'",
        "#!/bin/sh",
        "has_build=0",
        "has_preinstall=0",
        'for arg in "$@"; do',
        '  case "$arg" in',
        "    --build) has_build=1 ;;",
        "    *preinstall*) has_preinstall=1 ;;",
        "  esac",
        "done",
        '[ "$has_build" = "1" ] && [ "$has_preinstall" = "1" ] && exit 0',
        'exec /usr/bin/cmake.real "$@"',
        "CMAKE_PREINSTALL_STUB_EOF",
        "chmod +x /usr/bin/cmake",
      ].join("\n"),
    );
  }

  if (opts.useBundledAssets) {
    for (const name of ["se_project", "se_assets"]) {
      lines.push(
        `${opts.cc} ${flags} -c ${name}_data.S -o ${name}_data.S.o`,
        `${opts.cc} ${flags} -I /scratchbox-bundle-runtime -c ${name}_archive.c -o ${name}_archive.c.o`,
        `${opts.ar} rcs lib${name}.a ${name}_data.S.o ${name}_archive.c.o`,
      );
    }
  }

  if (opts.resourceCompileCommand) lines.push(opts.resourceCompileCommand);

  const link = substituteAppInfo(
    opts.linkCommand
      .replaceAll("__SE_PROJECT_LIB__", "libse_project.a")
      .replaceAll("__SE_ASSETS_LIB__", "libse_assets.a"),
    opts.appInfo,
  );
  lines.push(link);

  for (const cmd of opts.postbuildCommands) {
    lines.push(substituteAppInfo(cmd, opts.appInfo));
  }

  for (const output of opts.outputs) {
    lines.push(`cp ${output} /out/`);
  }

  return lines.join("\n");
};

const shellQuote = (value: string): string => {
  return `'${value.replaceAll("'", `'\\''`)}'`;
};

const rcEscape = (value: string): string => {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r\n", " ")
    .replaceAll(/[\r\n]/g, " ");
};

export const formatWebOSVersion = (version?: string): string => {
  if (!version || version.includes("__SE_APP_VERSION__")) {
    return "1.0.0";
  }
  const cleaned = version.trim().replace(/^v/i, "");
  const parts = cleaned.split(".");
  const nums: number[] = [];
  for (const part of parts) {
    const match = part.match(/^\d+/);
    if (!match) break;
    const num = parseInt(match[0], 10);
    if (isNaN(num) || num < 0 || num > 999999999) break;
    nums.push(num);
  }
  if (nums.length === 0) {
    return "1.0.0";
  }
  while (nums.length < 3) {
    nums.push(0);
  }
  const candidate = nums.slice(0, 3).join(".");
  if (
    /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/.test(candidate)
  ) {
    return candidate;
  }
  return "1.0.0";
};

const substituteAppInfo = (
  command: string,
  appInfo: PackagerAppInfo,
): string => {
  return command
    .replaceAll(
      "__SE_APP_NAME__",
      shellQuote(appInfo.name ?? "Scratch Everywhere!"),
    )
    .replaceAll(
      "__SE_APP_AUTHOR__",
      shellQuote(appInfo.author ?? "Scratch Everywhere! Contributors"),
    )
    .replaceAll(
      "__SE_APP_DESCRIPTION__",
      shellQuote(appInfo.description ?? "Play Scratch games on anything!"),
    )
    .replaceAll("__SE_APP_VERSION__", shellQuote(appInfo.version ?? "1.0.0"))
    .replaceAll("__SE_APP_TITLEID__", shellQuote(appInfo.titleId ?? ""));
};

const runDocker = (
  args: string[],
  onLog: (line: string) => void,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (data: string) => {
      for (const line of data.trimEnd().split("\n")) onLog(line);
    });
    child.stderr.on("data", (data: string) => {
      for (const line of data.trimEnd().split("\n")) onLog(line);
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Relink failed with exit code ${code}`));
    });
  });
};
