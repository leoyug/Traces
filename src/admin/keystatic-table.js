import { Children, Fragment, cloneElement, createElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { TableView as KeystarTableView, TableHeader, TableBody } from "@local/keystar-table";
import { useDragAndDrop } from "@keystar/ui/drag-and-drop";
import { ActionButton } from "@keystar/ui/button";
import { Flex } from "@keystar/ui/layout";
import { Text } from "@keystar/ui/typography";
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

async function orderRequest(collection, action, data, signal) {
  const response = await fetch(`/api/content-order/${collection}${action === "undo" ? "/undo" : ""}`, {
    method: data ? "POST" : "GET", cache: "no-store", signal,
    ...(data ? { headers: { "content-type": "application/json" }, body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "顺序保存失败，请重试。");
  return result;
}

function CollectionTable({ collection, ...props }) {
  const supportsOrder = collection !== "articles";
  const body = Children.toArray(props.children).find((child) => isValidElement(child) && child.type === TableBody);
  const items = Array.from(body?.props.items ?? []);
  const signature = items.map((item) => `${item.name}:${item.sha}`).sort().join("|");
  const [sort, setSort] = useState(() => supportsOrder ? { column: "order", direction: "ascending" }
    : { column: "publishedAt", direction: "descending" });
  const [snapshot, setSnapshot] = useState();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const busy = useRef(false);
  const descriptionId = useId();

  useEffect(() => {
    if (!supportsOrder || busy.current) return;
    const controller = new AbortController();
    orderRequest(collection, "read", undefined, controller.signal).then((result) => {
      setSnapshot((previous) => previous?.version === result.version ? { ...result, undoToken: previous.undoToken ?? result.undoToken } : result);
      setFailed(false);
    }).catch((error) => {
      if (error.name !== "AbortError") { setFailed(true); setMessage(error.message); }
    });
    return () => controller.abort();
  }, [collection, supportsOrder, signature, refresh]);

  const complete = snapshot && snapshot.entries.length === items.length
    && items.every((item) => snapshot.entries.some((entry) => entry.slug === item.name));
  const ordered = sort.column === "order" && sort.direction === "ascending";
  const canReorder = supportsOrder && complete && ordered && !saving && !failed && items.length > 1;

  async function save(action, request) {
    if (busy.current) return;
    const previous = snapshot;
    busy.current = true;
    setSaving(true);
    setFailed(false);
    setMessage(action === "undo" ? "正在撤销排序…" : "正在保存顺序…");
    if (action !== "undo") setSnapshot({ ...snapshot, undoToken: undefined,
      entries: moveEntries(snapshot.entries, request.keys, request.target).map((entry, index) => ({ ...entry, order: index + 1 })) });
    try {
      const saved = await orderRequest(collection, action, { ...request, version: previous.version });
      setSnapshot(saved);
      setMessage(action === "undo" ? "已恢复调整前的顺序。" : "顺序已保存。");
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
      if (moved.some((entry, index) => entry.slug !== snapshot.entries[index].slug)) void save("reorder", { keys, target });
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
  const positions = new Map(snapshot?.entries.map((entry, index) => [entry.slug, index]));
  const sortedItems = items.map((item) => orderBySlug.has(item.name)
    ? { ...item, data: { ...item.data, order: orderBySlug.get(item.name) } } : item).sort((a, b) => {
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
    if (child.type === TableBody) return cloneElement(child, { items: sortedItems });
    return child;
  });
  const hint = saving || failed ? message : !snapshot ? "正在读取展示顺序…"
    : !complete ? "清空搜索后可拖动排序。" : !ordered ? "切换到展示顺序排列后可拖动排序。"
      : message || "拖动左侧手柄调整顺序，松开后自动保存。";
  const toolbar = supportsOrder && createElement(Flex, {
    key: "order-toolbar", alignItems: "center", justifyContent: "space-between", gap: "regular",
    UNSAFE_className: "local-order-toolbar",
  }, createElement(Text, { id: descriptionId, role: "status", color: failed ? "critical" : "neutralSecondary", size: "small" }, hint),
  failed ? createElement(ActionButton, { isDisabled: saving, onPress: () => { setMessage(""); setRefresh((value) => value + 1); } }, "刷新列表")
    : !ordered ? createElement(ActionButton, { onPress: () => { setSort({ column: "order", direction: "ascending" }); setMessage(""); } }, "按展示顺序排列")
      : snapshot?.undoToken && createElement(ActionButton, { isDisabled: saving, onPress: () => void save("undo", { undoToken: snapshot.undoToken }) }, "撤销排序"));
  return createElement(Fragment, null, toolbar, createElement(KeystarTableView, {
    ...props, children, key: canReorder ? "draggable" : "static",
    sortDescriptor: sort, onSortChange: (value) => { setSort(value); setMessage(""); },
    ...(canReorder ? { dragAndDropHooks: localizedHooks } : {}),
    ...(supportsOrder ? { "aria-describedby": descriptionId, "aria-busy": saving } : {}),
    UNSAFE_className: [props.UNSAFE_className, "local-content-table"].filter(Boolean).join(" "),
  }));
}
