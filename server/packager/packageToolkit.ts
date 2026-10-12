import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../utils/drizzle";
import * as schema from "../database/schema";
import { getPlatform, type PackagerPlatform } from "./platforms";

const SE_REPO_URL =
  "https://github.com/ScratchEverywhere/ScratchEverywhere.git";
const DOCKERFILES_DIR = path.join(
  process.cwd(),
  "server",
  "packager",
  "dockerfiles",
);

export interface ToolkitMetadata {
  platform: string;
  seRef: string;
  seCommit: string;
  builtAt: string;
  cc: string;
  ar: string;
  extraCompilerArgs: string[];
  containerRoot: string;
  buildDir: string;
  resourceCompileCommand?: string;
}

export const toolkitDir = (platformId: string): string => {
  return path.join(
    process.env.MOUNT as string,
    "package",
    "toolkits",
    platformId,
  );
};

export const toolkitLogPath = (platformId: string): string => {
  return path.join(
    process.env.MOUNT as string,
    "package",
    "logs",
    `${platformId}.log`,
  );
};

export const readToolkitLog = (platformId: string): string => {
  const file = toolkitLogPath(platformId);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
};

export const readToolkitMetadata = (platformId: string): ToolkitMetadata => {
  const file = path.join(toolkitDir(platformId), "toolkit.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

export const resolveLatestReleaseTag = async (): Promise<string> => {
  const res = await fetch(
    "https://api.github.com/repos/ScratchEverywhere/ScratchEverywhere/releases/latest",
  );
  if (!res.ok) {
    throw new Error(
      `Failed to resolve latest release: GitHub API returned ${res.status}`,
    );
  }
  const data = await res.json() as { tag_name?: string };
  if (!data.tag_name) {
    throw new Error("GitHub API response had no tag_name");
  }
  return data.tag_name;
};

const activeProcesses = new Map<string, ReturnType<typeof spawn>>();

export const stopToolkitBuild = (platformId: string): boolean => {
  const child = activeProcesses.get(platformId);
  if (!child) return false;
  child.kill("SIGTERM");
  return true;
};

export const stopAllToolkitBuilds = (): string[] => {
  const platformIds = [...activeProcesses.keys()];
  for (const platformId of platformIds) stopToolkitBuild(platformId);
  return platformIds;
};

export const buildToolkit = async (
  platformId: string,
  ref: string,
  onLog?: (line: string) => void,
): Promise<void> => {
  const platform = getPlatform(platformId);
  if (!platform) {
    throw new Error(`Unknown or not-yet-supported platform: ${platformId}`);
  }

  const logFile = toolkitLogPath(platformId);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(
    logFile,
    `Building ${platformId} (ref: ${ref}) at ${new Date().toISOString()}\n`,
  );

  const log = (line: string) => {
    console.log(`[toolkit:${platformId}] ${line}`);
    fs.appendFileSync(logFile, line + "\n");
    onLog?.(line);
  };

  await db.insert(schema.packageToolkits).values({
    platform: platformId,
    seRef: ref,
    seCommit: "",
    status: "building",
  }).onConflictDoUpdate({
    target: schema.packageToolkits.platform,
    set: { status: "building", error: null, seRef: ref },
  });

  const tmpRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), `sb-toolkit-${platformId}-`),
  );
  const cloneDir = path.join(tmpRoot, "se");
  const rawOutDir = path.join(tmpRoot, "raw");

  try {
    log(`Cloning ${SE_REPO_URL} (${ref})...`);
    await run(
      "git",
      [
        "clone",
        "--depth",
        "1",
        "--branch",
        ref,
        SE_REPO_URL,
        cloneDir,
      ],
      log,
      platformId,
    );
    const seCommit =
      (await run("git", ["-C", cloneDir, "rev-parse", "HEAD"], log, platformId))
        .trim();
    log(`SE! commit: ${seCommit}`);

    const dockerfilePath = path.join(DOCKERFILES_DIR, platform.dockerfile);
    log(`Building toolkit via ${platform.dockerfile}...`);
    await run(
      "docker",
      [
        "build",
        "-f",
        dockerfilePath,
        "--target",
        "exporter",
        "--build-context",
        `toolkitctx=${DOCKERFILES_DIR}`,
        "--output",
        `type=local,dest=${rawOutDir}`,
        cloneDir,
      ],
      log,
      platformId,
    );

    log("Parsing captured build for the link command and postbuild steps...");
    const captured = parseCapturedToolkit(rawOutDir, platform, log);

    const finalDir = toolkitDir(platformId);
    fs.rmSync(finalDir, { recursive: true, force: true });
    fs.mkdirSync(finalDir, { recursive: true });
    fs.cpSync(path.join(rawOutDir, "objects"), path.join(finalDir, "objects"), {
      recursive: true,
    });
    if (fs.existsSync(path.join(rawOutDir, "abs"))) {
      fs.cpSync(path.join(rawOutDir, "abs"), path.join(finalDir, "abs"), {
        recursive: true,
      });
      rewriteEphemeralSymlinks(
        path.join(finalDir, "abs"),
        path.join(rawOutDir, "abs"),
      );
    }
    if (fs.existsSync(path.join(rawOutDir, "toolchain-dirs.txt"))) {
      fs.cpSync(
        path.join(rawOutDir, "toolchain-dirs.txt"),
        path.join(finalDir, "toolchain-dirs.txt"),
      );
    }
    if (fs.existsSync(path.join(rawOutDir, "gfx"))) {
      fs.cpSync(path.join(rawOutDir, "gfx"), path.join(finalDir, "gfx"), {
        recursive: true,
      });
    }
    if (fs.existsSync(path.join(rawOutDir, "extensions"))) {
      fs.cpSync(
        path.join(rawOutDir, "extensions"),
        path.join(finalDir, "extensions"),
        {
          recursive: true,
        },
      );
    }
    // kept for admins to inspect by hand if link/postbuild parsing ever looks wrong
    fs.cpSync(
      path.join(rawOutDir, "cmake"),
      path.join(finalDir, "cmake-debug"),
      {
        recursive: true,
      },
    );
    fs.writeFileSync(
      path.join(finalDir, "link_command.txt"),
      captured.linkCommand + "\n",
    );
    fs.writeFileSync(
      path.join(finalDir, "postbuild_commands.txt"),
      captured.postbuildCommands.join("\n") + "\n",
    );

    const metadata: ToolkitMetadata = {
      platform: platformId,
      seRef: ref,
      seCommit,
      builtAt: new Date().toISOString(),
      cc: captured.cc,
      ar: captured.ar,
      extraCompilerArgs: captured.extraCompilerArgs,
      containerRoot: platform.containerRoot,
      buildDir: platform.buildDir,
      resourceCompileCommand: captured.resourceCompileCommand,
    };
    fs.writeFileSync(
      path.join(finalDir, "toolkit.json"),
      JSON.stringify(metadata, null, 2),
    );

    await db.update(schema.packageToolkits).set({
      status: "ready",
      seCommit,
      error: null,
      builtAt: new Date(),
    }).where(eq(schema.packageToolkits.platform, platformId));

    log("Toolkit ready.");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log(`FAILED: ${message}`);
    await db.update(schema.packageToolkits).set({
      status: "failed",
      error: message.slice(0, 4000),
    }).where(eq(schema.packageToolkits.platform, platformId));
    throw e;
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
};

