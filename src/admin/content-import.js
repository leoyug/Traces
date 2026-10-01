import { takePendingUpload } from "./upload-storage.js";

const dropZone = document.querySelector("#drop-zone");
const filePicker = document.querySelector("#pick-files");
const folderPicker = document.querySelector("#pick-folder");
const preview = document.querySelector("#preview");
const list = document.querySelector("#item-list");
const title = document.querySelector("#preview-title");
const intro = document.querySelector("#preview-intro");
const statusMessage = document.querySelector("#status");
const commitButton = document.querySelector("#commit");
const resetButton = document.querySelector("#reset");
const labels = { project: "项目", article: "写作", photo: "摄影", "project-image": "项目图片", unsupported: "不支持" };
const categoryInputs = [...document.querySelectorAll('input[name="category"]')];
const pendingKey = "incessant-import-pending";
const categoryKey = "incessant-import-category";
const resultKey = "incessant-import-result";
let currentPlan;
let currentFiles = [];
let objectUrls = [];

function setStatus(message, error = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", error);
}

function clearPreview() {
  sessionStorage.removeItem(resultKey);
  currentPlan = undefined;
  currentFiles = [];
  preview.hidden = true;
  list.replaceChildren();
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls = [];
  filePicker.value = "";
  folderPicker.value = "";
  setStatus("");
}

function fileEntry(file, filePath) {
  return { file, path: filePath || file.webkitRelativePath || file.name };
}

async function walkEntry(entry, prefix = "") {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [fileEntry(file, `${prefix}${file.name}`)];
  }
  if (!entry.isDirectory) return [];
  const reader = entry.createReader();
  const entries = [];
  while (true) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    entries.push(...batch);
  }
  const nested = await Promise.all(entries.map((child) => walkEntry(child, `${prefix}${entry.name}/`)));
  return nested.flat();
}

async function filesFromDrop(event) {
  const items = [...event.dataTransfer.items];
  const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length) return (await Promise.all(entries.map((entry) => walkEntry(entry)))).flat();
  return [...event.dataTransfer.files].map((file) => fileEntry(file));
}

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败，请重试。");
  return data;
}

function makeItem(item) {
  const row = document.createElement("label");
  row.className = `import-item${item.action === "skip" ? " import-item--skip" : ""}`;
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = String(item.id);
  checkbox.checked = item.action !== "skip";
  checkbox.disabled = item.action === "skip";
  row.append(checkbox);

  const imageIndex = item.fileIndices?.find((index) => /\.(jpe?g|png|webp|avif)$/i.test(currentFiles[index]?.path ?? ""));
  if (imageIndex !== undefined) {
    const image = document.createElement("img");
    const url = URL.createObjectURL(currentFiles[imageIndex].file);
    objectUrls.push(url);
    image.src = url;
    image.alt = "";
    row.append(image);
  }

  const copy = document.createElement("div");
  copy.className = "import-item-copy";
  const heading = document.createElement("p");
  heading.className = "import-item-title";
  heading.textContent = `${labels[item.kind] ?? "文件"} · ${item.title}`;
  const meta = document.createElement("p");
  meta.className = "import-item-meta";
  const action = item.action === "create" ? "新建草稿" : item.action === "update" ? "关联现有项目" : "跳过";
  const extra = item.details?.images ? ` · ${item.details.images} 张图片` : "";
  const relations = item.details?.relations?.length ? ` · 关联 ${item.details.relations.join("、")}` : "";
  meta.textContent = `${action} · ${item.source} · 短名 ${item.slug ?? "—"}${extra}${relations}`;
  copy.append(heading, meta);
  if (item.metadataPreview) {
    const metadata = document.createElement("p");
    metadata.className = "import-item-meta";
    metadata.textContent = `识别到拍摄信息：${item.metadataPreview}`;
    copy.append(metadata);
  }
  for (const warning of item.warnings ?? []) {
    const message = document.createElement("p");
    message.className = "import-item-warning";
    message.textContent = warning;
    copy.append(message);
  }
  row.append(copy);
  return row;
}

async function analyze(files) {
  clearPreview();
  const category = categoryInputs.find((input) => input.checked)?.value;
  if (!category) return setStatus("请先选择项目、写作或摄影。", true);
  if (!files.length) return setStatus("没有找到可上传的文件。", true);
  currentFiles = files;
  setStatus(`正在检查 ${files.length} 个文件并匹配内容……`);
  const form = new FormData();
  form.append("category", category);
  form.append("manifest", JSON.stringify(files.map(({ path }) => ({ path }))));
  for (const entry of files) form.append("file", entry.file, entry.file.name);
  try {
    const result = await request("/api/content-import/plan", { method: "POST", body: form });
    currentPlan = result;
    list.replaceChildren(...result.items.map(makeItem));
    const actionable = result.items.filter((item) => item.action !== "skip").length;
    title.textContent = `找到 ${actionable} 项可导入内容`;
    intro.textContent = category === "photo"
      ? "已从原图预填可公开的拍摄日期和设备参数；地点不会从照片坐标自动填写。请核对后再确认。"
      : "已根据文件名、文件夹和明确的正文链接匹配。勾选需要导入的内容，检查提示后再确认。";
    preview.hidden = false;
    commitButton.disabled = actionable === 0;
    setStatus(actionable ? "预览已生成，尚未修改网站文件。" : "没有可导入内容，请检查文件名或格式。", actionable === 0);
    preview.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  } catch (error) {
    setStatus(error.message, true);
  }
}

