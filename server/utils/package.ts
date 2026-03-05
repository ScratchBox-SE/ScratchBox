import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

// TODO: handle other platforms
export const runBuild = (
  projectId: string,
  projectPath: string,
  taskId: number,
  onLog?: (data: string) => void,
): Promise<string> => {
  return new Promise((resolve, reject) => {
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
      `${mount}/package/objects/switch:/prebuilt`,
      "-v",
      `${projectPath}:/app/romfs/project.sb3`,
      "-v",
      `${mount}/package/gfx:/app/gfx`,
      "-v",
      `${outputDir}:/out`,
      "devkitpro/devkita64:latest",
      "/bin/bash",
      "-c",
      `cd /app && cmake -DCMAKE_TOOLCHAIN_FILE=$DEVKITPRO/cmake/Switch.cmake -DSE_OBJECTS_DIR=/prebuilt -DCMAKE_BUILD_TYPE=Release -B build-nx && cmake --build build-nx && cp build-nx/scratch-nx.nro /out/`,
    ];

    const child = spawn("docker", args);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (data: string) => {
      console.log(`[Build: ${projectId}]: ${data}`);
      if (onLog) onLog(data);
    });

    child.stderr.on("data", (data: string) => {
      console.log(`[Build Error: ${projectId}]: ${data}`);
      if (onLog) onLog(data);
    });

    child.on("close", (code) => {
      console.log("hi!");
      if (code == 0) resolve(`${outputDir}/scratch-nx.nro`);
      else reject(new Error(`Build failed with code ${code}`));
    });
  });
};
