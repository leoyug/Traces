import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";

const pending = new Map();

async function initialCreationTime(root, collection, file) {
  let source = file.filepath;
  // Reordering can replace photo records atomically. The original asset is a
  // better local creation record for photos that predate this registry.
  if (collection === "photos" && typeof file.data.src === "string") {
    const publicRoot = path.join(root, "public");
    const candidate = path.resolve(publicRoot, `.${file.data.src}`);
    if (["media/photos", "assets/figma-v03/photos"].some(folder => candidate.startsWith(`${path.join(publicRoot, folder)}${path.sep}`))) {
      try { const asset = await stat(candidate); return asset.birthtimeMs || asset.mtimeMs; }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
  const record = await stat(source);
  return record.birthtimeMs || record.mtimeMs;
}

// Keep CMS upload order outside public content. Once assigned, editing and
// publishing never derive it again from mutable filesystem timestamps.
export async function uploadPositions(root, collection, files) {
  if (!["photos", "projects", "articles"].includes(collection)) throw new Error("未知内容栏目。");
  const target = path.join(root, "private/cms", `upload-order-${collection}.json`);
  const previous = pending.get(target) ?? Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    let saved;
    try { saved = JSON.parse(await readFile(target, "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; saved = { next: 1, entries: [] }; }
    if (!Number.isSafeInteger(saved.next) || saved.next < 1 || !Array.isArray(saved.entries)
      || saved.entries.some(entry => typeof entry.slug !== "string" || !Number.isSafeInteger(entry.position) || entry.position < 1 || entry.position >= saved.next)
      || new Set(saved.entries.map(entry => entry.slug)).size !== saved.entries.length
      || new Set(saved.entries.map(entry => entry.position)).size !== saved.entries.length) throw new Error("上传顺序记录损坏，请检查本机 CMS 记录。");
    const current = new Set(files.map(file => file.slug));
    const positions = new Map(saved.entries.filter(entry => current.has(entry.slug)).map(entry => [entry.slug, entry.position]));
    const added = await Promise.all(files.filter(file => !positions.has(file.slug)).map(async file => ({ slug: file.slug, created: await initialCreationTime(root, collection, file) })));
    added.sort((a, b) => a.created - b.created || a.slug.localeCompare(b.slug));
    for (const file of added) positions.set(file.slug, saved.next++);
    if (added.length || positions.size !== saved.entries.length) {
      await mkdir(path.dirname(target), { recursive: true });
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, `${JSON.stringify({ next: saved.next, entries: [...positions].map(([slug, position]) => ({ slug, position })) }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
        await rename(temporary, target);
      } finally { await unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; }); }
    }
    return positions;
  });
  pending.set(target, task);
  try { return await task; } finally { if (pending.get(target) === task) pending.delete(target); }
}
