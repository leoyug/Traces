# 项目协作说明

## 项目介绍

这是“不息”的中文个人网站初版：一份以长期记录为首要目标、兼顾职业展示的个人出版物。首版覆盖首页、项目、文章、相册、关于、文章详情、RSS、404，以及仅供开发环境查看的设计系统预览页。

技术栈为 Astro 6、TypeScript 和静态生成。内容使用 Astro Content Collections，并保持 `projects`、`articles`、`albums`、`photos`、`resume` 的领域边界。

## 前端目录结构

```text
src/
├── components/        # 跨页面复用的 UI 组件
│   ├── Button.astro
│   ├── Card.astro
│   ├── ContentRow.astro
│   ├── ProjectCard.astro
│   ├── SectionHeading.astro
│   ├── SiteFooter.astro
│   └── SiteHeader.astro
├── content/           # 文章、项目、相册、照片与职业履历内容
├── content.config.ts  # Content Collections 结构校验与引用规则
├── data/site.ts       # 导航和非领域视觉占位数据
├── layouts/           # 页面骨架、元数据和全站结构
├── pages/             # 路由页面；只负责内容编排
└── styles/global.css  # token、基础样式、组件样式和响应式规则
```

项目根目录中的 `PERSONAL_SITES_DESIGN_SYSTEM.md` 是设计依据，`个人网站功能方案.md` 是产品与信息架构依据，`CONTEXT.md` 定义稳定领域语言。修改内容模型或页面结构前必须先阅读相关文档。

## 设计系统架构

设计变量集中在 `src/styles/global.css` 的 `@layer tokens` 中，页面不得自行复制固定色值、间距、圆角或阴影。

- 色彩：暖白 canvas、纸张 surface、低对比 line、近黑 ink、暖橙棕 accent。
- 排版：参考 Ian Neo 的克制层级，以系统 sans 统一界面、标题和正文；仅在少量个人批注中使用 script，mono 只用于真正的代码或等宽数据。
- 间距：4px 基准，优先使用 `--space-*`。
- 圆角：从 `--radius-xs` 到 `--radius-pill`，大容器避免滥用圆角。
- 阴影：`hairline`、`card`、`float` 三级；普通内容列表优先使用分隔和留白。
- 容器：阅读栏 480px，常规宽栏 768px；移动端默认 24px gutter。
- 响应式：移动优先；640px 调整内容行，768px 切换导航和主要网格。正文不因窄屏整体缩小。

开发环境运行后访问 `/design-system` 可查看颜色、字体、间距、圆角、按钮、卡片、内容行、表单和布局。该路由在生产构建中重定向到首页，不公开预览内容。

## 组件复用规范

开发页面时必须优先复用已有组件，页面只负责编排组件与提供内容数据，不重复堆叠组件内部样式。

1. 先检查 `src/components` 是否已有满足同一语义的组件。
2. 如果已有组件可通过 `props`、`variant`、`size`、`class` / `className` 或 slot 扩展，必须优先扩展现有组件，而不是创建相似组件。
3. 只有当现有组件在语义、结构或交互上确实无法满足需求时，才新增组件。
4. 新组件需提供清晰、有限的 props；样式必须引用设计 token，并在 `/design-system` 增加对应示例。
5. `ContentRow` 是文章和项目索引的默认表达；只有内容需要独立表面层级、媒体裁切或复杂操作时才使用 `Card`。
6. 页面内局部样式只允许描述该页面独有的组合关系，不能复制 Button、Card、Input、导航等公共样式。

## 后续开发注意事项

- 保持语义化标题层级、44px 最小交互区域、可见焦点和键盘完整可达。
- 所有有信息意义的照片都必须提供准确 `alt`；装饰图使用空 `alt`。
- 动效必须尊重 `prefers-reduced-motion`，且不得延迟正文出现。
- 照片只能发布已清理敏感 EXIF 的发布资产；不得公开原件、精确坐标、设备序列号或第三方隐私。
- 稳定短名一经发布不随标题变化；迁移时设置跳转。
- 无真实内容的栏目不应以空页面上线。演示内容替换为真实资料时，同步核对职业信息、项目匿名化说明和照片隐私。
- 首版保持纯静态，不引入数据库、CMS、账号系统或无明确需求的客户端状态。
- 合并前至少运行 `npm run build`，并检查首页、移动导航、主要列表、文章详情、404 和开发环境设计系统页。