interface CapturedBuild {
  linkCommand: string;
  postbuildCommands: string[];
  cc: string;
  ar: string;
  extraCompilerArgs: string[];
  resourceCompileCommand?: string;
}

const parseCapturedToolkit = (
  rawOutDir: string,
  platform: PackagerPlatform,
  log: (line: string) => void,
): CapturedBuild => {
  const cmakeRoot = path.join(rawOutDir, "cmake");
  const namespaces = fs.existsSync(cmakeRoot) ? fs.readdirSync(cmakeRoot) : [];
  const namespace = namespaces.find((n) =>
    fs.existsSync(path.join(cmakeRoot, n, "CMakeCache.txt"))
  );
  if (!namespace) {
    throw new Error(
      "capture produced no cmake/ bookkeeping with a CMakeCache.txt - the toolkit build likely failed before the configure step completed",
    );
  }
  const nsDir = path.join(cmakeRoot, namespace);

  const cmakeCacheText = fs.readFileSync(
    path.join(nsDir, "CMakeCache.txt"),
    "utf8",
  );
  const cmakeBin = readCacheVar(cmakeCacheText, "CMAKE_COMMAND") ?? "cmake";

  const dirsRoot = path.join(nsDir, "CMakeFiles");
  const targetDirs = fs.existsSync(dirsRoot) ? fs.readdirSync(dirsRoot) : [];

  let best: { dirName: string; command: string } | undefined;
  let arCommand: string | undefined;
  for (const targetDirName of targetDirs) {
    const linkTxtPath = path.join(dirsRoot, targetDirName, "link.txt");
    if (!fs.existsSync(linkTxtPath)) continue;
    const command = fs.readFileSync(linkTxtPath, "utf8").trim();
    if (isArchiveCommand(command)) {
      arCommand ??= command;
      continue;
    }
    if (!best || command.length > best.command.length) {
      best = { dirName: targetDirName, command };
    }
  }
  if (!best) {
    throw new Error(
      "could not find the main executable's link.txt in the captured build - " +
        "check cmake-debug/ in the toolkit output for the raw CMakeFiles directory",
    );
  }
  log(`Found link command in CMakeFiles/${best.dirName}`);

  let cc: string | undefined;
  let cFlags = "";
  for (const targetDirName of targetDirs) {
    const flagsMakePath = path.join(dirsRoot, targetDirName, "flags.make");
    if (!fs.existsSync(flagsMakePath)) continue;
    const flagsMake = fs.readFileSync(flagsMakePath, "utf8");
    const compileWithC = flagsMake.match(/^# compile C with (.*)$/m)?.[1];
    if (compileWithC) {
      cc = compileWithC;
      cFlags = flagsMake.match(/^C_FLAGS = (.*)$/m)?.[1] ?? "";
      break;
    }
  }
  cc ??= best.command.split(/\s+/)[0] ??
    readCacheVar(cmakeCacheText, "CMAKE_C_COMPILER") ?? "cc";
  const ar = arCommand?.split(/\s+/)[0] ??
    readCacheVar(cmakeCacheText, "CMAKE_AR") ?? "ar";
  const extraCompilerArgs = resolveMakeVariables(cFlags, cmakeBin)
    .split(/\s+/)
    .filter(Boolean);

  const buildMakePath = path.join(dirsRoot, best.dirName, "build.make");
  const postbuildCommands: string[] = [];
  if (fs.existsSync(buildMakePath)) {
    postbuildCommands.push(
      ...extractPostbuildCommands(
        fs.readFileSync(buildMakePath, "utf8"),
        best.dirName,
        cmakeBin,
      ),
    );
  }

  for (const extraTarget of platform.extraPackageTargets ?? []) {
    const extraDirName = `${extraTarget}.dir`;
    const extraBuildMake = path.join(dirsRoot, extraDirName, "build.make");
    const topLevelMakefile = path.join(nsDir, "Makefile");
    const recipeFile = fs.existsSync(extraBuildMake)
      ? extraBuildMake
      : fs.existsSync(topLevelMakefile)
      ? topLevelMakefile
      : undefined;
    if (!recipeFile) {
      log(
        `WARNING: expected a CMakeFiles/${extraDirName} or a top-level Makefile rule for extra package target "${extraTarget}" but found none - check cmake-debug/ by hand`,
      );
      continue;
    }
    const rules = parseMakeRules(fs.readFileSync(recipeFile, "utf8"));
    const matched = recipeFile === topLevelMakefile
      ? rules.filter((r) => r.target === extraTarget)
      : rules;
    for (const rule of topoSortRules(matched)) {
      for (const line of rule.recipe) {
        postbuildCommands.push(resolveMakeVariables(line, cmakeBin));
      }
    }
  }

  const resourceCompileCommand = fs.existsSync(buildMakePath)
    ? findResourceCompileCommand(
      fs.readFileSync(buildMakePath, "utf8"),
      cmakeBin,
    )
    : undefined;

  return {
    linkCommand: templatize(best.command),
    postbuildCommands: postbuildCommands.map(templatize),
    cc,
    ar,
    extraCompilerArgs,
    resourceCompileCommand,
  };
};

const findResourceCompileCommand = (
  buildMake: string,
  cmakeBin: string,
): string | undefined => {
  for (const line of buildMake.split("\n")) {
    if (!line.startsWith("\t")) continue;
    const trimmed = line.trim().replace(/^@/, "");
    const base = trimmed.split(/\s+/)[0]?.split(/[/\\]/).pop() ?? "";
    if (base.toLowerCase().includes("windres")) {
      return resolveMakeVariables(trimmed, cmakeBin);
    }
  }
  return undefined;
};

const readCacheVar = (cacheText: string, name: string): string | undefined => {
  const match = cacheText.match(new RegExp(`^${name}(?::\\w+)?=(.*)$`, "m"));
  return match?.[1];
};

const rewriteEphemeralSymlinks = (dir: string, rawAbsDir: string): void => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(full);
      if (target.startsWith(rawAbsDir)) {
        fs.unlinkSync(full);
        fs.symlinkSync(target.slice(rawAbsDir.length) || "/", full);
      }
    } else if (entry.isDirectory()) {
      rewriteEphemeralSymlinks(full, rawAbsDir);
    }
  }
};

