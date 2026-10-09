import { Children, cloneElement, createElement, isValidElement, useEffect, useState } from "react";
import { ListView as NativeListView } from "@local/keystar-list-view";
import { Text } from "@keystar/ui/typography";
import { PhotoThumbnail } from "./PhotoThumbnail";
import "./keystatic-upload.css";

export * from "@local/keystar-list-view";

function ArchiveImageThumbnail({ value, position }) {
  const data = value?.data;
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!data) { setSrc(null); return; }
    const url = URL.createObjectURL(new Blob([new Uint8Array(data).buffer]));
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [data]);

  return createElement("span", { className: "local-archive-image-item" },
    createElement("span", { className: "local-archive-image-preview" },
      src && createElement("img", { src, alt: "", draggable: false }),
    ),
    createElement("span", {}, position),
    !value && createElement("span", {}, "未上传图片"),
    value && createElement("span", { className: "local-archive-image-filename" }, value.filename || "已上传图片"),
  );
}

// Keep the native array's editor, asset serialization, deletion and drag sorting.
// Photo selections and archive uploads share the native list's interactions.
export function ListView(props) {
  if (props["aria-label"] === "展示照片") return createElement(NativeListView, {
    ...props,
    children: (item) => {
      const row = props.children(item);
      return cloneElement(row, {}, Children.map(row.props.children, (child) =>
        isValidElement(child) && child.type === Text
          ? cloneElement(child, {}, createElement("span", { className: "local-photo-list-item" },
            createElement(PhotoThumbnail, { id: item.value }),
            createElement("span", { className: "local-photo-list-label" }, child.props.children),
          ))
          : child,
      ));
    },
  });
  if (props["aria-label"] !== "档案叠放图片（最多选三张）") return createElement(NativeListView, props);
  // The native collection caches rendered rows by item identity. Reordering
  // keeps those identities, so give it fresh items with their current positions.
  // Keep each key stable to preserve focus and the native drag interaction.
  const items = Array.from(props.items, (item, index) => ({
    ...item,
    archivePosition: ["1 · 最上层", "2 · 中间层", "3 · 最底层"][index] ?? `${index + 1} · 不展示`,
  }));
  return createElement(NativeListView, {
    ...props,
    items,
    density: "compact",
    overflowMode: "wrap",
    UNSAFE_className: [props.UNSAFE_className, "local-archive-image-list"].filter(Boolean).join(" "),
    children: (item) => {
      const row = props.children(item);
      const position = item.archivePosition;
      return cloneElement(row, { textValue: `${position}，${row.props.textValue}` }, Children.map(row.props.children, (child) =>
        isValidElement(child) && child.type === Text
          ? cloneElement(child, {}, createElement(ArchiveImageThumbnail, { value: item.value, position }))
          : child,
      ));
    },
  });
}
