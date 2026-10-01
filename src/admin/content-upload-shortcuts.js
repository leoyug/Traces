import "./keystatic-upload.css";
import { savePendingUpload } from "./upload-storage.js";

const categoryLabels = { project: "项目", article: "写作", photo: "摄影" };
const acceptedFiles = {
  project: ".md,.mdx,.docx,.json,.jpg,.jpeg,.png,.webp,.avif",
  article: ".md,.mdx,.docx,.json,.jpg,.jpeg,.png,.webp,.avif",
  photo: ".json,.jpg,.jpeg,.png,.webp,.avif",
};
const dashboardCollections = {
  projects: "project",
  articles: "article",
  photos: "photo",
};

function uploadIcon() {
  const namespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(namespace, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "2");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(namespace, "path");
  path.setAttribute("d", "M12 16V4m0 0L7 9m5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4");
  icon.append(path);
  return icon;
}

function chooseFiles(category, trigger) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = acceptedFiles[category];
  input.hidden = true;
  input.addEventListener("change", async () => {
    const files = [...(input.files ?? [])];
    if (!files.length) {
      input.remove();
      return;
    }
    if (trigger) trigger.disabled = true;
    try {
      const id = await savePendingUpload(category, files);
      window.location.assign(`/content-import?upload=${encodeURIComponent(id)}`);
    } catch (error) {
      window.alert(error.message || "准备文件失败，请重试。");
      if (trigger) trigger.disabled = false;
    } finally {
      input.remove();
    }
  }, { once: true });
  input.addEventListener("cancel", () => input.remove(), { once: true });
  document.body.append(input);
  input.click();
}

function makeUploadButton(category, { compact = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact
    ? "local-content-upload local-content-upload--compact"
    : "local-content-upload local-content-upload--toolbar";
  button.dataset.localContentUpload = "";
  button.dataset.uploadCategory = category;
  const actionLabel = compact ? "上传" : "导入";
  button.setAttribute("aria-label", `${actionLabel}${categoryLabels[category]}文件`);
  button.title = `${actionLabel}${categoryLabels[category]}文件`;
  if (compact) button.append(uploadIcon());
  else button.append(document.createTextNode("导入"));
  button.addEventListener("click", () => chooseFiles(category, button));
  return button;
}

function addDashboardUploads() {
  if (!/^\/keystatic\/?$/.test(window.location.pathname)) return;
  const panel = document.querySelector("#keystatic-main-panel");
  if (panel?.querySelector("#page-title")?.textContent.trim() !== "仪表板") return;
  const contentSection = [...panel.querySelectorAll("section")]
    .find((section) => section.querySelector("h2")?.textContent.trim() === "内容");
  if (!contentSection) return;

  for (const [collection, category] of Object.entries(dashboardCollections)) {
    const addLink = contentSection.querySelector(`a[role="button"][href="/keystatic/collection/${collection}/create"]`);
    const actions = addLink?.parentElement;
    if (!addLink || !actions || actions.querySelector("[data-local-content-upload]")) continue;
    actions.insertBefore(makeUploadButton(category, { compact: true }), addLink);
  }
}

function addCollectionToolbarUpload() {
  const match = window.location.pathname.match(/^\/keystatic\/collection\/(projects|articles|photos)\/?$/);
  if (!match) return;
  const category = { projects: "project", articles: "article", photos: "photo" }[match[1]];
  const toolbar = document.querySelector("#keystatic-main-panel > header");
  if (!toolbar || toolbar.querySelector("[data-local-content-upload]")) return;
  const addLink = [...toolbar.querySelectorAll('a[role="button"]')].find((link) => link.textContent.trim() === "添加");
  if (!addLink) return;

  addLink.before(makeUploadButton(category));
}

function addUploadShortcuts() {
  addDashboardUploads();
  addCollectionToolbarUpload();
}

const observer = new MutationObserver(addUploadShortcuts);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("popstate", addUploadShortcuts);
addUploadShortcuts();
