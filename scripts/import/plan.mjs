import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import matter from "gray-matter";
import mammoth from "mammoth";
import TurndownService from "turndown";
import { explicitPublicPhotoMetadata, readPublicPhotoMetadataFromBuffer } from "./photo-metadata.mjs";
import { normalizeProjectStatus } from "../../src/lib/project-status.js";

const imagePattern = /\.(jpe?g|png|webp|avif)$/i;
const markdownPattern = /\.(md|mdx)$/i;
const MAX_FILES = 100;
const MAX_TOTAL_BYTES = 80_000_000;

export function safePath(value) {
  const normalized = String(value).replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").some((part) => part === ".." || !part)) {
    throw new Error(`文件路径无效：${value}`);
  }
  return normalized;
}

export function slugify(value) {
  const latin = String(value).normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return latin || `entry-${createHash("sha1").update(String(value)).digest("hex").slice(0, 10)}`;
}

const stem = (name) => path.posix.basename(name).replace(/\.[^.]+$/, "");
const parent = (name) => path.posix.dirname(name);
const tidy = (value) => String(value ?? "").trim();
const date = (value, fallback) => {
  const parsed = new Date(value || fallback);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
};
const words = (value) => Math.max(1, Math.ceil((value.match(/[\u3400-\u9fff]/g)?.length ?? 0) / 300 + (value.match(/[a-zA-Z]+/g)?.length ?? 0) / 220));