const isArchiveCommand = (command: string): boolean => {
  const firstToken = command.split(/\s+/)[0] ?? "";
  const base = firstToken.split(/[/\\]/).pop() ?? "";
  return base === "ar" || base === "ar.exe" || base === "emar" ||
    base === "llvm-ar" || base.endsWith("-ar") || base.endsWith("-ar.exe");
};

const resolveMakeVariables = (command: string, cmakeBin: string): string => {
  return command
    .replaceAll("$(CMAKE_COMMAND)", cmakeBin)
    .replace(/\$\(([A-Za-z_][A-Za-z0-9_]*)\)/g, "${$1}");
};

const extractPostbuildCommands = (
  buildMake: string,
  targetDirName: string,
  cmakeBin: string,
): string[] => {
  const linkTxtRef = `CMakeFiles/${targetDirName}/link.txt`;
  const lines = buildMake.split("\n");
  const linkLineIndex = lines.findIndex(
    (l) => l.includes("cmake_link_script") && l.includes(linkTxtRef),
  );
  if (linkLineIndex === -1) return [];

  const commands: string[] = [];
  for (let i = linkLineIndex + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line.startsWith("\t")) break;
    const trimmed = line.trim();
    if (
      trimmed === "" || trimmed.startsWith(".PHONY") || trimmed.startsWith("#")
    ) {
      break;
    }
    if (trimmed.includes("cmake_echo_color")) continue;
    commands.push(
      resolveMakeVariables(trimmed.replace(/^@/, ""), cmakeBin),
    );
  }
  return commands;
};

