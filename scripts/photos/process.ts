import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exiftool } from "exiftool-vendored";
import matter from "gray-matter";
import sharp from "sharp";
import type { GeneratedPhotoAsset, PhotoAssetManifest, PhotoVariant } from "../../src/lib/photo-types";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../..");
const contentDirectory = path.join(projectRoot, "src/content/photos");
const privateDirectory = path.join(projectRoot, "private/photos");
const publicDirectory = path.join(projectRoot, "public/media/photos");
const manifestPath = path.join(projectRoot, "src/data/photo-assets.generated.json");
const outputWidths = [480, 960, 1600, 2400];

type PhotoFrontmatter = {
  draft?: boolean;
  sourceFile?: string;
};

async function digest(filePath: string) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function formatExposure(value: unknown) {
  if (typeof value === "number") return value < 1 && value > 0 ? `1/${Math.round(1 / value)} s` : `${value} s`;
  if (typeof value === "string" && value.trim()) return value.includes("s") ? value : `${value} s`;
  return undefined;
}

async function processPhoto(slug: string, sourceFile: string, previous?: GeneratedPhotoAsset): Promise<GeneratedPhotoAsset> {
  const sourcePath = path.resolve(privateDirectory, sourceFile);
  if (!sourcePath.startsWith(`${privateDirectory}${path.sep}`)) {
    throw new Error(`${slug}: sourceFile 必须位于 private/photos/ 内`);
  }
  if (!(await exists(sourcePath))) throw new Error(`${slug}: 找不到照片原件 ${sourceFile}`);

  const sourceDigest = await digest(sourcePath);
  if (previous?.sourceDigest === sourceDigest) {
    const allVariantsExist = (await Promise.all(previous.variants.map((variant) => exists(path.join(projectRoot, "public", variant.src))))).every(Boolean);
    if (allVariantsExist) return previous;
  }

  const image = sharp(sourcePath, { failOn: "error" }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error(`${slug}: 无法读取照片尺寸`);
  const orientedWidth = metadata.autoOrient.width || metadata.width;
  const orientedHeight = metadata.autoOrient.height || metadata.height;
  const targetDirectory = path.join(publicDirectory, slug);
  await mkdir(targetDirectory, { recursive: true });

  const longEdge = Math.max(orientedWidth, orientedHeight);
  const targets = outputWidths.filter((size) => size < longEdge);
  const largestTarget = Math.min(2400, longEdge);
  if (!targets.includes(largestTarget)) targets.push(largestTarget);
  const variants: PhotoVariant[] = [];

  for (const target of [...new Set(targets)].sort((a, b) => a - b)) {
    const landscape = orientedWidth >= orientedHeight;
    const width = landscape ? target : Math.round(orientedWidth * target / orientedHeight);
    const height = landscape ? Math.round(orientedHeight * target / orientedWidth) : target;
    for (const format of ["webp", "jpeg"] as const) {
      const extension = format === "jpeg" ? "jpg" : "webp";
      const fileName = `${width}.${extension}`;
      const destination = path.join(targetDirectory, fileName);
      const pipeline = sharp(sourcePath, { failOn: "error" }).rotate().resize({
        width: landscape ? target : undefined,
        height: landscape ? undefined : target,
        withoutEnlargement: true,
      });
      if (format === "webp") await pipeline.webp({ quality: 82 }).toFile(destination);
      else await pipeline.jpeg({ quality: 86, mozjpeg: true }).toFile(destination);
      variants.push({
        src: `/media/photos/${slug}/${fileName}`,
        width,
        height,
        bytes: (await stat(destination)).size,
        format,
      });
    }
  }

  const { dominant } = await sharp(sourcePath).rotate().resize(32, 32, { fit: "inside" }).stats();
  const placeholder = `rgb(${Math.round(dominant.r)}, ${Math.round(dominant.g)}, ${Math.round(dominant.b)})`;
  const tags = await exiftool.read(sourcePath);
  const make = typeof tags.Make === "string" ? tags.Make.trim() : "";
  const model = typeof tags.Model === "string" ? tags.Model.trim() : "";
  const camera = [make, model].filter(Boolean).filter((value, index, values) => index === 0 || !value.toLowerCase().includes(values[0].toLowerCase())).join(" ") || undefined;
  const lens = typeof tags.LensModel === "string" ? tags.LensModel : undefined;
  const focalValue = tags.FocalLengthIn35mmFormat ?? tags.FocalLength;
  const focalLength = typeof focalValue === "number" ? `${Math.round(focalValue)} mm` : undefined;
  const aperture = typeof tags.FNumber === "number" ? `ƒ/${tags.FNumber}` : undefined;
  const shutterSpeed = formatExposure(tags.ExposureTime);
  const iso = typeof tags.ISO === "number" ? tags.ISO : undefined;

  return {
    slug,
    sourceDigest,
    width: orientedWidth,
    height: orientedHeight,
    aspectRatio: orientedWidth / orientedHeight,
    placeholder,
    variants,
    publicExif: { camera, lens, focalLength, aperture, shutterSpeed, iso },
    processedAt: new Date().toISOString(),
  } satisfies GeneratedPhotoAsset;
}

async function main() {
  const previous = JSON.parse(await readFile(manifestPath, "utf8")) as PhotoAssetManifest;
  const previousBySlug = new Map(previous.photos.map((photo) => [photo.slug, photo]));
  const files = (await readdir(contentDirectory)).filter((file: string) => /\.mdx?$/.test(file));
  const generated: GeneratedPhotoAsset[] = [];

  try {
    for (const file of files) {
      const slug = file.replace(/\.mdx?$/, "");
      const document = matter(await readFile(path.join(contentDirectory, file), "utf8"));
      const data = document.data as PhotoFrontmatter;
      if (data.draft) continue;
      if (!data.sourceFile) {
        const existing = previousBySlug.get(slug);
        if (!existing) throw new Error(`${slug}: 正式照片必须提供 sourceFile 或已有生成资产`);
        generated.push(existing);
        continue;
      }
      generated.push(await processPhoto(slug, data.sourceFile, previousBySlug.get(slug)));
    }
  } finally {
    await exiftool.end();
  }

  const next: PhotoAssetManifest = { version: 1, generatedAt: new Date().toISOString(), photos: generated.sort((a, b) => a.slug.localeCompare(b.slug)) };
  const temporaryPath = `${manifestPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`);
  await rename(temporaryPath, manifestPath);
  console.log(`已生成 ${generated.length} 张照片的发布资产记录。`);
}

main().catch(async (error) => {
  await exiftool.end().catch(() => undefined);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
