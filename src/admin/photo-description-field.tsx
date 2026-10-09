import { fields } from "@keystatic/core";
import { useLayoutEffect, useRef, type ComponentProps } from "react";

export const PHOTO_FILENAME_EVENT = "local-photo-filename";
type SlugField = ReturnType<typeof fields.slug>;

function PhotoDescriptionInput({ field, ...props }: ComponentProps<SlugField["Input"]> & { field: SlugField }) {
  const host = useRef<HTMLDivElement>(null);
  const automatic = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    const form = host.current?.closest("form");
    const update = (event: Event) => {
      if (props.value.name !== "" && props.value.name !== automatic.current) return;
      const filename = (event as CustomEvent<string | null>).detail;
      if (filename === null && automatic.current === undefined) return;
      const name = (filename ?? "").split(/[\\/]/).pop()!
        .replace(/\.[^.]+$/, "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
      automatic.current = filename === null ? undefined : name;
      // A filename supplies a description, not a replacement for a stable URL.
      props.onChange({ ...props.value, name });
    };
    form?.addEventListener(PHOTO_FILENAME_EVENT, update);
    return () => form?.removeEventListener(PHOTO_FILENAME_EVENT, update);
  }, [props.value, props.onChange]);
  const NativeInput = field.Input;
  return <div ref={host}><NativeInput {...props} onChange={value => {
    if (value.name !== props.value.name) automatic.current = undefined;
    props.onChange(value);
  }} /></div>;
}

export function photoDescription(options: Parameters<typeof fields.slug>[0]) {
  const field = fields.slug(options);
  return { ...field, Input: (props: ComponentProps<SlugField["Input"]>) => <PhotoDescriptionInput field={field} {...props} /> };
}
