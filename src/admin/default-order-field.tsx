import { fields } from "@keystatic/core";
import { Text } from "@keystar/ui/typography";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";

type OrderField = ReturnType<typeof fields.integer>;
type Collection = "photos" | "projects";
type InputProps = ComponentProps<OrderField["Input"]>;

function DefaultOrderInput({ field, collection, ...props }: InputProps & {
  field: OrderField;
  collection: Collection;
}) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const [failed, setFailed] = useState(false);
  useLayoutEffect(() => { latest.current = props; });

  useEffect(() => {
    setFailed(false);
    // Existing records and a number supplied by the editor must keep their order.
    if (props.value !== null || host.current?.closest("form")?.id !== "item-create-form") return;
    const controller = new AbortController();
    const container = host.current;
    // Native number fields commit on blur. Cancel as soon as typing begins,
    // so a late response cannot replace an uncommitted number.
    const cancel = () => controller.abort();
    container?.addEventListener("input", cancel);
    async function prefill() {
      try {
        const response = await fetch(`/api/content-order/${collection}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unable to read display orders");
        const snapshot = await response.json();
        if (!Array.isArray(snapshot.entries)) throw new Error("Invalid order snapshot");
        let maximum = 0;
        for (const entry of snapshot.entries) {
          if (!Number.isSafeInteger(entry.order) || entry.order < 0) throw new Error("Invalid display order");
          maximum = Math.max(maximum, entry.order);
        }
        const next = maximum + 1;
        if (!Number.isSafeInteger(next)) throw new Error("Display order exceeds supported range");
        if (!controller.signal.aborted && latest.current.value === null) latest.current.onChange(next);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void prefill();
    return () => {
      controller.abort();
      container?.removeEventListener("input", cancel);
    };
  }, [collection, props.value]);

  const NativeInput = field.Input;
  return <div ref={host}>
    <NativeInput {...props} />
    {failed && <Text size="small" color="neutralSecondary" role="status">暂时无法获取末尾序号，请刷新页面或手动填写。</Text>}
  </div>;
}

// Retain native validation and serialization, but derive new-item defaults from
// all saved entries (including drafts) instead of a fixed number.
export function defaultNextOrder(options: Omit<Parameters<typeof fields.integer>[0], "defaultValue">, collection: Collection) {
  const field = fields.integer(options);
  return { ...field, Input: (props: InputProps) => <DefaultOrderInput field={field} collection={collection} {...props} /> };
}
