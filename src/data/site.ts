export const navigation = [
  { label: "首页", href: "/" },
  { label: "项目", href: "/projects" },
  { label: "文章", href: "/writing" },
  { label: "相册", href: "/gallery" },
  { label: "关于", href: "/about" },
];

// 这些是相册页面的视觉占位，不属于“照片”领域对象。
// 接入经过隐私清理的发布资产后，应删除本数组并改读 photos collection。
export const galleryPlaceholders = [
  { title: "雨后的旧街", place: "杭州", date: "2026.07", tone: "umber", ratio: "portrait" },
  { title: "午后三点", place: "上海", date: "2026.06", tone: "sage", ratio: "landscape" },
  { title: "海边旅店", place: "泉州", date: "2026.05", tone: "blue", ratio: "square" },
  { title: "窗边的树", place: "杭州", date: "2026.04", tone: "gold", ratio: "portrait" },
  { title: "末班车", place: "上海", date: "2026.03", tone: "ink", ratio: "landscape" },
  { title: "小城散步", place: "绍兴", date: "2026.02", tone: "clay", ratio: "square" },
];
