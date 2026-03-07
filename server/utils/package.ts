import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

interface PackagerPlatform {
  type: "make" | "cmake"; // TODO: Actually support Makefiles
  image: string;
  buildArgs: string;
  output: string;
  prebuild?: string;
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
};

export const runBuild = (
  projectId: string,
  projectPath: string,
  taskId: number,
  platform: string,
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
      `cd /app &&${
        platformInfo.prebuild == null ? "" : ` ${platformInfo.prebuild} &&`
      } cmake ${platformInfo.buildArgs} -DSE_OBJECTS_DIR=/prebuilt -DCMAKE_BUILD_TYPE=Release -B build && cmake --build build && cp build/${platformInfo.output} /out/`,
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
