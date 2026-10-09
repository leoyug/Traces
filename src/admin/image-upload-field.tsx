import { fields } from "@keystatic/core";
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
function ImageUploadInput({ field, transformFilename, ...props }: ImageInputProps & {
  field: ImageField;
  transformFilename?: (filename: string) => string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const dropZone = useRef<HTMLDivElement>(null);
  const chooser = useRef<HTMLButtonElement | null>(null);
  const revision = useRef(0);
  const reading = useRef(false);
  const [inputKey, setInputKey] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  useEffect(() => () => { revision.current++; }, []);
  useEffect(() => { setPreviewSrc(null); }, [props.value]);
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
  return <div ref={host} className="local-image-upload" data-has-image={props.value !== null} onPasteCapture={event => {
    if (props.value !== null) return;
    const files = [...event.clipboardData.files];
    if (!files.length) return;
    event.preventDefault();
    event.stopPropagation();
    void receive(async () => files);
  }}>
    {props.value !== null && <Button tone="critical" prominence="low" UNSAFE_className="local-image-remove" onPress={() => changeImage(null)}>移除</Button>}
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
        getDropOperation={types => !busy && types.has("Files") ? "copy" : "cancel"}
        onDrop={event => { void receive(async () => Promise.all(event.items.filter(item => item.kind === "file").map(item => item.getFile()))); }}
        UNSAFE_className="local-image-drop-zone">
        <ActionButton isDisabled={busy} onPress={() => chooser.current?.click()}>选择文件</ActionButton>
        <Text slot="label">拖放图片到这里</Text>
        <Text size="small" color="neutralSecondary">聚焦此区域后按 Ctrl+V 或 Command+V 粘贴图片</Text>
      </DropZone>
    </div>
    <div role="status" aria-live="polite" className="local-image-upload-status">
      {error ? <FieldMessage>{error}</FieldMessage> : message ? <Text size="small" color="neutralSecondary">{message}</Text> : null}
    </div>
    <DialogContainer isDismissable onDismiss={() => setPreviewSrc(null)}>
      {previewSrc && <Dialog size="large">
        <Heading>{field.label}预览</Heading>
        <Content><img className="local-image-enlarged" src={previewSrc} alt={`已添加的${field.label}`} /></Content>
      </Dialog>}
    </DialogContainer>
  </div>;
}

export function imageUpload(options: Parameters<typeof fields.image>[0]): ImageField {
  const field = fields.image(options);
  return { ...field, Input: props => <ImageUploadInput field={field} transformFilename={options.transformFilename} {...props} /> };
}
