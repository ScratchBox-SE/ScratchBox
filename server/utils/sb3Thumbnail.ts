import AdmZip from "adm-zip";
import sharp from "sharp";

const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;
const OUTPUT_WIDTH = 408;
const OUTPUT_HEIGHT = 306;
const MAX_LAYER_DIMENSION = 4096;

interface Costume {
  assetId: string;
  md5ext?: string;
  dataFormat: string;
  bitmapResolution?: number;
  rotationCenterX: number;
  rotationCenterY: number;
}

interface Target {
  isStage: boolean;
  visible?: boolean;
  x?: number;
  y?: number;
  size?: number;
  direction?: number;
  rotationStyle?: string;
  currentCostume?: number;
  layerOrder?: number;
  costumes?: Costume[];
}

interface Layer {
  input: Buffer;
  left: number;
  top: number;
}

const renderTarget = async (
  zip: AdmZip,
  target: Target,
): Promise<Layer | null> => {
  const costumes = target.costumes ?? [];
  const costume = costumes[target.currentCostume ?? 0] ?? costumes[0];
  if (!costume) return null;

  const entry = zip.getEntry(
    costume.md5ext ?? `${costume.assetId}.${costume.dataFormat}`,
  );
  if (!entry) return null;
  const data = entry.getData();

  const isSvg = costume.dataFormat.toLowerCase() === "svg";
  const resolution = isSvg ? 1 : costume.bitmapResolution || 2;
  let scale = (target.isStage ? 1 : (target.size ?? 100) / 100) / resolution;
  if (!(scale > 0)) return null;

  const { width: baseWidth, height: baseHeight } = await sharp(data).metadata();
  if (!baseWidth || !baseHeight) return null;
  scale = Math.min(
    scale,
    MAX_LAYER_DIMENSION / Math.max(baseWidth, baseHeight),
  );

  const image = isSvg
    ? sharp(data, { density: 72 * scale })
    : sharp(data).resize(
      Math.max(1, Math.round(baseWidth * scale)),
      Math.max(1, Math.round(baseHeight * scale)),
    );
  const rendered = await image.ensureAlpha().png().toBuffer({
    resolveWithObject: true,
  });

  let { width, height } = rendered.info;
  let input = rendered.data;
  let centerX = costume.rotationCenterX * (width / baseWidth);
  let centerY = costume.rotationCenterY * (height / baseHeight);

  const stageX = STAGE_WIDTH / 2 + (target.isStage ? 0 : target.x ?? 0);
  const stageY = STAGE_HEIGHT / 2 - (target.isStage ? 0 : target.y ?? 0);

  if (!target.isStage) {
    const direction = target.direction ?? 90;
    let angle = 0;
    if (target.rotationStyle === "left-right") {
      if (direction < 0) {
        input = await sharp(input).flop().png().toBuffer();
        centerX = width - centerX;
      }
    } else if (target.rotationStyle !== "don't rotate") {
      angle = direction - 90;
    }

    if (angle % 360 !== 0) {
      const paddedWidth = Math.ceil(Math.max(centerX, width - centerX)) * 2;
      const paddedHeight = Math.ceil(Math.max(centerY, height - centerY)) * 2;
      const left = Math.round(paddedWidth / 2 - centerX);
      const top = Math.round(paddedHeight / 2 - centerY);
      const rotated = await sharp(input).extend({
        left,
        top,
        right: Math.max(0, paddedWidth - width - left),
        bottom: Math.max(0, paddedHeight - height - top),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      }).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png().toBuffer({ resolveWithObject: true });

      input = rotated.data;
      width = rotated.info.width;
      height = rotated.info.height;
      centerX = width / 2;
      centerY = height / 2;
    }
  }

  const left = Math.round(stageX - centerX);
  const top = Math.round(stageY - centerY);
  const x0 = Math.max(0, left);
  const y0 = Math.max(0, top);
  const x1 = Math.min(STAGE_WIDTH, left + width);
  const y1 = Math.min(STAGE_HEIGHT, top + height);
  if (x1 <= x0 || y1 <= y0) return null;

  return {
    input: await sharp(input).extract({
      left: x0 - left,
      top: y0 - top,
      width: x1 - x0,
      height: y1 - y0,
    }).png().toBuffer(),
    left: x0,
    top: y0,
  };
};

export const generateSb3Thumbnail = async (file: Buffer): Promise<Buffer> => {
  const zip = new AdmZip(file);
  const project = JSON.parse(
    zip.getEntry("project.json")!.getData().toString("utf-8"),
  ) as { targets: Target[] };

  const targets = [...project.targets].sort((a, b) =>
    (a.layerOrder ?? 0) - (b.layerOrder ?? 0)
  );

  const layers: Layer[] = [];
  for (const target of targets) {
    if (!target.isStage && target.visible === false) continue;
    try {
      const layer = await renderTarget(zip, target);
      if (layer) layers.push(layer);
    } catch {
    }
  }

  const stage = await sharp({
    create: {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).composite(layers).png().toBuffer();

  return await sharp(stage).resize(OUTPUT_WIDTH, OUTPUT_HEIGHT).png()
    .toBuffer();
};