function summary(body) {
  const paragraph = body.split(/\n\s*\n/).map((part) => part.replace(/^[\s#>*-]+/gm, "").trim()).find(Boolean) ?? "";
  return paragraph.replace(/!\[[^\]]*\]\([^)]*\)|\[[^\]]+\]\([^)]*\)|[`*_]/g, "").replace(/\s+/g, " ").slice(0, 140);
}

function findImageReference(document, image) {
  const relative = path.posix.relative(parent(document.path), image.path);
  const names = [relative, `./${relative}`, image.path];
  return names.some((name) => document.body.includes(`(${name})`) || document.body.includes(`(<${name}>)`));
}

function findProjectMatch(image, projectSlugs) {
  const parts = image.path.split("/");
  const imageStem = slugify(stem(image.path));
  for (const slug of [...projectSlugs].sort((a, b) => b.length - a.length)) {
    if (parts.some((part) => slugify(part) === slug) || imageStem === slug || imageStem.startsWith(`${slug}-`)) return slug;
  }
  return null;
}

function imageRole(image) {
  return /(^|[-_\/])(cover|封面)([-_\/.]|$)/i.test(image.path) ? "cover" : "archive";
}

function explicitRelations(body, frontmatter, field, route, known, titles) {
  const values = Array.isArray(frontmatter[field]) ? frontmatter[field] : frontmatter[field] ? [frontmatter[field]] : [];
  const related = new Set(values.map((value) => known.has(value) ? value : titles.get(value)).filter(Boolean));
  for (const match of body.matchAll(new RegExp(`\\/${route}\\/([a-z0-9-]+)`, "gi"))) {
    if (known.has(match[1])) related.add(match[1]);
  }
  return [...related];
}

async function photoMetadata(image) {
  if (!image) return { fields: {}, warning: undefined };
  try {
    return { fields: await readPublicPhotoMetadataFromBuffer(image.buffer, image.path), warning: undefined };
  } catch {
    return { fields: {}, warning: "无法读取照片拍摄信息；请在后台手动填写。" };
  }
}

function photoMetadataPreview(metadata) {
  return [metadata.capturedAt, metadata.place, metadata.camera, metadata.lens, metadata.focalLength,
    metadata.aperture, metadata.shutterSpeed, metadata.iso && `ISO ${metadata.iso}`].filter(Boolean).join(" · ");
}

function photoMetadataWarnings(metadata, readWarning) {
  if (readWarning) return [readWarning];
  return Object.keys(metadata).length
    ? ["拍摄信息已预填到草稿；发布前请核对。地点不会从照片坐标自动填写。"]
    : ["照片没有可识别的拍摄信息；可在后台手动补充。"];
}

export async function buildImportPlan(files, root, category) {
  if (!["project", "article", "photo"].includes(category)) throw new Error("请先选择项目、写作或摄影。");
  if (!files.length) throw new Error("请先选择文件或文件夹。");
  if (files.length > MAX_FILES || files.reduce((sum, file) => sum + file.buffer.length, 0) > MAX_TOTAL_BYTES) {
    throw new Error("一次最多导入 100 个文件、总计 80 MB。请分批导入。");
  }
  const normalized = files.map((file, index) => ({ ...file, index, path: safePath(file.path) }));
  if (category !== "photo") {
    for (const file of normalized.filter((entry) => /\.docx$/i.test(entry.path))) {
      const extracted = [];
      const html = await mammoth.convertToHtml({ buffer: file.buffer }, {
        convertImage: mammoth.images.imgElement(async (image) => {
          const extension = image.contentType === "image/png" ? "png" : image.contentType === "image/jpeg" ? "jpg" : "webp";
          const imageName = `${stem(file.path)}-embedded-${extracted.length + 1}.${extension}`;
          extracted.push({ path: path.posix.join(parent(file.path), imageName), buffer: await image.readAsBuffer() });
          return { src: imageName };
        }),
      });
      const markdown = new TurndownService({ headingStyle: "atx" }).turndown(html.value)
        .replace(/\]\((?:javascript|data):[^)]*\)/gi, "](#)");
      file.sourcePath = file.path;
      file.path = file.path.replace(/\.docx$/i, ".md");
      file.buffer = Buffer.from(markdown);
      for (const image of extracted) normalized.push({ ...image, index: normalized.length });
    }
  }
  if (new Set(normalized.map((file) => file.path.toLowerCase())).size !== normalized.length) throw new Error("上传文件中有重名路径，请调整后重试。");
  const existing = { project: new Set(), article: new Set(), photo: new Set() };
  const titles = { project: new Map(), article: new Map() };
  for (const [kind, folder, ext] of [["project", "projects", ".md"], ["article", "articles", ".md"], ["photo", "photos", ".json"]]) {
    for (const name of await readdir(path.join(root, "src/content", folder))) {
      if (!name.endsWith(ext)) continue;
      const slug = name.slice(0, -ext.length).toLowerCase();
      existing[kind].add(slug);
      if (kind !== "photo") {
        try {
          const document = matter(await readFile(path.join(root, "src/content", folder, name), "utf8"));
          if (document.data.title) titles[kind].set(String(document.data.title), slug);
        } catch { /* Existing content validation reports invalid records. */ }
      }
    }
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const images = normalized.filter((file) => imagePattern.test(file.path)).sort((a, b) => a.path.localeCompare(b.path, "zh-CN", { numeric: true }));
  const usedImages = new Set();
  const items = [];
  const documents = [];
  let nextProjectOrder = existing.project.size + 1;
  let nextArticleOrder = existing.article.size + 1;
  for (const file of normalized.filter((candidate) => category !== "photo" && markdownPattern.test(candidate.path))) {
    const parsed = matter(file.buffer.toString("utf8"));
    const kind = category;
    const rawSlug = parsed.data.slug || stem(file.path);
    const slug = slugify(rawSlug);
    const title = tidy(parsed.data.title) || (file.sourcePath ? tidy(parsed.content.match(/^#\s+(.+)$/m)?.[1]) : "") || stem(file.path).replace(/[-_]/g, " ");
    const description = tidy(parsed.data.description) || summary(parsed.content) || title;
    const payload = {
      ...parsed.data,
      title,
      description,
      publishedAt: date(parsed.data.publishedAt, today),
      draft: true,
    };
    if (kind === "project") {
      const year = Number(payload.year);
      payload.period = tidy(payload.period) || String(Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : Number(payload.publishedAt.slice(0, 4)));
      delete payload.year;
      payload.status = normalizeProjectStatus(payload);
      delete payload.label;
      delete payload.accent;
      payload.featured = false;
      payload.order = nextProjectOrder++;
    } else {
      payload.order = nextArticleOrder++;
      payload.tags = Array.isArray(payload.tags) ? payload.tags.map(String) : [];
      const readingMinutes = Number(payload.readingMinutes);
      payload.readingMinutes = Number.isInteger(readingMinutes) && readingMinutes >= 1 ? readingMinutes : words(parsed.content);
      payload.featured = false;
    }
    delete payload.slug;
    const item = {
      id: items.length,
      kind,
      action: existing[kind].has(slug) ? "skip" : "create",
      slug, title, source: file.sourcePath ?? file.path, fileIndices: [file.index],
      warnings: [], payload, body: parsed.content, assets: [],
    };
    if (item.action === "skip") item.warnings.push("同名内容已存在；不会覆盖。请在 Keystatic 中编辑现有内容。");
    if (!parsed.data.title) item.warnings.push("标题来自文件名，请核对。");
    if (slug.startsWith("entry-")) item.warnings.push("短名由中文文件名自动生成，请在首次发布前核对网址短名。");
    if (!parsed.data.description) item.warnings.push("摘要从正文提取，请核对。");
    if (kind === "project" && !tidy(parsed.data.period) && !parsed.data.year) item.warnings.push("未提供项目时间，暂用发布年份，请核对实际项目时间。");
    items.push(item);
    documents.push({ ...file, body: parsed.content, item });
  }
  const projectSlugs = new Set([...existing.project, ...items.filter((item) => item.kind === "project").map((item) => item.slug)]);
  const articleSlugs = new Set([...existing.article, ...items.filter((item) => item.kind === "article").map((item) => item.slug)]);
  for (const item of items.filter((candidate) => candidate.kind === "project" || candidate.kind === "article")) titles[item.kind].set(item.title, item.slug);
  const archiveSlots = new Map();
  for (const slug of existing.project) {
    try {
      const project = matter(await readFile(path.join(root, "src/content/projects", `${slug}.md`), "utf8"));
      archiveSlots.set(slug, Math.max(0, 3 - (Array.isArray(project.data.archiveImages) ? project.data.archiveImages.length : 0)));
    } catch { archiveSlots.set(slug, 0); }
  }
  const documentFolderCounts = new Map();
  for (const document of documents) documentFolderCounts.set(parent(document.path), (documentFolderCounts.get(parent(document.path)) ?? 0) + 1);
  for (const document of documents) {
    const item = document.item;
    for (const image of images) {
      if (usedImages.has(image.index)) continue;
      const sameFolder = parent(image.path) === parent(document.path) && documentFolderCounts.get(parent(document.path)) === 1;
      const folderSlug = image.path.split("/").some((part) => slugify(part) === item.slug);
      const reference = findImageReference(document, image);
      const matchedProject = item.kind === "project" ? findProjectMatch(image, projectSlugs) : null;
      const claimedByAnotherProject = matchedProject !== null && matchedProject !== item.slug;
      if (claimedByAnotherProject && !reference) continue;
      if (reference || (item.kind === "project" && (folderSlug || sameFolder))) {
        item.assets.push({ fileIndex: image.index, role: imageRole(image) === "cover" ? "cover" : reference ? "inline" : "archive" });
        item.fileIndices.push(image.index);
        usedImages.add(image.index);
      }
    }
    if (item.kind === "project") item.payload.relatedArticles = explicitRelations(item.body, item.payload, "relatedArticles", "writing", articleSlugs, titles.article);
    else item.payload.relatedProjects = explicitRelations(item.body, item.payload, "relatedProjects", "projects", projectSlugs, titles.project);
    const linkedImages = [...item.body.matchAll(/!\[[^\]]*\]\(<?([^)>]+)>?\)/g)].map((match) => match[1]);
    for (const target of linkedImages) {
      if (/^(https?:|data:|\/)/i.test(target)) continue;
      const resolved = path.posix.normalize(path.posix.join(parent(document.path), target));
      if (!item.assets.some((asset) => normalized[asset.fileIndex].path === resolved)) item.warnings.push(`正文图片未随文稿上传：${target}`);
    }
    if (item.kind === "project") {
      const covers = item.assets.filter((asset) => asset.role === "cover");
      const archives = item.assets.filter((asset) => asset.role === "archive");
      const overflow = [...covers.slice(1), ...archives.slice(covers.length ? 3 : 4)];
      if (overflow.length) {
        const ignored = new Set(overflow.map((asset) => asset.fileIndex));
        item.assets = item.assets.filter((asset) => !ignored.has(asset.fileIndex));
        item.fileIndices = item.fileIndices.filter((index) => !ignored.has(index));
        item.warnings.push("多余图片未导入：项目最多使用一张封面与三张档案图片。正文中明确引用的图片仍会保留。");
        for (const asset of overflow) {
          const file = normalized[asset.fileIndex];
          items.push({ id: items.length, kind: "unsupported", action: "skip", title: file.path, source: file.path, warnings: ["超出封面和档案图片数量；如需放进正文，请先在文稿中引用它。"] });
        }
      }
    }
  }
  const photoRecords = normalized.filter((file) => category === "photo" && file.path.toLowerCase().endsWith(".json"));
  let nextOrder = 1;
  for (const name of await readdir(path.join(root, "src/content/photos"))) {
    if (!name.endsWith(".json")) continue;
    try {
      const photo = JSON.parse(await readFile(path.join(root, "src/content/photos", name), "utf8"));
      nextOrder = Math.max(nextOrder, Number(photo.order || 0) + 1);
    } catch { /* Existing content validation reports invalid records. */ }
  }
  for (const file of photoRecords) {
    let data;
    try { data = JSON.parse(file.buffer.toString("utf8")); } catch {
      items.push({ id: items.length, kind: "unsupported", action: "skip", title: file.path, source: file.path, warnings: ["JSON 格式无效。"] });
      continue;
    }
    if (!data.src && !data.alt) {
      items.push({ id: items.length, kind: "unsupported", action: "skip", title: file.path, source: file.path, warnings: ["JSON 不是照片记录。"] });
      continue;
    }
    const slug = slugify(stem(file.path));
    const image = images.find((candidate) => !usedImages.has(candidate.index) && (
      candidate.path.split("/").some((part) => slugify(part) === slug) || stem(candidate.path) === stem(file.path) || (data.src && candidate.path.endsWith(data.src.replace(/^\//, "")))
    ));
    const extracted = await photoMetadata(image);
    const publicMetadata = { ...extracted.fields, ...explicitPublicPhotoMetadata(data.publicMetadata) };
    const item = { id: items.length, kind: "photo", action: image && !existing.photo.has(slug) ? "create" : "skip",
      slug, title: tidy(data.alt) || stem(file.path), source: file.path, fileIndices: image ? [file.index, image.index] : [file.index],
      warnings: image ? photoMetadataWarnings(publicMetadata, extracted.warning) : [],
      payload: { alt: tidy(data.alt) || `请补充 ${slug} 的画面描述`, order: nextOrder++, draft: true,
        ...(Object.keys(publicMetadata).length ? { publicMetadata } : {}) },
      metadataPreview: photoMetadataPreview(publicMetadata),
      assets: image ? [{ fileIndex: image.index, role: "photo" }] : [] };
    if (existing.photo.has(slug)) item.warnings.push("同名照片已存在；不会覆盖。");
    if (!image) item.warnings.push("未找到对应照片文件；请把图片一同上传。");
    if (!data.alt) item.warnings.push("画面描述需要核对并补充。");
    items.push(item);
    if (image) usedImages.add(image.index);
  }
  for (const image of images) {
    if (usedImages.has(image.index)) continue;
    if (category === "article") {
      items.push({ id: items.length, kind: "unsupported", action: "skip", title: image.path, source: image.path, warnings: ["图片未在文章正文中引用；请把它与对应文稿放在同一文件夹，并在文稿中使用相对图片路径。"] });
      continue;
    }
    if (category === "project") {
    const project = findProjectMatch(image, projectSlugs);
    if (project) {
      const item = items.find((candidate) => candidate.kind === "project" && candidate.slug === project && candidate.action === "create");
      if (item) {
        item.assets.push({ fileIndex: image.index, role: imageRole(image) });
        item.fileIndices.push(image.index);
      } else {
        const role = imageRole(image);
        const available = archiveSlots.get(project) ?? 0;
        const canAttach = role === "cover" || available > 0;
        if (role === "archive" && available > 0) archiveSlots.set(project, available - 1);
        items.push({ id: items.length, kind: canAttach ? "project-image" : "unsupported", action: canAttach ? "update" : "skip", slug: project, title: `关联到项目：${project}`, source: image.path,
          fileIndices: [image.index], warnings: canAttach ? [] : ["该项目已有三张档案图片；可改为封面文件，或先在后台调整图片。"], assets: canAttach ? [{ fileIndex: image.index, role }] : [] });
      }
      usedImages.add(image.index);
      continue;
    }
    items.push({ id: items.length, kind: "unsupported", action: "skip", title: image.path, source: image.path, warnings: ["未找到同名项目；请把图片和项目文稿放在同一文件夹，或用项目短名为图片命名。"] });
    continue;
    }
    const imageStem = stem(image.path);
    const generic = /^(img|dsc|photo|image|pic)[-_]?\d*$/i.test(imageStem) || imageStem === "src";
    const slug = slugify(generic && parent(image.path) !== "." ? path.posix.basename(parent(image.path)) : imageStem);
    const extracted = await photoMetadata(image);
    items.push({ id: items.length, kind: "photo", action: existing.photo.has(slug) ? "skip" : "create", slug,
      title: stem(image.path).replace(/[-_]/g, " "), source: image.path, fileIndices: [image.index],
      warnings: [...(existing.photo.has(slug) ? ["同名照片已存在；不会覆盖。"] : []), "请核对照片画面描述与公开范围。",
        ...photoMetadataWarnings(extracted.fields, extracted.warning)],
      payload: { alt: generic ? `请补充 ${slug} 的画面描述` : stem(image.path).replace(/[-_]/g, " "), order: nextOrder++, draft: true,
        ...(Object.keys(extracted.fields).length ? { publicMetadata: extracted.fields } : {}) },
      metadataPreview: photoMetadataPreview(extracted.fields),
      assets: [{ fileIndex: image.index, role: "photo" }] });
    usedImages.add(image.index);
  }
  const seen = new Set();
  for (const item of items.filter((candidate) => candidate.action === "create")) {
    const key = `${item.kind}:${item.slug}`;
    if (seen.has(key)) {
      item.action = "skip";
      item.warnings.push("这批文件中已有相同短名的内容；请重命名后重新导入。");
    }
    seen.add(key);
  }
  for (const file of normalized) {
    if ((category !== "photo" && markdownPattern.test(file.path)) || imagePattern.test(file.path) || (category === "photo" && file.path.toLowerCase().endsWith(".json"))) continue;
    items.push({ id: items.length, kind: "unsupported", action: "skip", title: file.path, source: file.path, warnings: ["暂不支持此格式。"] });
  }
  return { items, files: normalized };
}
