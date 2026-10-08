// Shared by the list and local save endpoint so drop positions have one meaning.
export function moveEntries(entries, keys, target) {
  const selected = new Set(keys);
  if (!selected.size || selected.size !== keys.length
    || keys.some((key) => !entries.some((entry) => entry.slug === key))
    || !entries.some((entry) => entry.slug === target.key)
    || !["before", "after"].includes(target.dropPosition)) {
    throw new Error("排序目标已失效，请刷新列表后重试。");
  }
  if (selected.has(target.key)) return entries;
  const moving = entries.filter((entry) => selected.has(entry.slug));
  const remaining = entries.filter((entry) => !selected.has(entry.slug));
  const index = remaining.findIndex((entry) => entry.slug === target.key);
  remaining.splice(index + (target.dropPosition === "after" ? 1 : 0), 0, ...moving);
  return remaining;
}