interface MakeRule {
  target: string;
  prereqs: string[];
  recipe: string[];
}

const parseMakeRules = (buildMake: string): MakeRule[] => {
  const bookkeepingHeader =
    /\.dir\/(clean|depend|codegen|build|progress)$|\.[is]$/;
  const rules: MakeRule[] = [];
  let current: MakeRule | null = null;
  let skip = false;

  for (const rawLine of buildMake.split("\n")) {
    if (rawLine.startsWith("\t")) {
      if (skip || !current) continue;
      const trimmed = rawLine.trim().replace(/^@/, "");
      if (
        trimmed === "" || trimmed.startsWith("#") ||
        trimmed.includes("cmake_echo_color")
      ) {
        continue;
      }
      current.recipe.push(trimmed);
      continue;
    }
    const colonIndex = rawLine.indexOf(":");
    if (colonIndex === -1) continue;
    const header = rawLine.slice(0, colonIndex).trim();
    if (!header || header.startsWith("#") || header.startsWith(".")) {
      skip = true;
      current = null;
      continue;
    }
    skip = bookkeepingHeader.test(header);
    if (skip) {
      current = null;
      continue;
    }
    const prereqs = rawLine.slice(colonIndex + 1).trim().split(/\s+/).filter(
      Boolean,
    );
    if (current && current.target === header) {
      current.prereqs.push(...prereqs);
    } else {
      current = { target: header, prereqs: [...prereqs], recipe: [] };
      rules.push(current);
    }
  }
  return rules;
};

const topoSortRules = (rules: MakeRule[]): MakeRule[] => {
  const real = rules.filter((r) => r.recipe.length > 0);
  const byTarget = new Map(real.map((r) => [r.target, r]));
  const visited = new Set<MakeRule>();
  const result: MakeRule[] = [];
  const visit = (rule: MakeRule) => {
    if (visited.has(rule)) return;
    visited.add(rule);
    for (const prereq of rule.prereqs) {
      const dep = byTarget.get(prereq);
      if (dep) visit(dep);
    }
    result.push(rule);
  };
  for (const rule of real) visit(rule);
  return result;
};

const extractAllRecipeCommands = (
  buildMake: string,
  cmakeBin: string,
): string[] => {
  const ordered = topoSortRules(parseMakeRules(buildMake));
  const commands: string[] = [];
  for (const rule of ordered) {
    for (const line of rule.recipe) {
      commands.push(resolveMakeVariables(line, cmakeBin));
    }
  }
  return commands;
};

const templatize = (command: string): string => {
  return command
    .replace(/\S*libse_project\.a/g, "__SE_PROJECT_LIB__")
    .replace(/\S*libse_assets\.a/g, "__SE_ASSETS_LIB__")
    .replaceAll("ABCD12345", "__SE_APP_TITLEID__");
};

const run = (
  cmd: string,
  args: string[],
  onLog: (line: string) => void,
  platformId?: string,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    if (platformId) activeProcesses.set(platformId, child);
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (data: string) => {
      stdout += data;
      for (const line of data.trimEnd().split("\n")) onLog(line);
    });
    child.stderr.on("data", (data: string) => {
      for (const line of data.trimEnd().split("\n")) onLog(line);
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (platformId && activeProcesses.get(platformId) === child) {
        activeProcesses.delete(platformId);
      }
      if (code === 0) resolve(stdout);
      else if (signal) {
        reject(new Error(`${cmd} ${args.join(" ")} was stopped (${signal})`));
      } else {
        reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
};
