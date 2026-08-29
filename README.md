# 不息 Traces

“不息”是一份以长期记录为首要目标、兼顾职业展示的中文个人网站。文章、项目、摄影和职业信息使用同一套稳定的内容模型维护，目标是让内容能够持续积累，而不是成为一次性的作品集。

当前版本：[`v0.1`](./docs/releases/v0.1.md)

## 特点

- Astro 6 + TypeScript，构建为纯静态网站。
- 使用 Astro Content Collections 管理文章、项目、相册、照片和履历。
- 响应式照片网格保留原始比例，并提供无 JavaScript 基础浏览。
- URL 驱动的照片灯箱支持键盘、触摸、焦点管理和浏览器历史。
- 本地照片处理生成 JPG/WebP 响应式资产与 Manifest。
- 构建审计检查照片尺寸、缺失资产、孤立文件和敏感 EXIF。
- 语义化结构、可见焦点、44px 最小交互区域，并尊重减弱动态效果偏好。

## 技术栈

- [Astro](https://astro.build/)
- TypeScript
- Astro Content Collections
- Sharp
- ExifTool
- GSAP

项目不依赖数据库、CMS、账户系统或服务端运行时。

## 本地运行

需要 Node.js 和 npm。

```bash
git clone https://github.com/leoyug/Traces.git
cd Traces
npm install
npm run dev
```

开发服务器启动后访问终端显示的本地地址。开发环境还提供 `/design-system`，用于检查设计变量和公共组件；该页面不会作为公开内容出现在生产版本中。

常用命令：

```bash
npm run dev             # 启动开发服务器
npm run check           # Astro 类型检查 + 照片发布审计
npm run build           # 完整检查并生成静态网站
npm run preview         # 本地预览生产构建
npm run photos:process  # 处理照片原件并更新发布资产
npm run photos:audit    # 单独审计照片发布资产
```

生产构建输出到 `dist/`，可部署到支持静态站点的平台。

## 内容结构

```text
src/
├── components/          # 全站公共组件与照片组件
├── content/             # articles、projects、albums、photos、resume
├── content.config.ts    # Content Collections 结构与引用规则
├── data/                # 站点数据与照片资产 Manifest
├── layouts/             # 页面骨架与全站元数据
├── lib/                 # 内容和照片查询逻辑
├── pages/               # Astro 路由
└── styles/global.css    # 设计变量、基础样式与响应式规则

private/photos/          # 本地照片原件；被 Git 忽略
public/media/photos/     # 可公开发布的响应式照片资产
scripts/photos/          # 照片处理与审计脚本
```

文章、项目、照片和相册使用文件名作为稳定短名。公开发布后，不应仅因标题变化而修改短名。

## 发布照片

照片原件只作为本地处理输入，不应进入 Git 或公开构建。

1. 将原件放入 `private/photos/`。
2. 在 `src/content/photos/` 新增照片内容文件，填写 `sourceFile`、准确的 `alt`、日期、标签和允许公开的地点信息。
3. 如需归入相册，在 `src/content/albums/` 更新相册内容和照片引用。
4. 运行 `npm run photos:process`，生成限制尺寸、清除敏感元数据的 JPG/WebP 资产。
5. 运行 `npm run build`，确认内容校验和照片审计全部通过。
6. 人工检查图片、替代文本、公开元数据和移动端灯箱后再提交发布资产。

处理脚本只将经过白名单选择的相机参数写入 Manifest；GPS、序列号、作者等敏感字段不得公开。完整流程与验收要求见[照片模块构建与上线指南](./docs/%E7%85%A7%E7%89%87%E6%A8%A1%E5%9D%97%E6%9E%84%E5%BB%BA%E4%B8%8E%E4%B8%8A%E7%BA%BF%E6%8C%87%E5%8D%97.md)。

## 设计与实现原则

- 长期可维护优先于短期视觉炫技。
- 稳定地址、无障碍和无 JavaScript 基础浏览属于内容完整性。
- 内容事实与机器生成资产分离。
- 隐私依靠不上传和构建审计，而不是依靠 `noindex`。
- Afilmory 只作为照片处理与查看器状态的设计参考，不部署或嵌入其完整应用。

## 项目文档

- [V0.1 版本说明与后续计划](./docs/releases/v0.1.md)
- [产品定位与约束](./PRODUCT.md)
- [设计说明](./DESIGN.md)
- [设计系统](./PERSONAL_SITES_DESIGN_SYSTEM.md)
- [领域语言](./CONTEXT.md)
- [产品与信息架构](./%E4%B8%AA%E4%BA%BA%E7%BD%91%E7%AB%99%E5%8A%9F%E8%83%BD%E6%96%B9%E6%A1%88.md)
- [Afilmory 选择性借鉴决策](./docs/adr/0001-selective-afilmory-adoption.md)

## 当前状态

V0.1 已完成网站基础和 Astro 原生照片系统。仓库中的部分照片、文章、项目与职业信息仍用于设计验证，正式上线前需要替换或逐项核实。下一阶段重点是补充真实内容、压力测试照片流程并完成正式发布闭环。
