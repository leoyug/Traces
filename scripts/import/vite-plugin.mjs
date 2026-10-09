import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildImportPlan } from "./plan.mjs";
import { commitImport } from "./commit.mjs";
import { createOrderStore } from "../content-order/store.mjs";
import { createBatchStore } from "../content-batch/store.mjs";
import { readPublicPhotoMetadataFromBuffer } from "./photo-metadata.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAX_REQUEST_BYTES = 82_000_000;
const plans = new Map();
const orderStore = createOrderStore(root);
const batchStore = createBatchStore(root);

function send(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(data));
}

async function bodyOf(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) throw new Error("文件总量超过 80 MB，请分批导入。");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function isLocalRequest(req) {
  const address = req.socket.remoteAddress;
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address)) return false;
  const host = req.headers.host;
  if (!host || !/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(host)) return false;
  const origin = req.headers.origin;
  try { return !origin || new URL(origin).host === host; } catch { return false; }
}

function injectKeystaticUploadShortcut(res) {
  const chunks = [];
  const writeCallbacks = [];
  const originalEnd = res.end.bind(res);
  const originalWriteHead = res.writeHead.bind(res);
  const originalSetHeader = res.setHeader.bind(res);
  const isLengthOrEntityTag = (name) => /^(content-length|etag)$/i.test(name);
  const withoutLengthHeaders = (headers) => {
    if (Array.isArray(headers)) {
      const filtered = [];
      for (let index = 0; index < headers.length; index += 2) {
        if (!isLengthOrEntityTag(String(headers[index]))) filtered.push(headers[index], headers[index + 1]);
      }
      return filtered;
    }
    return Object.fromEntries(Object.entries(headers).filter(([name]) => !isLengthOrEntityTag(name)));
  };

  res.setHeader = (name, value) => isLengthOrEntityTag(String(name)) ? res : originalSetHeader(name, value);
  res.writeHead = (statusCode, reasonOrHeaders, headers) => {
    if (Array.isArray(reasonOrHeaders) || (reasonOrHeaders && typeof reasonOrHeaders === "object")) {
      return originalWriteHead(statusCode, withoutLengthHeaders(reasonOrHeaders));
    }
    if (headers && typeof headers === "object") {
      return originalWriteHead(statusCode, reasonOrHeaders, withoutLengthHeaders(headers));
    }
    return originalWriteHead(statusCode, reasonOrHeaders, headers);
  };

  res.write = (chunk, encoding, callback) => {
    if (typeof encoding === "function") callback = encoding;
    if (chunk !== undefined && chunk !== null) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === "string" ? encoding : "utf8"));
    }
    if (callback) writeCallbacks.push(callback);
    return true;
  };

  res.end = (chunk, encoding, callback) => {
    if (typeof encoding === "function") {
      callback = encoding;
      encoding = undefined;
    }
    if (chunk !== undefined && chunk !== null) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === "string" ? encoding : "utf8"));
    }

    let html = Buffer.concat(chunks).toString("utf8");
    if (/text\/html/i.test(String(res.getHeader("content-type") ?? ""))) {
      const script = '<script type="module" src="/src/admin/content-upload-shortcuts.js"></script>';
      html = html.includes("</body>") ? html.replace(/<\/body>/i, `${script}</body>`) : `${html}${script}`;
    }

    const result = originalEnd(html, callback);
    for (const writeCallback of writeCallbacks) queueMicrotask(writeCallback);
    return result;
  };

}

