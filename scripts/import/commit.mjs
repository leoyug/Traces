import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";

const contentFolder = { project: "projects", article: "articles", photo: "photos" };
const assetFolder = { project: "projects", article: "articles", photo: "photos", "project-image": "projects" };
const allowed = {
  project: ["title", "description", "publishedAt", "updatedAt", "draft", "year", "status", "role", "featured", "order", "accent", "cover", "archiveImages", "privacyNote", "relatedArticles"],
  article: ["title", "description", "publishedAt", "updatedAt", "draft", "tags", "readingMinutes", "featured", "relatedProjects"],
};

function selectFields(kind, data) {
  return Object.fromEntries(allowed[kind].filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
}

async function existingPublicAsset(root, value) {
  if (typeof value !== "string" || !value.startsWith("/")) return false;
  const base = path.join(root, "public");
  const target = path.resolve(base, `.${value}`);
  if (!target.startsWith(`${base}${path.sep}`)) return false;
  try { await access(target); return true; } catch { return false; }
}

async function prepareImage(buffer) {
  let output;
  for (const quality of [84, 76, 68, 60]) {
    output = await sharp(buffer).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer();
    if (output.length <= 2_000_000) break;
  }
  if (!output || output.length > 2_000_000) throw new Error("图片压缩后仍超过 2 MB，请先缩小图片。");
  const metadata = await sharp(output).metadata();
  if (!metadata.width || !metadata.height) throw new Error("无法读取图片尺寸。");
  return { output, metadata };
}

function replaceImageLinks(body, documentPath, assets) {
  return body.replace(/(!\[[^\]]*\]\()<?([^)>]+)>?(\))/g, (whole, before, target, after) => {
    const clean = decodeURIComponent(target.split("#")[0]);
    const absolute = path.posix.normalize(path.posix.join(path.posix.dirname(documentPath), clean));
    const match = assets.find((asset) => asset.file.path === absolute || asset.file.path === clean);
    return match ? `${before}${match.url}${after}` : whole;
  });
}

export async function commitImport(plan, selectedIds, root) {
  const selected = plan.items.filter((item) => selectedIds.includes(item.id) && item.action !== "skip");
  if (!selected.length) throw new Error("没有可导入的内容。");
  const created = [];
  const backups = [];
  const results = [];
  try {
    for (const item of selected) {
      const folder = contentFolder[item.kind];
      if (folder) {
        const target = path.join(root, "src/content", folder, `${item.slug}.${item.kind === "photo" ? "json" : "md"}`);
        try { await readFile(target); throw new Error(`同名内容已存在：${item.slug}`); } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      const writtenAssets = [];
      for (const asset of item.assets ?? []) {
        const file = plan.files[asset.fileIndex];
        const { output, metadata } = await prepareImage(file.buffer);
        const hash = createHash("sha256").update(output).digest("hex").slice(0, 12);
        const prefix = asset.role === "photo" ? "src" : asset.role === "cover" ? "cover" : asset.role === "archive" ? "archive" : "image";
        const relative = `media/${assetFolder[item.kind]}/${item.slug}/${prefix}-${hash}.webp`;
        const target = path.join(root, "public", relative);
        await mkdir(path.dirname(target), { recursive: true });
        try {
          await writeFile(target, output, { flag: "wx" });
          created.push(target);
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
        }
        writtenAssets.push({ ...asset, file, url: `/${relative}`, metadata });
      }
      if (item.kind === "project" || item.kind === "article") {
        const data = selectFields(item.kind, { ...item.payload });
        if (item.kind === "project") {
          if (data.cover && !(await existingPublicAsset(root, data.cover))) delete data.cover;
          if (Array.isArray(data.archiveImages)) {
            const valid = await Promise.all(data.archiveImages.map((value) => existingPublicAsset(root, value)));
            data.archiveImages = data.archiveImages.filter((_, index) => valid[index]);
          }
          const cover = writtenAssets.find((asset) => asset.role === "cover") ?? writtenAssets.find((asset) => asset.role === "archive");
          if (cover) data.cover = cover.url;
          const archive = writtenAssets.filter((asset) => asset.role === "archive" && asset !== cover).slice(0, 3).map((asset) => asset.url);
          if (archive.length) data.archiveImages = archive;
        }
        const body = replaceImageLinks(item.body, item.source, writtenAssets);
        const target = path.join(root, "src/content", contentFolder[item.kind], `${item.slug}.md`);
        await writeFile(target, matter.stringify(body, data), { flag: "wx" });
        created.push(target);
        results.push({ kind: item.kind, slug: item.slug, action: "created" });
      } else if (item.kind === "photo") {
        const photo = writtenAssets[0];
        if (!photo) throw new Error(`照片 ${item.slug} 缺少图片。`);
        if (photo.metadata.width === photo.metadata.height) throw new Error(`照片 ${item.slug} 是正方形，当前摄影布局暂不支持。`);
        const portrait = photo.metadata.height > photo.metadata.width;
        const data = { src: photo.url, alt: item.payload.alt, order: item.payload.order, size: portrait ? "tall" : "short", orientation: portrait ? "portrait" : "landscape", width: photo.metadata.width, height: photo.metadata.height, draft: true,
          ...(item.payload.publicMetadata ? { publicMetadata: item.payload.publicMetadata } : {}) };
        const target = path.join(root, "src/content/photos", `${item.slug}.json`);
        await writeFile(target, `${JSON.stringify(data, null, 2)}\n`, { flag: "wx" });
        created.push(target);
        results.push({ kind: item.kind, slug: item.slug, action: "created" });
      } else if (item.kind === "project-image") {
        const target = path.join(root, "src/content/projects", `${item.slug}.md`);
        const original = await readFile(target);
        backups.push({ target, original });
        const parsed = matter(original.toString("utf8"));
        const cover = writtenAssets.find((asset) => asset.role === "cover");
        if (cover) parsed.data.cover = cover.url;
        else {
          const previous = Array.isArray(parsed.data.archiveImages) ? parsed.data.archiveImages : [];
          if (previous.length >= 3) throw new Error(`项目 ${item.slug} 已有三张档案图片；请在后台调整后再导入。`);
          parsed.data.archiveImages = [...previous, ...writtenAssets.map((asset) => asset.url)];
        }
        await writeFile(target, matter.stringify(parsed.content, parsed.data));
        results.push({ kind: item.kind, slug: item.slug, action: "updated" });
      }
    }
    return results;
  } catch (error) {
    for (const backup of backups.reverse()) await writeFile(backup.target, backup.original);
    for (const target of created.reverse()) await rm(target, { force: true });
    throw error;
  }
}
