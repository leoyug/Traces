import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exiftool } from "exiftool-vendored";
import sharp from "sharp";
import type { PhotoAssetManifest } from "../../src/lib/photo-types";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../..");
const manifestPath = path.join(projectRoot, "src/data/photo-assets.generated.json");
const publishedPhotoDirectory = path.join(projectRoot, "public/media/photos");
const forbiddenPattern = /(gps|latitude|longitude|altitude|serialnumber|ownername|artist|copyright)/i;

export async function auditPhotos() {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as PhotoAssetManifest;
  const errors: string[] = [];
  const slugs = new Set<string>();
  const allowedFiles = new Set(manifest.photos.flatMap((photo) => photo.variants.map((variant) => variant.src.replace(/^\//, ""))));

  async function walk(directory: string): Promise<string[]> {
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      return (await Promise.all(entries.map(async (entry) => {
        const absolute = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(absolute) : [path.relative(path.join(projectRoot, "public"), absolute)];
      }))).flat();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  const publishedFiles = await walk(publishedPhotoDirectory);
  for (const file of publishedFiles) {
    if (!allowedFiles.has(file)) errors.push(`发现未被 Manifest 引用的公开照片文件：/${file}`);
  }

  if (manifest.version !== 1) errors.push("照片 Manifest 版本无效");
  for (const photo of manifest.photos) {
    if (slugs.has(photo.slug)) errors.push(`照片短名重复：${photo.slug}`);
    slugs.add(photo.slug);
    if (!photo.variants.length) errors.push(`${photo.slug}: 没有发布资产`);
    if (forbiddenPattern.test(JSON.stringify(photo))) errors.push(`${photo.slug}: Manifest 包含禁止的敏感字段名`);

    for (const variant of photo.variants) {
      const relative = variant.src.replace(/^\//, "");
      const filePath = path.resolve(projectRoot, "public", relative);
      if (!filePath.startsWith(`${path.join(projectRoot, "public/media/photos")}${path.sep}`)) {
        errors.push(`${photo.slug}: 发布资产位于允许目录之外：${variant.src}`);
        continue;
      }
      try {
        const fileStat = await stat(filePath);
        const metadata = await sharp(filePath).metadata();
        if (fileStat.size !== variant.bytes) errors.push(`${variant.src}: 文件大小与 Manifest 不一致`);
        if (metadata.width !== variant.width || metadata.height !== variant.height) errors.push(`${variant.src}: 图片尺寸与 Manifest 不一致`);
        if (Math.max(variant.width, variant.height) > 2400) errors.push(`${variant.src}: 发布资产最长边超过 2400px`);
        const tags = await exiftool.read(filePath);
        const sensitive = Object.entries(tags).filter(([key, value]) => forbiddenPattern.test(key) && value !== undefined && value !== "");
        if (sensitive.length) errors.push(`${variant.src}: 仍含敏感元数据 ${sensitive.map(([key]) => key).join(", ")}`);
      } catch (error) {
        errors.push(`${variant.src}: ${error instanceof Error ? error.message : "无法读取发布资产"}`);
      }
    }
  }

  await exiftool.end();
  if (errors.length) throw new Error(`照片审计失败：\n- ${errors.join("\n- ")}`);
  console.log(`照片审计通过：${manifest.photos.length} 张照片，${manifest.photos.reduce((count, photo) => count + photo.variants.length, 0)} 个发布资产。`);
}

auditPhotos().catch(async (error) => {
  await exiftool.end().catch(() => undefined);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
