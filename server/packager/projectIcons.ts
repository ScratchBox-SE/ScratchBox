import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { PackagerPlatform } from "./platforms";

interface IconSpec {
  relPath: string;
  width: number;
  height: number;
  format: "png" | "jpeg" | "bmp24" | "ico";
  posterize?: boolean; // for vita
  quantizeColors?: number; // for nds
}

const PLATFORM_ICON_SPECS: Record<string, IconSpec[]> = {
  ps4: [
    { relPath: "gfx/ps4/icon0.png", width: 512, height: 512, format: "png" },
    { relPath: "gfx/ps4/pic0.png", width: 1920, height: 1080, format: "png" },
    { relPath: "gfx/ps4/pic1.png", width: 1920, height: 1080, format: "png" },
  ],
  psp: [
    { relPath: "gfx/psp/ICON0.png", width: 144, height: 80, format: "png" },
    { relPath: "gfx/psp/PIC1.png", width: 480, height: 272, format: "png" },
  ],
  vita: [
    {
      relPath: "gfx/vita/icon0.png",
      width: 128,
      height: 128,
      format: "png",
      posterize: true,
    },
    {
      relPath: "gfx/vita/livearea/contents/bg.png",
      width: 840,
      height: 500,
      format: "png",
      posterize: true,
    },
    {
      relPath: "gfx/vita/livearea/contents/startup.png",
      width: 280,
      height: 158,
      format: "png",
      posterize: true,
    },
  ],
  wii: [
    { relPath: "gfx/wii/icon.png", width: 128, height: 48, format: "png" },
  ],
  nds: [
    {
      relPath: "gfx/nds/icon.bmp",
      width: 32,
      height: 32,
      format: "bmp24",
      quantizeColors: 16,
    },
  ],
  "3ds": [
    { relPath: "gfx/3ds/banner.png", width: 256, height: 128, format: "png" },
    { relPath: "gfx/icon.png", width: 48, height: 48, format: "png" },
  ],
  windows: [
    { relPath: "gfx/windows/icon.ico", width: 0, height: 0, format: "ico" },
  ],
  wiiu: [
    { relPath: "gfx/wiiu/hbl-icon.png", width: 256, height: 96, format: "png" },
    { relPath: "gfx/wiiu/icon.png", width: 128, height: 128, format: "png" },
    {
      relPath: "gfx/wiiu/tv-splash.png",
      width: 1280,
      height: 720,
      format: "png",
    },
    {
      relPath: "gfx/wiiu/drc-splash.png",
      width: 854,
      height: 480,
      format: "png",
    },
  ],
  switch: [
    { relPath: "gfx/switch/icon.jpg", width: 256, height: 256, format: "jpeg" },
  ],
  webos: [
    { relPath: "gfx/webos/icon.png", width: 128, height: 128, format: "png" },
    {
      relPath: "gfx/webos/splash.png",
      width: 1920,
      height: 1080,
      format: "png",
    },
  ],
};

const ICO_SIZES = [16, 32, 48, 256];

export interface GeneratedIcon {
  absPath: string;
  hostPath: string;
}

export const generateProjectIcons = async (
  platform: PackagerPlatform,
  thumbnailPath: string,
  stageDir: string,
): Promise<GeneratedIcon[]> => {
  const specs = PLATFORM_ICON_SPECS[platform.id];
  if (!specs || !fs.existsSync(thumbnailPath)) return [];

  const results: GeneratedIcon[] = [];
  for (const spec of specs) {
    const hostPath = path.join(stageDir, spec.relPath);
    fs.mkdirSync(path.dirname(hostPath), { recursive: true });

    if (spec.format === "bmp24") {
      await writeBmp24(
        thumbnailPath,
        hostPath,
        spec.width,
        spec.height,
        spec.quantizeColors,
      );
    } else if (spec.format === "ico") {
      await writeIco(thumbnailPath, hostPath);
    } else if (spec.posterize) {
      const rawPng = `${hostPath}.raw.png`;
      await sharp(thumbnailPath)
        .resize(spec.width, spec.height, { fit: "cover" })
        .png()
        .toFile(rawPng);
      execFileSync("pngquant", [
        "--force",
        "--posterize",
        "4",
        "--output",
        hostPath,
        "--",
        rawPng,
      ]);
      fs.rmSync(rawPng);
    } else if (spec.format === "jpeg") {
      await sharp(thumbnailPath)
        .resize(spec.width, spec.height, { fit: "cover" })
        .jpeg()
        .toFile(hostPath);
    } else {
      await sharp(thumbnailPath)
        .resize(spec.width, spec.height, { fit: "cover" })
        .png()
        .toFile(hostPath);
    }

    results.push({
      absPath: `${platform.containerRoot}/${spec.relPath}`,
      hostPath,
    });
  }
  return results;
};

const writeBmp24 = async (
  src: string,
  dest: string,
  width: number,
  height: number,
  quantizeColors?: number,
): Promise<void> => {
  let pixelSource = src;
  if (quantizeColors) {
    const resized = `${dest}.resized.png`;
    const quantized = `${dest}.quantized.png`;
    await sharp(src)
      .resize(width, height, { fit: "cover" })
      .png()
      .toFile(resized);
    execFileSync("pngquant", [
      "--force",
      String(quantizeColors),
      "--output",
      quantized,
      "--",
      resized,
    ]);
    fs.rmSync(resized);
    pixelSource = quantized;
  }

  const { data } = await sharp(pixelSource)
    .resize(width, height, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (quantizeColors) fs.rmSync(pixelSource);

  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;

  const buf = Buffer.alloc(fileSize);
  buf.write("BM", 0, "ascii");
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);

  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelDataSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  for (let y = 0; y < height; y++) {
    const srcRow = height - 1 - y;
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcRow * width + x) * 3;
      const dstIdx = rowOffset + x * 3;
      buf[dstIdx] = data[srcIdx + 2] as number;
      buf[dstIdx + 1] = data[srcIdx + 1] as number;
      buf[dstIdx + 2] = data[srcIdx] as number;
    }
  }

  fs.writeFileSync(dest, buf);
};

const writeIco = async (src: string, dest: string): Promise<void> => {
  const pngs = await Promise.all(
    ICO_SIZES.map((size) =>
      sharp(src).resize(size, size, { fit: "cover" }).png().toBuffer()
    ),
  );

  const headerSize = 6 + 16 * pngs.length;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);

  pngs.forEach((png, i) => {
    const entryOffset = 6 + i * 16;
    const size = ICO_SIZES[i] as number;
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset);
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(png.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += png.length;
  });

  fs.writeFileSync(dest, Buffer.concat([header, ...pngs]));
};
