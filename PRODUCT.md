# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

主要读者是希望了解 Leo 的工作、判断与长期记录的人，包括潜在合作方、同行与熟人。Leo 是唯一内容维护者，使用本地文件和 Git 完成编辑与发布。

## Product Purpose

“不息”是一份以长期记录为首要目标、兼顾职业展示的中文个人出版物。成功意味着文章、项目、摄影与职业信息都有稳定地址，内容可以多年持续积累，同时保持克制、可信和可维护。

## Positioning

网站把设计工程实践与个人生活记录放在同一套稳定内容模型中：职业展示不是一次性作品集，摄影也不是脱离上下文的图库，而是长期出版档案的一部分。

## Operating Context

内容通过 Astro Content Collections、Markdown/MDX、结构化数据和本地发布资产维护；正式构建为纯静态输出。照片原件仅在本地处理与独立备份中存在，发布前生成限制尺寸并清除敏感元数据的公开资产。

## Capabilities and Constraints

- 首版包含首页、项目、文章、照片、相册、关于、详情页、RSS 与 404。
- 技术基线为 Astro 6、TypeScript、Content Collections 与静态生成。
- 不引入数据库、CMS、账户系统或无明确需求的客户端状态。
- 照片、相册、标签和文章均使用首次发布时确定的稳定地址。
- 照片列表保留原始比例，使用显式“加载更多”，灯箱由 URL 和浏览语境驱动。
- 照片不得公开原件、精确坐标、设备序列号或第三方隐私。
- Afilmory 仅作为处理、Manifest 和查看器状态的参考，不部署或嵌入其完整应用。

## Brand Commitments

名称为“不息”，公开身份使用 Leo。语言克制、直接、诚实，不虚构成果或把示例内容描述为真实记录。既有视觉身份由 `PERSONAL_SITES_DESIGN_SYSTEM.md` 与 `src/styles/global.css` 约束。

## Evidence on Hand

- 产品与信息架构：`个人网站功能方案.md`
- 稳定领域语言：`CONTEXT.md`
- 设计依据：`PERSONAL_SITES_DESIGN_SYSTEM.md`
- 照片实施与验收：`docs/照片模块构建与上线指南.md`
- Afilmory 决策：`docs/adr/0001-selective-afilmory-adoption.md`
- 当前只有三张设计验证照片；正式摄影内容仍需由作者提供并逐张确认。

## Product Principles

- 长期可维护优先于短期视觉炫技。
- 内容事实与机器生成资产分离。
- 稳定地址、可访问性和无 JavaScript 基础浏览属于内容完整性。
- 隐私依靠不上传和构建审计，而不是依靠 `noindex`。
- 照片主导摄影页面，界面退后但不牺牲语境与元数据。

## Accessibility & Inclusion

保持语义化标题、44px 最小交互区域、可见焦点、键盘完整可达和准确替代文本。照片灯箱支持焦点锁定、`Esc`、方向键、焦点恢复与减少动态效果；移动端元数据不得覆盖照片。
