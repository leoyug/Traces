import path from "node:path";

const locks = new Set();

export async function withContentLock(root, collection, run) {
  const key = path.join(root, "src/content", collection);
  if (locks.has(key)) throw Object.assign(new Error("内容正在保存，请稍后重试。"), { status: 409 });
  locks.add(key);
  try { return await run(); } finally { locks.delete(key); }
}