filePicker.addEventListener("change", () => analyze([...filePicker.files].map((file) => fileEntry(file))));
folderPicker.addEventListener("change", () => analyze([...folderPicker.files].map((file) => fileEntry(file))));
document.querySelector("#choose-files").addEventListener("click", () => filePicker.click());
document.querySelector("#choose-folder").addEventListener("click", () => folderPicker.click());
for (const input of categoryInputs) input.addEventListener("change", () => { sessionStorage.setItem(categoryKey, input.value); clearPreview(); });
for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add("is-dragging"); });
}
for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove("is-dragging"); });
}
dropZone.addEventListener("drop", async (event) => {
  try { await analyze(await filesFromDrop(event)); } catch (error) { setStatus(error.message, true); }
});
document.addEventListener("dragover", (event) => event.preventDefault());
document.addEventListener("drop", (event) => event.preventDefault());
resetButton.addEventListener("click", clearPreview);
commitButton.addEventListener("click", async () => {
  if (!currentPlan) return;
  const selectedIds = [...list.querySelectorAll('input[type="checkbox"]:checked')].map((input) => Number(input.value));
  if (!selectedIds.length) return setStatus("请先勾选需要导入的内容。", true);
  commitButton.disabled = true;
  setStatus(`正在导入 ${selectedIds.length} 项内容……`);
  sessionStorage.setItem(pendingKey, currentPlan.id);
  try {
    const result = await request("/api/content-import/commit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: currentPlan.id, selectedIds }) });
    sessionStorage.setItem(resultKey, JSON.stringify({ count: result.results.length, at: Date.now() }));
    sessionStorage.removeItem(pendingKey);
    preview.hidden = true;
    setStatus(`已导入 ${result.results.length} 项内容并保存为草稿。现在可以前往编辑后台逐项核对。`);
    currentPlan = undefined;
  } catch (error) {
    sessionStorage.removeItem(pendingKey);
    commitButton.disabled = false;
    setStatus(error.message, true);
  }
});

const savedCategory = sessionStorage.getItem(categoryKey);
if (savedCategory) {
  const input = categoryInputs.find((candidate) => candidate.value === savedCategory);
  if (input) input.checked = true;
}
const uploadId = new URLSearchParams(window.location.search).get("upload");
const pendingId = sessionStorage.getItem(pendingKey);
if (uploadId) {
  (async () => {
    try {
      const upload = await takePendingUpload(uploadId);
      window.history.replaceState(null, "", window.location.pathname);
      if (!upload) return setStatus("找不到暂存文件，请重新选择。", true);
      const categoryInput = categoryInputs.find((candidate) => candidate.value === upload.category);
      if (!categoryInput) return setStatus("无法识别内容分类，请重新选择文件。", true);
      categoryInput.checked = true;
      sessionStorage.setItem(categoryKey, upload.category);
      await analyze(upload.entries);
    } catch (error) {
      setStatus(error.message || "无法读取所选文件，请重新选择。", true);
    }
  })();
} else if (pendingId) {
  (async () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        const outcome = await request(`/api/content-import/status?id=${encodeURIComponent(pendingId)}`);
        if (outcome.status === "complete") {
          sessionStorage.setItem(resultKey, JSON.stringify({ count: outcome.results.length, at: Date.now() }));
          sessionStorage.removeItem(pendingKey);
          setStatus(`已导入 ${outcome.results.length} 项内容并保存为草稿。请到编辑后台核对。`);
          return;
        }
        if (outcome.status === "failed") {
          sessionStorage.removeItem(pendingKey);
          setStatus(outcome.error || "导入失败，请重新选择文件。", true);
          return;
        }
      } catch (error) {
        sessionStorage.removeItem(pendingKey);
        setStatus(error.message, true);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setStatus("导入仍在进行，请稍后刷新页面查看结果。");
  })();
} else {
  try {
    const lastResult = JSON.parse(sessionStorage.getItem(resultKey) || "null");
    if (lastResult && Date.now() - lastResult.at < 60 * 60_000) setStatus(`已导入 ${lastResult.count} 项内容并保存为草稿。请到编辑后台核对。`);
  } catch { sessionStorage.removeItem(resultKey); }
}
