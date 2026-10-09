import { fields } from "@keystatic/core";
import { PHOTO_DIMENSIONS_EVENT } from "./photo-layout-field";
import { PHOTO_METADATA_EVENT, type PublicPhotoMetadata } from "./photo-metadata-field";
import { PHOTO_FILENAME_EVENT } from "./photo-description-field";
import { ActionButton, Button } from "@keystar/ui/button";
import { Dialog, DialogContainer } from "@keystar/ui/dialog";
import { DropZone } from "@keystar/ui/drag-and-drop";
import { FieldMessage } from "@keystar/ui/field";
import { Content } from "@keystar/ui/slots";
import { Heading, Text } from "@keystar/ui/typography";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";

type ImageField = ReturnType<typeof fields.image>;
type ImageInputProps = ComponentProps<ImageField["Input"]>;
const clipboardExtensions: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/avif": "avif", "image/gif": "gif", "image/svg+xml": "svg",
  "image/bmp": "bmp", "image/tiff": "tiff",
};

// Keep Keystatic's chooser, preview and asset serialization intact.
function ImageUploadInput({ field, transformFilename, derivePhotoLayout, ...props }: ImageInputProps & {
  field: ImageField;
  transformFilename?: (filename: string) => string;
  derivePhotoLayout: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const dropZone = useRef<HTMLDivElement>(null);
  const chooser = useRef<HTMLButtonElement | null>(null);
  const revision = useRef(0);
  const reading = useRef(false);
  const metadataUpload = useRef<Uint8Array | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [metadataMessage, setMetadataMessage] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  useEffect(() => () => { revision.current++; }, []);
  useEffect(() => { setPreviewSrc(null); }, [props.value]);
  const imageData = props.value?.data;
  useEffect(() => {
    if (!derivePhotoLayout || !imageData) return;
    let cancelled = false;
    const url = URL.createObjectURL(new Blob([new Uint8Array(imageData).buffer]));
    const image = new Image();
    image.src = url;
    void image.decode().then(() => {
      if (cancelled) return;
      host.current?.closest("form")?.dispatchEvent(new CustomEvent(PHOTO_DIMENSIONS_EVENT, {
        detail: { width: image.naturalWidth, height: image.naturalHeight },
      }));
    }).catch(() => {
      // The upload flow reports invalid images; preserve current layout on failure.
    }).finally(() => URL.revokeObjectURL(url));
    return () => { cancelled = true; URL.revokeObjectURL(url); };
  }, [imageData, derivePhotoLayout]);
  useEffect(() => {
    if (!derivePhotoLayout || !imageData || metadataUpload.current !== imageData) return;
    const controller = new AbortController();
    host.current?.closest("form")?.dispatchEvent(new CustomEvent(PHOTO_FILENAME_EVENT, { detail: props.value?.filename ?? "" }));
    host.current?.closest("form")?.dispatchEvent(new CustomEvent(PHOTO_METADATA_EVENT, { detail: {} }));
    setMetadataMessage("正在读取拍摄参数…");
    void (async () => {
      try {
        const response = await fetch(`/api/photo-metadata?name=${encodeURIComponent(props.value?.filename ?? "photo.jpg")}`, {
          method: "POST", headers: { "content-type": "application/octet-stream" },
          body: new Uint8Array(imageData).buffer, signal: controller.signal,
        });
        if (!response.ok) throw new Error("metadata extraction failed");
        const result = await response.json() as { fields: PublicPhotoMetadata };
        if (controller.signal.aborted) return;
        host.current?.closest("form")?.dispatchEvent(new CustomEvent(PHOTO_METADATA_EVENT, { detail: result.fields }));
        setMetadataMessage(Object.keys(result.fields).length ? "已读取拍摄参数，请核对。" : "图片未包含可读取的拍摄参数，可手动填写。");
      } catch {
        if (!controller.signal.aborted) setMetadataMessage("无法读取拍摄参数，可手动填写。");
      }
    })();
    return () => controller.abort();
  }, [imageData, derivePhotoLayout, props.value?.filename]);
  useLayoutEffect(() => {
    chooser.current = host.current?.querySelector(".local-image-upload-preview button") ?? null;
    if (chooser.current) {
      chooser.current.dataset.localImageChooser = "";
      chooser.current.parentElement!.dataset.localImageNativeActions = "";
    }
    const nativePreview = host.current?.querySelector(".local-image-upload-preview");
    const decorateThumbnail = () => {
      const thumbnail = nativePreview?.querySelector("img")?.parentElement;
      if (!thumbnail) return;
      thumbnail.dataset.localImageThumbnail = "";
      thumbnail.setAttribute("role", "button");
      thumbnail.setAttribute("tabindex", "0");
      thumbnail.setAttribute("aria-label", `放大查看${field.label}`);
      thumbnail.setAttribute("aria-haspopup", "dialog");
    };
    decorateThumbnail();
    // The native input creates its object URL after mounting. Observe the
    // thumbnail without replacing React-owned nodes or duplicating the asset.
    const observer = new MutationObserver(decorateThumbnail);
    if (nativePreview) observer.observe(nativePreview, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [inputKey, field.label]);
  useEffect(() => {
    const form = host.current?.closest("form");
    const validate = () => setShowValidation(true);
    form?.addEventListener("submit", validate, true);
    return () => form?.removeEventListener("submit", validate, true);
  }, []);
  useEffect(() => {
    if (props.forceValidation) setShowValidation(true);
  }, [props.forceValidation]);

  async function receive(getFiles: () => Promise<File[]>) {
    if (reading.current) return;
    const request = ++revision.current;
    reading.current = true;
    setBusy(true);
    setError("");
    setMessage("正在读取图片…");
    try {
      const files = await getFiles();
      if (files.length !== 1) throw new Error(files.length ? "一次请选择一张图片。" : "没有找到图片，请复制图片后重试。");
      const file = files[0];
      if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|avif|gif|svg|bmp|tiff?)$/i.test(file.name)) {
        throw new Error("请选择图片文件。");
      }
      if (file.size > 80_000_000) throw new Error("图片超过 80 MB，请选择较小的图片。");
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
      } catch {
        throw new Error("无法读取这张图片，请检查文件或换一张图片。");
      } finally {
        URL.revokeObjectURL(url);
      }
      const extension = file.name.match(/\.([^.]+)$/)?.[1] || clipboardExtensions[file.type];
      if (!extension) throw new Error("无法识别图片格式，请另存为 JPG 或 PNG 后重试。");
      const data = new Uint8Array(await file.arrayBuffer());
      if (revision.current !== request) return;
      const filename = file.name.match(/\.[^.]+$/) ? file.name : `粘贴图片.${extension}`;
      metadataUpload.current = data;
      props.onChange({ data, extension, filename: transformFilename ? transformFilename(filename) : filename });
      setMessage("图片已添加，保存后生效。");
    } catch (cause) {
      if (revision.current !== request) return;
      setMessage("");
      setError(cause instanceof Error ? cause.message : "读取图片失败，请重试。");
    } finally {
      reading.current = false;
      if (revision.current === request) setBusy(false);
    }
  }

  const NativeInput = field.Input;
  function changeImage(value: ImageInputProps["value"]) {
    revision.current++;
    metadataUpload.current = value?.data ?? null;
    setMetadataMessage("");
    if (derivePhotoLayout && value === null) {
      const form = host.current?.closest("form");
      form?.dispatchEvent(new CustomEvent(PHOTO_METADATA_EVENT, { detail: {} }));
      form?.dispatchEvent(new CustomEvent(PHOTO_FILENAME_EVENT, { detail: null }));
    }
    setBusy(false);
    setMessage("");
    setError("");
    setShowValidation(false);
    // Remount after removal so required-image validation waits for submission.
    if (value === null) setInputKey(key => key + 1);
    props.onChange(value);
  }
  function openPreview(target: EventTarget) {
    const thumbnail = (target as HTMLElement).closest("[data-local-image-thumbnail]");
    const image = thumbnail?.querySelector("img");
    if (image) setPreviewSrc(image.currentSrc || image.src);
  }
  return <div ref={host} className="local-image-upload" data-has-image={props.value !== null} onClick={event => {
    // React portal events bubble to this field, including the native dialog's padding.
    if ((event.target as HTMLElement).closest(".local-image-preview-dialog")) setPreviewSrc(null);
  }} onPasteCapture={event => {
    if (props.value !== null) return;
    const files = [...event.clipboardData.files];
    if (!files.length) return;
    event.preventDefault();
    event.stopPropagation();
    void receive(async () => files);
  }}>
    <div className="local-image-upload-preview" onClick={event => openPreview(event.target)} onKeyDown={event => {
      if ((event.key === "Enter" || event.key === " ") && (event.target as HTMLElement).matches("[data-local-image-thumbnail]")) {
        event.preventDefault();
        openPreview(event.target);
      }
    }}><NativeInput key={inputKey} {...props} forceValidation={showValidation} onChange={changeImage} /></div>
    <div className="local-image-upload-zone" aria-disabled={busy}
      onClick={event => {
        if (!(event.target as HTMLElement).closest("button")) dropZone.current?.querySelector("button")?.focus();
      }}
      onKeyDownCapture={event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (event.target !== dropZone.current?.querySelector("button")) return;
        event.preventDefault();
        event.stopPropagation();
        if (!busy) chooser.current?.click();
      }}>
      <DropZone ref={dropZone} aria-label={`${field.label}拖放或粘贴上传`}
        // React Aria exposes file MIME types, not DataTransfer's "Files" marker.
        // Unknown MIME types are checked by filename and decoding after the drop.
        getDropOperation={types => !busy && (types.has("image/*") || types.has("application/octet-stream")) ? "copy" : "cancel"}
        onDrop={event => { void receive(async () => Promise.all(event.items.filter(item => item.kind === "file").map(item => item.getFile()))); }}
        UNSAFE_className="local-image-drop-zone">
        <ActionButton isDisabled={busy} onPress={() => chooser.current?.click()}>选择文件</ActionButton>
        <Text slot="label">拖放图片到这里</Text>
        <Text size="small" color="neutralSecondary">聚焦此区域后按 Ctrl+V 或 Command+V 粘贴图片</Text>
      </DropZone>
    </div>
    <div role="status" aria-live="polite" className="local-image-upload-status">
      {error ? <FieldMessage>{error}</FieldMessage> : (message || metadataMessage) ? <Text size="small" color="neutralSecondary">{[message, metadataMessage].filter(Boolean).join(" ")}</Text> : null}
    </div>
    {props.value !== null && <Button tone="critical" prominence="low" UNSAFE_className="local-image-remove" onPress={() => changeImage(null)}>移除</Button>}
    <DialogContainer isDismissable onDismiss={() => setPreviewSrc(null)}>
      {previewSrc && <Dialog size="large" UNSAFE_className="local-image-preview-dialog">
        <Heading>{field.label}预览</Heading>
        <Content><img className="local-image-enlarged" src={previewSrc} alt={`已添加的${field.label}`} /></Content>
      </Dialog>}
    </DialogContainer>
  </div>;
}

export function imageUpload(options: Parameters<typeof fields.image>[0], derivePhotoLayout = false): ImageField {
  const field = fields.image(options);
  return { ...field, Input: props => <ImageUploadInput field={field} derivePhotoLayout={derivePhotoLayout} transformFilename={options.transformFilename} {...props} /> };
}
