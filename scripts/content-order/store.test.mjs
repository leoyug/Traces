import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createOrderStore } from "./store.mjs";

async function fixture(t, collection, documents) {
  const root = await mkdtemp(path.join(tmpdir(), "content-order-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const folder = path.join(root, "src/content", collection);
  await mkdir(folder, { recursive: true });
  for (const [name, raw] of Object.entries(documents)) await writeFile(path.join(folder, name), raw);
  return { store: createOrderStore(root), folder };
}

test("photo reorder persists unique positions across store restarts", async (t) => {
  const docs = {
    "a.json": '{\n  "order": 1,\n  "draft": false,\n  "alt": "真实描述"\n}\n',
    "b.json": '{\n  "order": 1,\n  "draft": true,\n  "alt": "草稿"\n}\n',
    "c.json": '{\n  "order": 12,\n  "draft": false,\n  "alt": "另一张照片"\n}\n',
  };
  const { store, folder } = await fixture(t, "photos", docs);
  const before = await store.snapshot("photos");
  const saved = await store.reorder("photos", { version: before.version, keys: ["c"], target: { key: "a", dropPosition: "before" } });
  assert.deepEqual(saved.entries.map((entry) => [entry.slug, entry.order]), [["c", 1], ["a", 2], ["b", 3]]);
  assert.deepEqual(await store.snapshot("photos"), saved);
  const restarted = createOrderStore(path.resolve(folder, "../../.."));
  assert.deepEqual(await restarted.snapshot("photos"), saved);
  for (const [name, raw] of Object.entries(docs)) {
    const current = await readFile(path.join(folder, name), "utf8");
    assert.equal(current.replace(/("order": )\d+/, "$1N"), raw.replace(/("order": )\d+/, "$1N"));
  }
});

test("project reorder preserves frontmatter comments, dates, CRLF and body order text", async (t) => {
  const docs = {
    "a.md": "---\r\ntitle: 项目 A\r\norder: 0 # 保留注释\r\npublishedAt: 2026-10-09\r\n---\r\n\r\n正文\r\norder: 88\r\n",
    "b.md": "---\ntitle: 项目 B\norder: 4\npublishedAt: 2025-10-09\n---\n\n# 真实正文\n",
  };
  const { store, folder } = await fixture(t, "projects", docs);
  const before = await store.snapshot("projects");
  const saved = await store.reorder("projects", { version: before.version, keys: ["a"], target: { key: "b", dropPosition: "after" } });
  assert.equal(await readFile(path.join(folder, "a.md"), "utf8"), docs["a.md"].replace("order: 0 #", "order: 2 #"));
  assert.equal(await readFile(path.join(folder, "b.md"), "utf8"), docs["b.md"].replace("order: 4", "order: 1"));
  assert.deepEqual(await store.snapshot("projects"), saved);
});

test("stale saves refuse to overwrite newer content", async (t) => {
  const { store, folder } = await fixture(t, "photos", {
    "a.json": '{\n "order": 1, "alt": "A"\n}', "b.json": '{\n "order": 2, "alt": "B"\n}',
  });
  const before = await store.snapshot("photos");
  const request = { version: before.version, keys: ["b"], target: { key: "a", dropPosition: "before" } };
  await store.reorder("photos", request);
  const latest = (await readFile(path.join(folder, "a.json"), "utf8")).replace('"A"', '"新描述"');
  await writeFile(path.join(folder, "a.json"), latest);
  await assert.rejects(store.reorder("photos", request), { status: 409 });
  assert.equal(await readFile(path.join(folder, "a.json"), "utf8"), latest);
});

test("invalid IDs and unsupported collections never write content", async (t) => {
  const { store, folder } = await fixture(t, "photos", {
    "a.json": '{\n "order": 1\n}', "b.json": '{\n "order": 2\n}',
  });
  const before = await store.snapshot("photos");
  for (const keys of [["../a"], ["a", "a"], ["missing"]]) {
    await assert.rejects(store.reorder("photos", { version: before.version, keys, target: { key: "b", dropPosition: "after" } }));
  }
  await assert.rejects(store.snapshot("articles"));
  assert.equal((await store.snapshot("photos")).version, before.version);
  assert.equal(await readFile(path.join(folder, "a.json"), "utf8"), '{\n "order": 1\n}');
});
