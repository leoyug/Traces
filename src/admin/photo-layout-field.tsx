import { fields } from "@keystatic/core";
import { useLayoutEffect, useRef, type ComponentProps } from "react";

export const PHOTO_DIMENSIONS_EVENT = "local-photo-dimensions";
type Dimensions = { width: number; height: number };
type SelectField = ReturnType<typeof fields.select>;

function PhotoLayoutInput({ field, property, ...props }: ComponentProps<SelectField["Input"]> & {
  field: SelectField;
  property: "size" | "orientation";
}) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const form = host.current?.closest("form");
    const update = (event: Event) => {
      const { width, height } = (event as CustomEvent<Dimensions>).detail;
      const portrait = height > width;
      const value = property === "size" ? (portrait ? "tall" : "short") : (portrait ? "portrait" : "landscape");
      if (props.value !== value) props.onChange(value);
    };
    form?.addEventListener(PHOTO_DIMENSIONS_EVENT, update);
    return () => form?.removeEventListener(PHOTO_DIMENSIONS_EVENT, update);
  }, [property, props.value, props.onChange]);
  const NativeInput = field.Input;
  return <div ref={host}><NativeInput {...props} /></div>;
}

// Retain native selection, validation and serialization; update its actual form
// value when the photo asset decodes, rather than replacing the visible label.
export function photoLayoutSelect(options: Parameters<typeof fields.select>[0], property: "size" | "orientation") {
  const field = fields.select(options);
  return { ...field, Input: (props: ComponentProps<SelectField["Input"]>) => <PhotoLayoutInput field={field} property={property} {...props} /> };
}
