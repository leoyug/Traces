import { fields } from "@keystatic/core";
import { useLayoutEffect, useRef, type ComponentType } from "react";

export const PHOTO_METADATA_EVENT = "local-photo-metadata";
export type PublicPhotoMetadata = Partial<{
  capturedAt: string; camera: string; lens: string; focalLength: string;
  aperture: string; shutterSpeed: string; iso: number;
}>;
type Property = keyof PublicPhotoMetadata;
type InputProps<Value> = {
  value: Value; onChange(value: Value): void; autoFocus: boolean; forceValidation: boolean;
};

function metadataInput<Value extends string | number | null>(NativeInput: ComponentType<InputProps<Value>>, property: Property, emptyValue: Value) {
  return function PhotoMetadataInput(props: InputProps<Value>) {
    const host = useRef<HTMLDivElement>(null);
    const automatic = useRef<Value | undefined>(undefined);
    useLayoutEffect(() => {
      const form = host.current?.closest("form");
      const update = (event: Event) => {
        const value = (event as CustomEvent<PublicPhotoMetadata>).detail[property];
        // Replacement photos can update a previous prefill, but never overwrite
        // a value the editor has supplied or changed while extraction is pending.
        if (props.value !== null && props.value !== "" && props.value !== automatic.current) return;
        if (value === undefined) {
          if (automatic.current !== undefined) {
            automatic.current = undefined;
            props.onChange(emptyValue);
          }
          return;
        }
        const next = value as Value;
        automatic.current = next;
        props.onChange(next);
      };
      form?.addEventListener(PHOTO_METADATA_EVENT, update);
      return () => form?.removeEventListener(PHOTO_METADATA_EVENT, update);
    }, [props.value, props.onChange]);
    return <div ref={host}><NativeInput {...props} onChange={value => {
      automatic.current = undefined;
      props.onChange(value);
    }} /></div>;
  };
}

export function photoMetadataText(options: Parameters<typeof fields.text>[0], property: Exclude<Property, "iso" | "capturedAt">) {
  const field = fields.text(options);
  return { ...field, Input: metadataInput(field.Input, property, field.defaultValue()) };
}
export function photoMetadataDate(options: Parameters<typeof fields.date>[0]) {
  const field = fields.date(options);
  return { ...field, Input: metadataInput(field.Input, "capturedAt", field.defaultValue()) };
}
export function photoMetadataISO(options: Parameters<typeof fields.integer>[0]) {
  const field = fields.integer(options);
  return { ...field, Input: metadataInput(field.Input, "iso", field.defaultValue()) };
}
