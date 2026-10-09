export const projectStatuses = {
  ongoing: { label: "进行中" },
  launched: { label: "已上线" },
  experiment: { label: "实验" },
  archive: { label: "归档" },
};

// Preserve the formerly visible card status when migrating duplicate fields.
export function normalizeProjectStatus(data) {
  const legacyStatus = Object.entries(projectStatuses).find(([, status]) => status.label === data.label?.trim());
  return legacyStatus?.[0] ?? (Object.hasOwn(projectStatuses, data.status) ? data.status : "archive");
}
