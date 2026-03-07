import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

interface PackagerPlatform {
  type: "make" | "cmake"; // TODO: Actually support Makefiles
  image: string;
  buildArgs?: string;
  output: string;
  prebuild?: string;
  postbuild?: string;
}

const platformsMap: { [key: string]: PackagerPlatform } = {
  "switch": {
    type: "cmake",
    image: "devkitpro/devkita64:latest",
    buildArgs: "-DCMAKE_TOOLCHAIN_FILE=$DEVKITPRO/cmake/Switch.cmake",
    output: "scratch-nx.nro",
  },
  "vita": {
    type: "cmake",
    image: "vitasdk/vitasdk:latest",
    buildArgs: "-DCMAKE_TOOLCHAIN_FILE=$VITASDK/share/vita.toolchain.cmake",
    output: "scratch-vita.vpk",
    prebuild:
      'wget -O $VITASDK/share/vita.cmake "https://raw.githubusercontent.com/gradylink/vita-toolchain/refs/heads/fix/cmake/cmake_toolchain/vita.cmake"',
  },
  "psp": {
    type: "cmake",
    image: "pspdev/pspdev:latest",
    buildArgs: "-DCMAKE_TOOLCHAIN_FILE=$PSPDEV/psp/share/pspdev.cmake",
    output: "scratch-psp.zip",
  },
  "webos": {
    type: "cmake",
    image: "node:20-slim",
    buildArgs:
      "-DCMAKE_TOOLCHAIN_FILE=arm-webos-linux-gnueabi_sdk-buildroot/share/buildroot/toolchainfile.cmake -DSE_CLOUDVARS=ON -DWEBOS=ON -DSE_RENDERER=sdl2",
    output: "io.github.scratcheverywhere_0.0.1_arm.ipk",
    prebuild:
      'apt-get update && apt-get install -y pkg-config cmake wget git file ca-certificates && npm install -g @webos-tools/cli && wget -qO- "https://github.com/openlgtv/buildroot-nc4/releases/latest/download/arm-webos-linux-gnueabi_sdk-buildroot-x86_64.tar.gz" | tar -xzf - && chmod +x arm-webos-linux-gnueabi_sdk-buildroot/relocate-sdk.sh && arm-webos-linux-gnueabi_sdk-buildroot/relocate-sdk.sh',
    postbuild:
      "cmake --install build --prefix build/package && ares-package build/package -o build",
  },
  "linux": {
    type: "cmake",
    image: "gcc:14",
    buildArgs: "-DSE_RENDERER=sdl2",
    output: "scratch-everywhere",
    prebuild:
      "apt-get update && apt-get install -y --no-install-recommends build-essential cmake libmbedtls-dev",
  },
};

interface PackagerAppInfo {
  name?: string;
  version?: string;
  author?: string;
  description?: string;
  titleId?: string;
  contentId?: string;
}

export const runBuild = (
  projectId: string,
  projectPath: string,
  taskId: number,
  platform: string,
  appInfo: PackagerAppInfo,
  onLog?: (data: string) => void,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!(platform in platformsMap)) reject(new Error("Invalid platform"));
    const platformInfo = platformsMap[platform]!;

    const mount = process.env.MOUNT as string;
    const outputDir = path.join(mount, "tmp", "builds", taskId.toString());

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let buildCommand = "cd /app &&";
    if (platformInfo.prebuild != null) {
      buildCommand += ` ${platformInfo.prebuild} &&`;
    }
    buildCommand += `cmake `;
    if (platformInfo.buildArgs != null) {
      buildCommand += `${platformInfo.buildArgs} `;
    }
    if (appInfo.author != null && appInfo.author != "") {
      buildCommand += `-DSE_APP_AUTHOR="${appInfo.author}" `;
    }
    if (appInfo.description != null && appInfo.description != "") {
      buildCommand += `-DSE_APP_DESCRIPTION="${appInfo.description}" `;
    }
    if (appInfo.name != null && appInfo.name != "") {
      buildCommand += `-DSE_APP_NAME="${appInfo.name}" `;
    }
    if (appInfo.version != null && appInfo.version != "") {
      buildCommand += `-DSE_APP_VERSION="${appInfo.version}" `;
    }
    if (appInfo.titleId != null && appInfo.titleId != "") {
      buildCommand += `-DSE_APP_TITLEID="${appInfo.titleId}" `;
    }
    buildCommand +=
      "-DSE_OBJECTS_DIR=/prebuilt -DCMAKE_BUILD_TYPE=Release -B build && cmake --build build &&";
    if (platformInfo.postbuild != null) {
      buildCommand += ` ${platformInfo.postbuild} &&`;
    }
    buildCommand += ` cp build/${platformInfo.output} /out/`;

    const args = [
      "run",
      "--rm",
      "-v",
      `${mount}/package/CMakeLists.txt:/app/CMakeLists.txt`,
      "-v",
      `${mount}/package/objects/${platform}:/prebuilt`,
      "-v",
      `${projectPath}:/app/romfs/project.sb3`,
      "-v",
      `${mount}/package/gfx:/app/gfx`,
      "-v",
      `${outputDir}:/out`,
      platformInfo.image,
      "/bin/bash",
      "-c",
      buildCommand,
    ];

    const child = spawn("docker", args);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (data: string) => {
      const lines = data.trimEnd().split("\n");
      for (const line of lines) {
        console.log(`[Build: ${projectId}]: ${line}`);
        if (onLog) onLog(line);
      }
    });

    child.stderr.on("data", (data: string) => {
      const lines = data.trimEnd().split("\n");
      for (const line of lines) {
        console.log(`[Build Error: ${projectId}]: ${line}`);
        if (onLog) onLog(line);
      }
    });

    child.on("close", (code) => {
      if (code == 0) resolve(`${outputDir}/${platformInfo.output}`);
      else reject(new Error(`Build failed with code ${code}`));
    });
  });
};
