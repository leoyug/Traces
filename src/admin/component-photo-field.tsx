import { fields } from "@keystatic/core";
import { Combobox, Item } from "@keystar/ui/combobox";
import { useState, type ComponentProps } from "react";
import { adminPhotoOptions } from "./photo-records";

const options = adminPhotoOptions;
const labels = new Map(options.map((photo) => [photo.id, photo.label]));

export const componentPhotoLabel = (id: string | null) => id ? labels.get(id) ?? `${id}（已删除）` : "请选择照片";

type Relationship = ReturnType<typeof fields.relationship<true>>;
function PhotoInput(props: ComponentProps<Relationship["Input"]>) {
  const [blurred, setBlurred] = useState(false);
  const items = props.value && !labels.has(props.value)
    ? [...options, { id: props.value, label: componentPhotoLabel(props.value) }]
    : options;
  return <Combobox
    label="照片"
    description="输入画面描述搜索已有照片。"
    value={props.value}
    onChange={(id) => props.onChange(typeof id === "string" ? id : null)}
    onBlur={() => setBlurred(true)}
    autoFocus={props.autoFocus}
    defaultItems={items}
    isRequired
    errorMessage={(props.forceValidation || blurred) && !props.value ? "请选择照片" : undefined}
    width="auto"
  >{(photo) => <Item key={photo.id} textValue={photo.label}>{photo.label}</Item>}</Combobox>;
}

export function componentPhotoRelationship() {
  const field = fields.relationship({ label: "照片", collection: "photos", validation: { isRequired: true } });
  return { ...field, Input: PhotoInput };
}
