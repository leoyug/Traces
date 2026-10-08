import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { moveEntries } from "../../src/admin/collection-order.js";

const formats = { projects: ".md", photos: ".json" };
const conflict = () => Object.assign(new Error("内容已在其他页面修改，请刷新列表后重试。"), { status: 409 });

export function createOrderStore(root) {
  const undoRecords = new Map();
  const locks = new Set();

  async function read(collection) {
    const extension = formats[collection];
    if (!extension) throw new Error("这个栏目不支持手动排序。");
    const folder = path.join(root, "src/content", collection);
    const names = (await readdir(folder, { withFileTypes: true }))
      .filter((file) => file.isFile() && file.name.endsWith(extension)).map((file) => file.name).sort();
    const files = await Promise.all(names.map(async (name) => {
      const filepath = path.join(folder, name);
      const raw = await readFile(filepath, "utf8");
      const data = extension === ".json" ? JSON.parse(raw) : matter(raw).data;
      if (!Number.isSafeInteger(data.order) || data.order < (collection === "photos" ? 1 : 0)) {
        throw new Error(`展示顺序无效：${name}。请先在编辑页填写有效数字。`);
      }
      return { filepath, raw, slug: name.slice(0, -extension.length), order: data.order,
        publishedAt: data.publishedAt ? new Date(data.publishedAt).getTime() : 0 };
    }));
    const hash = createHash("sha256");
    for (const file of files) hash.update(JSON.stringify([file.slug, file.raw]));
    const entries = files.map(({ slug, order, publishedAt }) => ({ slug, order, publishedAt }))
      .sort((a, b) => a.order - b.order || b.publishedAt - a.publishedAt || a.slug.localeCompare(b.slug));
    return { files, entries, version: hash.digest("hex") };
  }

  function patchOrder(file, order) {
    if (file.filepath.endsWith(".json")) {
      const matches = [...file.raw.matchAll(/^(\s*"order"\s*:\s*)(\d+)(?=\s*[,}])/gm)];
      if (matches.length !== 1 || Number(matches[0][2]) !== file.order) throw new Error(`无法更新展示顺序：${file.slug}`);
      return file.raw.replace(/^(\s*"order"\s*:\s*)(\d+)(?=\s*[,}])/m, (_, prefix) => `${prefix}${order}`);
    }
    const frontmatter = file.raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const matches = [...(frontmatter?.[1] ?? "").matchAll(/^(order:[ \t]*)(\d+)([ \t]*(?:#.*)?\r?)$/gm)];
    if (matches.length !== 1 || Number(matches[0][2]) !== file.order) throw new Error(`无法更新展示顺序：${file.slug}`);
    const updated = frontmatter[0].replace(/^(order:[ \t]*)(\d+)([ \t]*(?:#.*)?\r?)$/m,
      (_, prefix, _value, suffix) => `${prefix}${order}${suffix}`);
    return updated + file.raw.slice(frontmatter[0].length);
  }

  async function persist(collection, snapshot, changes) {
    const staged = [];
    const renamed = [];
    try {
      for (const change of changes) {
        const temp = `${change.filepath}.reorder-${randomUUID()}.tmp`;
        await writeFile(temp, change.after, { flag: "wx" });
        staged.push({ ...change, temp });
      }
      if ((await read(collection)).version !== snapshot.version) throw conflict();
      // Publish the prepared files in one event-loop turn. The dev watcher sees
      // the finished numbering, without half of a multi-file reorder.
      for (const change of staged) {
        renameSync(change.temp, change.filepath);
        renamed.push(change);
      }
    } catch (error) {
      for (const change of renamed) writeFileSync(change.filepath, change.before);
      throw error;
    } finally {
      await Promise.all(staged.map((change) => unlink(change.temp).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      })));
    }
  }

  const publicSnapshot = ({ entries, version }) => ({ entries, version });
  async function mutate(collection, run) {
    if (locks.has(collection)) throw Object.assign(new Error("顺序正在保存，请稍后重试。"), { status: 409 });
    locks.add(collection);
    try { return await run(); } finally { locks.delete(collection); }
  }

  return {
    async snapshot(collection) {
      const snapshot = await read(collection);
      const lastUndo = [...undoRecords].reverse().find(([, record]) => record.collection === collection
        && record.version === snapshot.version && Date.now() - record.createdAt <= 10 * 60_000);
      return { ...publicSnapshot(snapshot), ...(lastUndo ? { undoToken: lastUndo[0] } : {}) };
    },
    async reorder(collection, request) {
      return mutate(collection, async () => {
        const snapshot = await read(collection);
        if (request.version !== snapshot.version) throw conflict();
        if (!Array.isArray(request.keys) || !request.target) throw new Error("排序请求不完整。");
        const moved = moveEntries(snapshot.entries, request.keys, request.target);
        if (moved.every((entry, index) => entry.slug === snapshot.entries[index].slug)) return publicSnapshot(snapshot);
        const orders = new Map(moved.map((entry, index) => [entry.slug, index + 1]));
        const changes = snapshot.files.filter((file) => file.order !== orders.get(file.slug))
          .map((file) => ({ filepath: file.filepath, before: file.raw, after: patchOrder(file, orders.get(file.slug)) }));
        await persist(collection, snapshot, changes);
        const saved = await read(collection);
        const undoToken = randomUUID();
        const now = Date.now();
        for (const [key, record] of undoRecords) if (now - record.createdAt > 10 * 60_000) undoRecords.delete(key);
        while (undoRecords.size >= 20) undoRecords.delete(undoRecords.keys().next().value);
        undoRecords.set(undoToken, { collection, changes, version: saved.version, createdAt: now });
        return { ...publicSnapshot(saved), undoToken };
      });
    },
    async undo(collection, request) {
      return mutate(collection, async () => {
        const record = undoRecords.get(request.undoToken);
        if (!record || record.collection !== collection || Date.now() - record.createdAt > 10 * 60_000) {
          throw new Error("撤销已过期，请直接拖动调整顺序。");
        }
        const snapshot = await read(collection);
        if (snapshot.version !== request.version || snapshot.version !== record.version) throw conflict();
        await persist(collection, snapshot, record.changes.map((change) => ({
          ...change, before: change.after, after: change.before,
        })));
        undoRecords.delete(request.undoToken);
        return publicSnapshot(await read(collection));
      });
    },
  };
}
