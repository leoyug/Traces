import { collection, config, fields } from "@keystatic/core";

const requiredText = (label: string, description?: string) =>
  fields.text({ label, description, validation: { isRequired: true } });

const title = fields.slug({
  name: { label: "标题", validation: { isRequired: true } },
  slug: {
    label: "稳定短名（网址）",
    description: "首次发布后请保持不变。建议用英文小写字母和连字符。",
  },
});

const publication = {
  description: requiredText("摘要", "用于列表和搜索结果，请用一句话说明内容。"),
  publishedAt: fields.date({ label: "发布日期", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
  updatedAt: fields.date({ label: "更新日期" }),
  draft: fields.checkbox({ label: "草稿（不公开）", defaultValue: true }),
};

export default config({
  storage: { kind: "local" },
  locale: "zh-CN",
  ui: {
    brand: { name: "不息 · 内容管理" },
    navigation: { "内容": ["projects", "articles", "photos"] },
  },
  collections: {
    projects: collection({
      label: "项目",
      columns: ["title", "year", "featured", "order", "draft"],
      slugField: "title",
      path: "src/content/projects/*",
      format: { contentField: "content" },
      entryLayout: "content",
      previewUrl: "/projects/{slug}",
      schema: {
        title,
        ...publication,
        year: fields.integer({ label: "项目年份", defaultValue: new Date().getFullYear(), validation: { isRequired: true, min: 2000, max: 2100 } }),
        status: fields.select({ label: "项目状态", options: [
          { label: "已上线", value: "launched" },
          { label: "实验", value: "experiment" },
          { label: "归档", value: "archive" },
        ], defaultValue: "archive" }),
        role: requiredText("我的职责"),
        featured: fields.checkbox({ label: "首页及项目页精选", defaultValue: false }),
        order: fields.integer({ label: "展示顺序", description: "数字越小越靠前；精选项目也按此顺序排列。", defaultValue: 0, validation: { isRequired: true, min: 0 } }),
        accent: fields.select({ label: "卡片色调", options: [
          { label: "暖陶", value: "clay" },
          { label: "鼠尾草绿", value: "sage" },
          { label: "浅蓝", value: "blue" },
        ], defaultValue: "clay" }),
        label: fields.text({ label: "卡片状态", description: "悬停精选卡片时显示在图片上方，例如「已完成」或「进行中」。" }),
        cover: fields.image({ label: "项目封面", directory: "public/media/projects", publicPath: "/media/projects/" }),
        archiveImages: fields.array(fields.image({ label: "档案叠放图片", directory: "public/media/projects", publicPath: "/media/projects/" }), { label: "档案叠放图片（最多选三张）" }),
        privacyNote: fields.text({ label: "匿名化说明", multiline: true }),
        relatedArticles: fields.array(fields.relationship({ label: "相关文章", collection: "articles" }), { label: "相关文章" }),
        content: fields.mdx({ label: "项目正文", extension: "md", options: { image: { directory: "public/media/projects", publicPath: "/media/projects/" } } }),
      },
    }),
    articles: collection({
      label: "写作",
      columns: ["title", "publishedAt", "draft"],
      slugField: "title",
      path: "src/content/articles/*",
      format: { contentField: "content" },
      entryLayout: "content",
      previewUrl: "/writing/{slug}",
      schema: {
        title,
        ...publication,
        tags: fields.array(fields.text({ label: "标签" }), { label: "标签" }),
        readingMinutes: fields.integer({ label: "预计阅读分钟", defaultValue: 3, validation: { isRequired: true, min: 1 } }),
        featured: fields.checkbox({ label: "精选", defaultValue: false }),
        relatedProjects: fields.array(fields.relationship({ label: "相关项目", collection: "projects" }), { label: "相关项目" }),
        content: fields.mdx({ label: "文章正文", extension: "md", options: { image: { directory: "public/media/articles", publicPath: "/media/articles/" } } }),
      },
    }),
    photos: collection({
      label: "摄影",
      columns: ["alt", "order", "draft"],
      slugField: "alt",
      path: "src/content/photos/*",
      format: "json",
      previewUrl: "/photos/{slug}",
      schema: {
        alt: fields.slug({ name: { label: "画面描述（替代文本）", description: "请描述照片中真实可见的内容。", validation: { isRequired: true } }, slug: { label: "稳定短名（网址）", description: "首次发布后请保持不变。" } }),
        src: fields.image({ label: "照片", description: "上传后会在构建时压缩并清理敏感元数据。", directory: "public/media/photos", publicPath: "/media/photos/", validation: { isRequired: true } }),
        order: fields.integer({ label: "展示顺序", description: "1 排在最前；已发布照片的数字不能重复。", defaultValue: 1, validation: { isRequired: true, min: 1 } }),
        size: fields.select({ label: "卡片比例（上传后自动修正）", options: [{ label: "竖图", value: "tall" }, { label: "横图", value: "short" }], defaultValue: "tall" }),
        orientation: fields.select({ label: "照片方向（上传后自动修正）", options: [{ label: "竖图", value: "portrait" }, { label: "横图", value: "landscape" }], defaultValue: "portrait" }),
        width: fields.integer({ label: "宽度（上传后自动填写）", defaultValue: 1200, validation: { isRequired: true, min: 1 } }),
        height: fields.integer({ label: "高度（上传后自动填写）", defaultValue: 1800, validation: { isRequired: true, min: 1 } }),
        draft: fields.checkbox({ label: "草稿（不公开）", defaultValue: true }),
        publicMetadata: fields.object({
          capturedAt: fields.date({ label: "拍摄日期", description: "有照片元数据时自动预填；发布前请核对。" }),
          place: fields.text({ label: "地点（只写公开安全的范围）" }),
          camera: fields.text({ label: "相机" }),
          lens: fields.text({ label: "镜头" }),
          focalLength: fields.text({ label: "焦距" }),
          aperture: fields.text({ label: "光圈" }),
          shutterSpeed: fields.text({ label: "快门" }),
          iso: fields.integer({ label: "感光度", validation: { min: 1 } }),
        }, { label: "可公开的拍摄信息" }),
      },
    }),
  },
});
