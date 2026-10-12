import type { BundleOS } from "./bundleArchive";

export interface PackagerPlatform {
  id: string;
  displayName: string;
  dockerfile: string;
  image: string;
  containerRoot: string;
  buildDir: string;
  outputs: string[];
  bundleOS: BundleOS;
  extraPackageTargets?: string[];
  prebuild?: string;
  env?: Record<string, string>;
  romfsDir?: string;
  cmakePreinstallStub?: boolean;
}

export const PACKAGER_PLATFORMS: PackagerPlatform[] = [
  {
    id: "linux",
    displayName: "Linux",
    dockerfile: "linux.toolkit.Dockerfile",
    image: "gcc:14",
    containerRoot: "/app",
    buildDir: "build",
    outputs: ["scratch-pc"],
    bundleOS: "unix",
    prebuild:
      "apt-get update && apt-get install -y --no-install-recommends libmbedtls-dev libdbus-1-dev libpulse-dev libgl1-mesa-dev libgl1-mesa-dri libglx-mesa0 libegl1-mesa-dev libx11-dev libxcursor-dev libxi-dev libxrandr-dev libxinerama-dev libxss-dev libxtst-dev libwayland-dev libxkbcommon-dev wayland-protocols libwayland-bin libasound2-dev libjack-dev libpipewire-0.3-dev",
  },
  {
    id: "macos",
    displayName: "macOS",
    dockerfile: "macos.toolkit.Dockerfile",
    image: "alpine:latest",
    containerRoot: "/app",
    buildDir: "build",
    outputs: ["scratch-pc"],
    bundleOS: "macos",
    env: { LD_LIBRARY_PATH: "/osxcross/lib", PATH: "/osxcross/bin" },
    prebuild: "apk add --no-cache clang lld musl-dev fts",
  },
  {
    id: "windows",
    displayName: "Windows",
    dockerfile: "windows.toolkit.Dockerfile",
    image: "debian:trixie",
    containerRoot: "/app",
    buildDir: "build",
    outputs: ["scratch-pc.exe"], // TODO: support installer
    bundleOS: "windows",
    prebuild: "apt-get update && apt-get install -y mingw-w64 cmake",
  },
  {
    id: "3ds",
    displayName: "3DS",
    dockerfile: "3ds.toolkit.Dockerfile",
    image: "devkitpro/devkitarm:latest",
    containerRoot: "/app",
    buildDir: "build-3ds",
    outputs: ["scratch-3ds.3dsx", "scratch-3ds.cia"],
    bundleOS: "unix",
  },
  {
    id: "psp",
    displayName: "PSP",
    dockerfile: "psp.toolkit.Dockerfile",
    image: "pspdev/pspdev:latest",
    containerRoot: "/app",
    buildDir: "build/psp",
    outputs: ["scratch-psp.zip"],
    bundleOS: "unix",
  },
  {
    id: "wiiu",
    displayName: "Wii U",
    dockerfile: "wiiu.toolkit.Dockerfile",
    image: "dkosmari/devkitppc-wiiu-debian:latest",
    containerRoot: "/project",
    buildDir: "build-wiiu",
    outputs: ["scratch-wiiu.zip"],
    bundleOS: "unix",
    extraPackageTargets: ["package_wiiu"],
  },
  {
    id: "gamecube",
    displayName: "GameCube",
    dockerfile: "gamecube.toolkit.Dockerfile",
    image: "ghcr.io/extremscorner/libogc2:latest",
    containerRoot: "/app",
    buildDir: "build-gamecube",
    outputs: ["scratch-gamecube.zip"],
    bundleOS: "unix",
    romfsDir: "/app/romfs",
  },
  {
    id: "wii",
    displayName: "Wii",
    dockerfile: "wii.toolkit.Dockerfile",
    image: "devkitpro/devkitppc:latest",
    containerRoot: "/app",
    buildDir: "build-wii",
    outputs: ["scratch-wii.zip"],
    bundleOS: "unix",
    romfsDir: "/app/romfs",
  },
  {
    id: "switch",
    displayName: "Switch",
    dockerfile: "switch.toolkit.Dockerfile",
    image: "devkitpro/devkita64:latest",
    containerRoot: "/app",
    buildDir: "build-nx",
    outputs: ["scratch-nx.nro"],
    bundleOS: "unix",
  },
  {
    id: "vita",
    displayName: "Vita",
    dockerfile: "vita.toolkit.Dockerfile",
    image: "vitasdk/vitasdk:latest",
    containerRoot: "/app",
    buildDir: "build-vita",
    outputs: ["scratch-vita.vpk"],
    bundleOS: "unix",
    extraPackageTargets: [
      "scratch-everywhere-velf",
      "scratch-vita.self-self",
      "scratch-vita.vpk-vpk",
    ],
  },
  {
    id: "ps4",
    displayName: "PS4",
    dockerfile: "ps4.toolkit.Dockerfile",
    image: "gradylink/pacbrew:latest",
    containerRoot: "/app",
    buildDir: "build-ps4",
    outputs: ["scratch-ps4.pkg"],
    bundleOS: "unix",
    extraPackageTargets: ["scratch-everywhere_self", "scratch-everywhere_pkg"],
  },
  {
    id: "nds",
    displayName: "DS",
    dockerfile: "nds.toolkit.Dockerfile",
    image: "skylyrac/blocksds:slim-latest",
    containerRoot: "/app",
    buildDir: "build-nds",
    outputs: ["scratch-ds.nds"],
    bundleOS: "unix",
    romfsDir: "/app/romfs",
    extraPackageTargets: ["scratch-everywhere_nds"],
  },
  {
    id: "wasm",
    displayName: "Wasm",
    dockerfile: "wasm.toolkit.Dockerfile",
    image: "emscripten/emsdk:latest",
    containerRoot: "/app",
    buildDir: "build-wasm",
    outputs: ["index.html", "index.js", "index.wasm"],
    bundleOS: "wasm",
  },
  {
    id: "webos",
    displayName: "webOS",
    dockerfile: "webos.toolkit.Dockerfile",
    image: "node:20-trixie-slim",
    containerRoot: "/app",
    buildDir: "build/webos",
    outputs: ["*.ipk"],
    bundleOS: "unix",
    extraPackageTargets: ["package"],
    prebuild:
      "apt-get update && apt-get install -y --no-install-recommends cmake && npm install -g @webos-tools/cli",
    cmakePreinstallStub: true,
  },
];

export const getPlatform = (id: string): PackagerPlatform | undefined => {
  return PACKAGER_PLATFORMS.find((p) => p.id === id);
};