export function localContentImport() {
  return {
    name: "local-content-import",
    hooks: {
      async "astro:server:setup"({ server }) {
        for (const collection of ["projects", "photos", "articles"]) {
          // Register creation order before atomic normalization replaces files.
          await batchStore.snapshot(collection);
          await orderStore.normalize(collection);
        }
        server.middlewares.use(async (req, res, next) => {
          const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
          const isKeystaticPage = /^\/keystatic(?:\/|$)/.test(pathname);
          const isKeystaticUpdate = pathname === "/api/keystatic/update";
          const orderRoute = pathname.match(/^\/api\/content-order\/(projects|photos|articles)$/);
          const batchRoute = pathname.match(/^\/api\/content-batch\/(projects|photos|articles)$/);
          const metadataRoute = pathname === "/api/photo-metadata";
          if (!isKeystaticPage && !isKeystaticUpdate && !orderRoute && !batchRoute && !metadataRoute && pathname !== "/content-import" && !pathname.startsWith("/api/content-import/")) return next();
          if (!isLocalRequest(req)) return send(res, 403, { error: "导入功能仅允许本机访问。" });
          if (isKeystaticUpdate) {
            if (req.method !== "POST" || req.headers["no-cors"] !== "1" || req.headers["content-type"] !== "application/json") {
              return send(res, 400, { error: "保存请求无效。" });
            }
            try {
              const updates = JSON.parse((await bodyOf(req)).toString("utf8"));
              const [{ default: config }, { makeGenericAPIRouteHandler }] = await Promise.all([
                server.ssrLoadModule("/keystatic.config.ts"), server.ssrLoadModule("@keystatic/core/api/generic"),
              ]);
              const handler = makeGenericAPIRouteHandler({ config, localBaseDirectory: root });
              const result = await orderStore.update(updates, additions => handler(new Request(`http://${req.headers.host}${pathname}`, {
                method: "POST", headers: { "no-cors": "1", "content-type": "application/json" }, body: JSON.stringify(additions),
              })));
              res.writeHead(result.status, result.headers);
              return res.end(result.body);
            } catch (error) { return send(res, error.status ?? 400, { error: error.message ?? "展示位置保存失败。" }); }
          }
          if (metadataRoute) {
            if (req.method !== "POST") return send(res, 405, { error: "请求方法不支持。" });
            if (!/^application\/octet-stream(?:;|$)/i.test(req.headers["content-type"] ?? "")) return send(res, 415, { error: "请提交图片文件。" });
            try {
              const name = new URL(req.url, "http://localhost").searchParams.get("name") ?? "photo.jpg";
              const buffer = await bodyOf(req);
              if (!buffer.length) return send(res, 400, { error: "图片文件为空。" });
              return send(res, 200, { fields: await readPublicPhotoMetadataFromBuffer(buffer, name) });
            } catch {
              return send(res, 400, { error: "无法读取拍摄参数，可手动填写。" });
            }
          }
          if (batchRoute) {
            try {
              const collection = batchRoute[1];
              if (req.method === "GET") return send(res, 200, await batchStore.snapshot(collection));
              if (req.method !== "POST") return send(res, 405, { error: "请求方法不支持。" });
              if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] ?? "")) return send(res, 415, { error: "请使用 JSON 提交批量操作。" });
              return send(res, 200, await batchStore.apply(collection, JSON.parse((await bodyOf(req)).toString("utf8"))));
            } catch (error) { return send(res, error.status ?? 400, { error: error.message ?? "批量操作失败，请重试。" }); }
          }
          if (orderRoute) {
            try {
              const collection = orderRoute[1];
              if (req.method === "GET") return send(res, 200, await orderStore.snapshot(collection));
              if (req.method !== "POST") return send(res, 405, { error: "请求方法不支持。" });
              if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] ?? "")) return send(res, 415, { error: "请使用 JSON 提交排序。" });
              const request = JSON.parse((await bodyOf(req)).toString("utf8"));
              const result = await orderStore.reorder(collection, request);
              return send(res, 200, result);
            } catch (error) {
              return send(res, error.status ?? 400, { error: error.message ?? "顺序保存失败，请重试。" });
            }
          }
          if (isKeystaticPage && req.method === "GET") {
            injectKeystaticUploadShortcut(res);
            return next();
          }
          if (pathname === "/content-import" && req.method === "GET") {
            const html = await readFile(path.join(root, "src/admin/content-import.html"), "utf8");
            res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
            return res.end(await server.transformIndexHtml(pathname, html));
          }
          if (pathname === "/api/content-import/status" && req.method === "GET") {
            const id = new URL(req.url, "http://localhost").searchParams.get("id");
            const plan = plans.get(id);
            return send(res, plan ? 200 : 404, plan ? { status: plan.status ?? "ready", results: plan.results, error: plan.error } : { error: "导入记录已过期。" });
          }
          if (req.method !== "POST") return send(res, 405, { error: "请求方法不支持。" });
          try {
            if (pathname === "/api/content-import/plan") {
              const raw = await bodyOf(req);
              const request = new Request("http://localhost/", { method: "POST", headers: { "content-type": req.headers["content-type"] ?? "" }, body: raw });
              const form = await request.formData();
              const manifest = JSON.parse(String(form.get("manifest") ?? "[]"));
              const uploads = form.getAll("file");
              if (!Array.isArray(manifest) || manifest.length !== uploads.length) throw new Error("文件清单不完整，请重新选择文件。");
              const files = await Promise.all(uploads.map(async (upload, index) => ({
                path: manifest[index].path,
                buffer: Buffer.from(await upload.arrayBuffer()),
              })));
              const plan = await buildImportPlan(files, root, String(form.get("category") ?? ""));
              const id = randomUUID();
              for (const [key, value] of plans) if (Date.now() - value.createdAt > 15 * 60_000) plans.delete(key);
              while (plans.size >= 3) plans.delete(plans.keys().next().value);
              plans.set(id, { ...plan, createdAt: Date.now(), status: "ready" });
              return send(res, 200, { id, items: plan.items.map(({ payload, body, assets, ...item }) => ({ ...item, details: {
                images: assets?.length ?? 0,
                relations: payload?.relatedProjects ?? payload?.relatedArticles ?? [],
              } })) });
            }
            if (pathname === "/api/content-import/commit") {
              const data = JSON.parse((await bodyOf(req)).toString("utf8"));
              const plan = plans.get(data.id);
              if (!plan || Date.now() - plan.createdAt > 15 * 60_000) throw new Error("预览已过期，请重新选择文件。");
              const selected = Array.isArray(data.selectedIds) ? data.selectedIds.filter(Number.isInteger) : [];
              if (plan.status !== "ready") throw new Error("这批文件已开始导入，请查看导入结果。");
              plan.status = "committing";
              try {
                const results = await commitImport(plan, selected, root);
                plan.status = "complete";
                plan.results = results;
                return send(res, 200, { results });
              } catch (error) {
                plan.status = "failed";
                plan.error = error.message;
                throw error;
              }
            }
            return send(res, 404, { error: "地址不存在。" });
          } catch (error) {
            server.config.logger.error(`导入失败：${error.stack ?? error}`);
            return send(res, 400, { error: error.message ?? "导入失败，请检查文件。" });
          }
        }
        );
      },
    },
  };
}
