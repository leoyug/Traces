export const navigation = [
  { label: "首页", href: "/" },
  { label: "项目", href: "/projects" },
  { label: "文章", href: "/writing" },
  { label: "相册", href: "/gallery" },
  { label: "关于", href: "/about" },
];

export const articles = [
  {
    title: "把模糊需求变成可维护的界面",
    summary: "一套从问题定义、信息结构到组件边界的工作方法。",
    date: "2026.08.06",
    href: "/writing/clarity-before-components",
    tags: ["设计工程", "方法"],
  },
  {
    title: "我如何整理一座不断生长的个人档案",
    summary: "关于稳定地址、内容关系，以及为什么个人网站值得慢慢做。",
    date: "2026.07.18",
    href: "/writing/a-living-archive",
    tags: ["个人网站", "记录"],
  },
];

export const projects = [
  {
    title: "复杂工作台的结构重构",
    summary: "在六周内统一任务、资产与协作流，建立可扩展的页面骨架。",
    year: "2026",
    status: "已上线",
    accent: "clay",
  },
  {
    title: "内容发布系统",
    summary: "让编辑、设计与研发共享同一套发布语言和状态模型。",
    year: "2025",
    status: "已上线",
    accent: "sage",
  },
  {
    title: "照片档案实验",
    summary: "围绕稳定链接、浏览语境与隐私元数据的个人摄影工具。",
    year: "2026",
    status: "实验",
    accent: "blue",
  },
];

export const photos = [
  { title: "雨后的旧街", place: "杭州", date: "2026.07", tone: "umber", ratio: "portrait" },
  { title: "午后三点", place: "上海", date: "2026.06", tone: "sage", ratio: "landscape" },
  { title: "海边旅店", place: "泉州", date: "2026.05", tone: "blue", ratio: "square" },
  { title: "窗边的树", place: "杭州", date: "2026.04", tone: "gold", ratio: "portrait" },
  { title: "末班车", place: "上海", date: "2026.03", tone: "ink", ratio: "landscape" },
  { title: "小城散步", place: "绍兴", date: "2026.02", tone: "clay", ratio: "square" },
];
