export const formatDate = (date: Date, style: "short" | "long" = "short") =>
  new Intl.DateTimeFormat("zh-CN", style === "long"
    ? { year: "numeric", month: "long", day: "numeric" }
    : { year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date)
    .replaceAll("/", ".");

export const projectStatusLabels = {
  launched: "已上线",
  experiment: "实验",
  archive: "档案",
} as const;
