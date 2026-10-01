import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const content = path.join(root, "src/content/photos");
const output = path.join(root, "dist");
let removed = 0;
const photos = await Promise.all((await readdir(content)).filter((name) => name.endsWith(".json"))
  .map(async (name) => ({ name, ...JSON.parse(await readFile(path.join(content, name), "utf8")) })));
const publishedSources = new Set(photos.filter((photo) => !photo.draft).map((photo) => photo.src));

for (const photo of photos) {
  if (!photo.draft || !photo.src?.startsWith("/media/photos/") || publishedSources.has(photo.src)) continue;
  const file = path.resolve(output, `.${photo.src}`);
  if (!file.startsWith(`${path.join(output, "media/photos")}${path.sep}`)) throw new Error(`${photo.name}: 图片路径无效`);
  await rm(file, { force: true });
  removed++;
}

console.log(`已从构建结果移除 ${removed} 张草稿照片。`);
