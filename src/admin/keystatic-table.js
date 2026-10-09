import { Children, Fragment, cloneElement, createElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { TableView as KeystarTableView, TableHeader, TableBody } from "@local/keystar-table";
import { useDragAndDrop } from "@keystar/ui/drag-and-drop";
import { ActionButton } from "@keystar/ui/button";
import { Flex } from "@keystar/ui/layout";
import { Text } from "@keystar/ui/typography";
import { AlertDialog, DialogContainer } from "@keystar/ui/dialog";
import { moveEntries } from "./collection-order.js";
import "./keystatic-upload.css";

export * from "@local/keystar-table";

// Column sizes are native TableView props: its virtualized rows, headers and
// horizontal scrolling must all use the same geometry.
const columnSizes = {
  photos: {
    "@@slug": { width: "28%", minWidth: 224, maxWidth: 320 },
    alt: { width: "1fr", minWidth: 280 },
    order: { width: 112 }, draft: { width: 112 },
  },
  projects: {
    "@@slug": { width: "27%", minWidth: 224, maxWidth: 304 },
    title: { width: "1fr", minWidth: 256 },
    year: { width: 96 }, featured: { width: 96 },
    order: { width: 112 }, draft: { width: 112 },
  },
  articles: {
    "@@slug": { width: "30%", minWidth: 240, maxWidth: 336 },
    title: { width: "1fr", minWidth: 280 },
    publishedAt: { width: 144 }, draft: { width: 112 },
  },
};

export function TableView(props) {
  const header = Children.toArray(props.children).find((child) => isValidElement(child) && child.type === TableHeader);
  const keys = new Set(header?.props.columns?.map((column) => column.key));
  const collection = Object.keys(columnSizes).find((name) => Object.keys(columnSizes[name]).every((key) => keys.has(key)));
  if (!collection) return createElement(KeystarTableView, props);
  return createElement(CollectionTable, { ...props, collection, key: collection });
}

async function orderRequest(collection, data, signal) {
  const response = await fetch(`/api/content-order/${collection}`, {
    method: data ? "POST" : "GET", cache: "no-store", signal,
    ...(data ? { headers: { "content-type": "application/json" }, body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "顺序保存失败，请重试。");
  return result;
}

async function batchRequest(collection, data, signal) {
  const response = await fetch(`/api/content-batch/${collection}`, {
    method: data ? "POST" : "GET", cache: "no-store", signal,
    ...(data ? { headers: { "content-type": "application/json" }, body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "批量操作失败，请重试。");
  return result;
}

function CollectionTable({ collection, ...props }) {
  const supportsOrder = collection !== "articles";
  const body = Children.toArray(props.children).find((child) => isValidElement(child) && child.type === TableBody);
  const items = Array.from(body?.props.items ?? []);
  const signature = items.map((item) => `${item.name}:${item.sha}`).sort().join("|");
  const [sort, setSort] = useState({ column: "@@upload", direction: "descending" });
  const [snapshot, setSnapshot] = useState();
  const [batchSnapshot, setBatchSnapshot] = useState();
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [removedSlugs, setRemovedSlugs] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const busy = useRef(false);
  const descriptionId = useId();

  useEffect(() => {
    if (busy.current) return;
    const controller = new AbortController();
    Promise.all([
      supportsOrder ? orderRequest(collection, undefined, controller.signal) : undefined,
      batchRequest(collection, undefined, controller.signal),
    ]).then(([order, batch]) => {
      setSnapshot(order);
      setBatchSnapshot(batch);
      setFailed(false);
    }).catch((error) => {
      if (error.name !== "AbortError") { setFailed(true); setMessage(error.message); }
    });
    return () => controller.abort();
  }, [collection, supportsOrder, signature, refresh]);

  // Search changes the current list. Never carry hidden selections into a batch.
  useEffect(() => { setSelectedKeys(new Set()); setConfirmDelete(false); }, [signature]);

  const visibleItems = items.filter(item => !removedSlugs.has(item.name));
  const complete = snapshot && snapshot.entries.length === visibleItems.length
    && visibleItems.every((item) => snapshot.entries.some((entry) => entry.slug === item.name));
  const ordered = sort.column === "order" && sort.direction === "ascending";
  const canReorder = supportsOrder && complete && ordered && !multiSelect && !saving && !failed && visibleItems.length > 1;
  const selectedItems = visibleItems.filter(item => selectedKeys.has(`key:${item.name}`));
  const canBatch = multiSelect && !saving && !failed && selectedItems.length > 0 && batchSnapshot
    && selectedItems.every(item => batchSnapshot.entries.some(entry => entry.slug === item.name));

  async function applyBatch(action) {
    if (busy.current || !canBatch) return;
    busy.current = true;
    setSaving(true);
    setFailed(false);
    setConfirmDelete(false);
    setMessage(action === "delete" ? "正在删除所选内容…" : "正在保存发布状态…");
    try {
      const result = await batchRequest(collection, { action, keys: selectedItems.map(item => item.name), version: batchSnapshot.version });
      setBatchSnapshot(result);
      if (action === "delete") setRemovedSlugs(previous => new Set([...previous, ...selectedItems.map(item => item.name)]));
      setSelectedKeys(new Set());
      setMessage(action === "delete" ? `已删除 ${result.affected} 项。` : `已将 ${result.affected} 项设为${action === "publish" ? "已发布" : "草稿"}。`);
      setRefresh(value => value + 1);
    } catch (error) { setFailed(true); setMessage(error.message); }
    finally { busy.current = false; setSaving(false); }
  }

  async function save(request) {
    if (busy.current) return;
    const previous = snapshot;
    busy.current = true;
    setSaving(true);
    setFailed(false);
    setMessage("正在保存顺序…");
    setSnapshot({ ...snapshot,
      entries: moveEntries(snapshot.entries, request.keys, request.target).map((entry, index) => ({ ...entry, order: index + 1 })) });
    try {
      const saved = await orderRequest(collection, { ...request, version: previous.version });
      setSnapshot(saved);
      setMessage("顺序已保存。");
    } catch (error) {
      setSnapshot(previous);
      setFailed(true);
      setMessage(error.message);
    } finally { busy.current = false; setSaving(false); }
  }

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ "text/plain": String(key) })),
    getAllowedDropOperations: () => ["move"],
    getDropOperation: (target) => canReorder && target.type === "item" && target.dropPosition !== "on" ? "move" : "cancel",
    onReorder: (event) => {
      if (!canReorder) return;
      const keys = [...event.keys].map((key) => String(key).slice("key:".length));
      const target = { key: String(event.target.key).slice("key:".length), dropPosition: event.target.dropPosition };
      const moved = moveEntries(snapshot.entries, keys, target);
      if (moved.some((entry, index) => entry.slug !== snapshot.entries[index].slug)) void save({ keys, target });
    },
  });
  const localizedHooks = {
    ...dragAndDropHooks,
    useDraggableItem(options, state) {
      const result = dragAndDropHooks.useDraggableItem(options, state);
      return { ...result, dragButtonProps: { ...result.dragButtonProps,
        "aria-label": "调整展示顺序",
      } };
    },
  };
  const orderBySlug = new Map(snapshot?.entries.map((entry) => [entry.slug, entry.order]));
  const draftBySlug = new Map(batchSnapshot?.entries.map(entry => [entry.slug, entry.draft]));
  const positions = new Map(snapshot?.entries.map((entry, index) => [entry.slug, index]));
  const uploadOrder = new Map(batchSnapshot?.entries.map(entry => [entry.slug, entry.uploadOrder]));
  const sortedItems = visibleItems.map(item => ({ ...item, data: {
    ...item.data,
    ...(orderBySlug.has(item.name) ? { order: orderBySlug.get(item.name) } : {}),
    ...(draftBySlug.has(item.name) ? { draft: draftBySlug.get(item.name) } : {}),
  } })).sort((a, b) => {
      if (sort.column === "@@upload") return (uploadOrder.get(b.name) ?? 0) - (uploadOrder.get(a.name) ?? 0) || a.name.localeCompare(b.name);
      if (supportsOrder && ordered && positions.has(a.name) && positions.has(b.name)) return positions.get(a.name) - positions.get(b.name);
      const value = (item) => sort.column === "@@slug" ? item.name : item.data?.[sort.column] ?? item.name;
      const left = value(a), right = value(b);
      const compared = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
      return (sort.direction === "descending" ? -compared : compared) || a.name.localeCompare(b.name);
    });
  const children = Children.map(props.children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === TableHeader) return cloneElement(child, {
      columns: child.props.columns.map((column) => ({ ...column, ...columnSizes[collection][column.key],
        ...(collection === "projects" && column.key === "year" ? { name: "年份" } : {}), })),
    });
    if (child.type === TableBody) return cloneElement(child, {
      items: sortedItems,
      ...(collection === "photos" ? {
        children: (item) => cloneElement(child.props.children(item), { textValue: item.data?.alt ?? "" }),
      } : {}),
    });
    return child;
  });
  const hint = saving || failed ? message : multiSelect ? message || `已选择 ${selectedItems.length} 项`
    : !supportsOrder ? message || (sort.column === "@@upload" ? "最新上传在前；可多选更改发布状态或删除。" : "选择多项内容后，可批量更改发布状态或删除。") : !snapshot || !batchSnapshot ? "正在读取列表顺序…"
    : !complete ? "清空搜索后可拖动排序。" : !ordered ? (sort.column === "@@upload" ? "最新上传在前；切换展示顺序后可拖动排序。" : "切换到展示顺序排列后可拖动排序。")
      : message || "拖动左侧手柄调整顺序，松开后自动保存。";
  const toolbar = createElement(Flex, {
    key: "order-toolbar", alignItems: "center", justifyContent: "space-between", gap: "regular",
    UNSAFE_className: "local-order-toolbar local-batch-toolbar",
  }, createElement(Flex, { alignItems: "center", gap: "large", UNSAFE_className: "local-list-summary" },
    createElement(Text, { role: "status", size: "small", UNSAFE_className: "local-list-count" }, `共 ${visibleItems.length} 项`),
    createElement(Text, { id: descriptionId, role: "status", color: failed ? "critical" : "neutralSecondary", size: "small" }, hint),
  ),
  createElement(Flex, { gap: "regular", UNSAFE_className: "local-batch-actions" },
    failed ? createElement(ActionButton, { isDisabled: saving, onPress: () => { setMessage(""); setSelectedKeys(new Set()); setRefresh(value => value + 1); } }, "刷新列表") : null,
    multiSelect ? createElement(Fragment, null,
      createElement(ActionButton, { isDisabled: !canBatch, onPress: () => void applyBatch("publish") }, "设为已发布"),
      createElement(ActionButton, { isDisabled: !canBatch, onPress: () => void applyBatch("draft") }, "设为草稿"),
      createElement(ActionButton, { isDisabled: !canBatch, onPress: () => setConfirmDelete(true) }, "删除所选"),
    ) : supportsOrder && !ordered ? createElement(ActionButton, { onPress: () => { setSort({ column: "order", direction: "ascending" }); setMessage(""); } }, "按展示顺序排列") : null,
    createElement(ActionButton, { isDisabled: saving, isSelected: multiSelect, onPress: () => {
      setMultiSelect(value => !value); setSelectedKeys(new Set()); setMessage("");
    } }, multiSelect ? "退出多选" : "多选"),
  ));
  const deleteDialog = createElement(DialogContainer, { onDismiss: () => setConfirmDelete(false) },
    confirmDelete ? createElement(AlertDialog, {
      title: `删除所选的 ${selectedItems.length} 项内容？`, tone: "critical", cancelLabel: "取消", primaryActionLabel: "确认删除",
      autoFocusButton: "cancel", onCancel: () => setConfirmDelete(false), onPrimaryAction: () => void applyBatch("delete"),
    }, createElement("div", null,
      createElement("p", null, "删除后，这些内容将从列表和网站中移除。"),
      createElement("ul", { className: "local-batch-delete-list" }, selectedItems.map(item => createElement("li", { key: item.name }, item.data?.alt ?? item.data?.title ?? item.name))),
    )) : null);
  return createElement(Fragment, null, toolbar, deleteDialog, createElement(KeystarTableView, {
    ...props, children, key: canReorder ? "draggable" : "static",
    sortDescriptor: sort.column === "@@upload" ? undefined : sort, onSortChange: (value) => { setSort(value); setMessage(""); },
    selectionMode: multiSelect ? "multiple" : "none", selectionBehavior: "toggle",
    selectedKeys, onSelectionChange: keys => {
      if (!saving) { setSelectedKeys(keys === "all" ? new Set(sortedItems.map(item => `key:${item.name}`)) : new Set(keys)); setMessage(""); }
    },
    onAction: multiSelect || saving ? undefined : props.onAction,
    disabledKeys: saving ? new Set(sortedItems.map(item => `key:${item.name}`)) : undefined,
    ...(canReorder ? { dragAndDropHooks: localizedHooks } : {}),
    "aria-describedby": descriptionId, "aria-busy": saving,
    UNSAFE_className: [props.UNSAFE_className, "local-content-table"].filter(Boolean).join(" "),
  }));
}
