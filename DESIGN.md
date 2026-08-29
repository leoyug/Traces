---
name: "不息摄影体验"
description: "暖白个人出版物中的隐私优先摄影档案；照片领先，界面退后。"
colors:
  warm-canvas: "#fbfbfa"
  paper-surface: "#fff"
  quiet-surface: "#f4f2f0"
  near-black-ink: "#191511"
  muted-ink: "#716a65"
  faint-ink: "#77706a"
  quiet-line: "#e8e4e1"
  warm-accent: "#a45a37"
  warm-accent-soft: "#f3e7e0"
  on-dark: "#fbfbfa"
  image-stage: "#0d0c0b"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  page-title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0"
  metadata:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0"
rounded:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  pill: "9999px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  12: "3rem"
  16: "4rem"
  20: "5rem"
  24: "6rem"
  32: "8rem"
components:
  button-secondary:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.near-black-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "2.75rem"
  photo-tile:
    backgroundColor: "{colors.quiet-surface}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.sm}"
    padding: "0"
    width: "100%"
  lightbox-control:
    backgroundColor: "rgb(251 251 250 / 10%)"
    textColor: "white"
    rounded: "{rounded.pill}"
    height: "2.75rem"
    width: "2.75rem"
  lightbox-metadata:
    backgroundColor: "{colors.warm-canvas}"
    textColor: "{colors.near-black-ink}"
    typography: "{typography.body}"
    padding: "3rem 2rem"
    width: "22rem"
---

# Design System: 不息摄影体验

## Overview

**Creative North Star: "一页安静的摄影出版物"**

摄影体验是“不息”既有个人出版视觉系统的一部分，而不是新的独立品牌。`PERSONAL_SITES_DESIGN_SYSTEM.md` 仍是全站权威设计依据；本文件只固化 `src/pages/photos`、`src/pages/albums`、`src/components/photos` 与 `src/styles/global.css` 中摄影相关规则的已实现状态。它延续暖白纸张、近黑文字、低对比线条和暖橙棕强调色，让照片成为第一视觉层级，界面只提供必要的语境、导航与出版信息。

这一表面采用 Experience 模式：首屏价值来自摄影本身，而不是英雄文案、装饰性卡片或应用式工具栏。列表在无 JavaScript 时保持原始比例的常规网格；JavaScript 只增强为 masonry、分批显示和灯箱。每张照片始终有可访问的静态详情地址，浏览语境与批次由 URL 保留。

**Key Characteristics:**

- 暖白、低对比、克制的个人出版气质。
- 原始比例摄影网格，增强后才形成 masonry 节奏。
- 深色影像舞台与暖白元数据面板并置。
- 移动端让元数据落在照片下方，不覆盖影像。
- 44px 控件、可见焦点、键盘路径和静态链接共同构成内容完整性。
- 发布资产优先：不公开原件、精确位置或敏感 EXIF，摄影路由保持 `noindex,follow`。

## Colors

色彩延续全站的暖纸中性色；摄影自身提供主要色彩，界面强调色保持稀少。

### Primary

- **暖橙棕强调色：**仅用于当前状态、焦点轮廓、链接悬停和少量互动反馈，不与照片竞争。

### Neutral

- **暖白画布：**摄影索引、详情与灯箱元数据的基础页面背景。
- **纸张表面：**次级按钮等需要轻微表面区分的控件背景。
- **静谧次级表面：**图片占位与低层级区域，在图片到达前维持稳定布局。
- **近黑墨色：**正文、标题与灯箱外框的核心文字色，避免纯黑造成的生硬感。
- **柔和与浅淡墨色：**说明、数量、日期和技术元数据；信息仍可读，但不会压过照片。
- **低对比边线：**相册行分隔与次级控件边框；只在结构确实需要时出现。
- **深夜影像舞台：**灯箱中隔离照片的近黑背景，只属于沉浸式观看状态。

**The Borrowed Color Rule.** 摄影页面的主要色彩来自照片，不从界面额外制造高饱和装饰。

**The Stage Boundary Rule.** 深夜影像舞台只用于灯箱照片区域；元数据继续使用暖白出版表面，不把全站改造成深色主题。

## Typography

**Display Font:** 系统无衬线字体栈
**Body Font:** 系统无衬线字体栈
**Label/Mono Font:** 元数据继续使用系统无衬线；数字采用 tabular numerals，而非为技术感引入等宽字体

**Character:** 单一、可靠的系统 sans 让中文标题、说明和设备参数保持稳定。层级主要来自字重、色彩、行高与留白，不靠夸张字号。

### Hierarchy

- **Display**（中等字重）：保留给全站更高层级表达；摄影表面不主动使用夸张展示标题。
- **Page Title**（中等字重）：照片索引、相册、标签、详情与灯箱标题；最长约 24 个汉字宽并允许平衡换行。
- **Body**（常规字重）：照片说明、相册说明和常规元数据值，长说明采用宽松行高。
- **Metadata**（常规字重）：数量、位置、相邻序号与验证提示；数字使用等宽数字形态保证跳转时稳定。

**The Quiet Hierarchy Rule.** 不通过整体放大摄影界面制造重要性；照片负责吸引注意，文字只靠中等字重、墨色层级和间距建立秩序。

## Layout

摄影索引的文字介绍与相册列表留在窄阅读栏，全部照片网格扩展到 75rem 宽栏，移动端始终保留 1.5rem gutter。照片网格移动优先：默认两列，40rem 起三列，64rem 起四列，列间距为 0.75rem。每张图片使用内容记录中的真实宽高比和占位色，避免加载时跳动。

**The Honest Grid Rule.** 无 JavaScript 时使用正常行流、真实宽高比网格；脚本加载成功后才增加 8px 隐形行轨并计算跨行数形成 masonry。增强失败不能破坏浏览、链接或阅读顺序。

每批显示 12 张，显式“加载更多”按钮写回 `batch` 查询参数。照片链接包含 `context`、`value` 与需要时的 `batch`，详情页据此返回全部照片、相册或标签上下文。直接访问静态详情页与在灯箱中浏览属于同一地址模型。

桌面灯箱占满 100dvh，使用“弹性影像区 + 22rem 元数据侧栏”的双栏结构。47.999rem 以下改为上下堆叠：影像舞台约占 62dvh，暖白元数据面板在下方独立滚动，绝不覆盖照片。静态详情页桌面为“影像 + 20rem 信息栏”，移动端回到单一文档流。

## Elevation & Depth

摄影表面基本扁平。索引依靠留白、真实图片边界和低对比分隔线建立层级，不给照片卡片添加阴影。灯箱通过全屏 backdrop、近黑舞台与暖白信息面板之间的强烈材质对比建立深度；圆形控制以半透明浅色表面浮在舞台上。

### Shadow Vocabulary

- **Hairline：**全站已有的单像素轮廓语汇；摄影区域只在控件或结构需要时使用。
- **Card：**保留给常规按钮等已有公共组件，不应用于照片格子。
- **Float：**保留给真正的浮层；灯箱本身依靠原生 dialog backdrop，而不是给照片加投影。

**The Flat Photograph Rule.** 照片默认不加卡片阴影、白边或装饰框；深度只出现在操作层级与沉浸式观看状态。

## Shapes

照片格子与静态详情影像使用轻柔的 0.5rem 圆角，只为裁切边缘，不把摄影包装成厚重卡片。相册封面使用更克制的 0.25rem 圆角。按钮和灯箱控制为完整胶囊或圆形，明确区分“内容”与“操作”。

**The Native Ratio Rule.** 不用统一卡片高度裁切摄影网格；每张照片的外轮廓忠实于发布资产的真实比例。

## Components

### Photo Grid

- **Structure:** 真实比例的响应式 CSS Grid；增强后由脚本计算 masonry 跨行。
- **Surface:** 图片本身就是表面，不增加边框或阴影；发布占位色在加载前填充同一比例区域。
- **State:** 桌面 hover 与键盘 focus 以 1.025 倍轻微放大和底部渐变标题层反馈；小屏隐藏覆盖层，避免文字遮挡照片。
- **Fallback:** 每个格子都是普通详情页 anchor；JavaScript 只拦截标准主按钮点击以打开灯箱。

### Album Rows

- **Structure:** 封面、标题/说明、照片数量三列，最小高度 5.5rem。
- **Surface:** 无卡片底板，相邻行只以低对比细线分隔。
- **State:** hover 只将标题切换为暖橙棕；封面保持平静。

### Load More Button

- **Shape:** 完整胶囊，最小高度 2.75rem。
- **Style:** 纸张白背景、低对比边框、近黑文字；使用全站次级按钮，不为摄影另造控件。
- **Behavior:** 显式增加一批最多 12 张照片，并通过 live region 报告“已显示 / 总数”。

### Photo Lightbox

- **Stage:** 全屏原生 dialog，照片在深夜影像舞台中以 `object-fit: contain` 完整呈现。
- **Metadata:** 桌面右侧 22rem 暖白面板；移动端堆叠在照片下方，最大约 38dvh。
- **Controls:** 关闭、上一张、下一张均为 44×44px 圆形控件；支持 Esc、方向键、水平滑动、禁用态与焦点恢复。
- **URL:** 打开、切换和返回均维护照片地址、浏览语境与批次；浏览器前进/后退是正式交互路径。

### Photo Metadata

- **Structure:** 标题、说明和两列定义列表；标签列宽 3.25rem，值允许任意位置换行。
- **Content:** 只展示可公开的拍摄日期、器材、参数、模糊地点、相册和标签。
- **Reuse:** 同一信息结构用于灯箱和静态详情页，避免两套元数据语义漂移。

### Static Photo Detail

- **Purpose:** 无 JavaScript、直接链接、分享与回退场景的完整阅读路径。
- **Desktop:** 影像与 sticky 元数据栏并排。
- **Mobile:** 影像、元数据和相邻导航自然堆叠；交互链接保持至少 44px 高。

## Do's and Don'ts

### Do:

- **Do** 让摄影从第一视口开始成为主角，界面只保留标题、来源语境、元数据与浏览控制。
- **Do** 保持无 JavaScript 网格、静态详情 anchor、浏览器历史和 URL 驱动语境全部可用。
- **Do** 使用真实宽高比、响应式发布衍生图、准确 alt 和稳定尺寸，避免布局跳动与不必要下载。
- **Do** 保证所有控制至少 44×44px、可见 `:focus-visible`、Esc/方向键路径、焦点恢复和 reduced-motion 支持。
- **Do** 把移动端元数据堆叠在照片下方，并保留自然文档流。
- **Do** 只发布限制尺寸、清理敏感 EXIF 且逐张确认的资产；摄影页面保持 `noindex,follow`，同时把“不上传原件”作为真正的隐私边界。

### Don't:

- **Don't** 用 JavaScript 作为看到照片、打开详情或返回浏览语境的前提。
- **Don't** 把所有照片裁成统一卡片比例，或用阴影、厚边框和装饰 UI 抢夺照片的注意力。
- **Don't** 在移动端把标题、参数或操作面板覆盖在照片主体上。
- **Don't** 公开原件、精确坐标、设备序列号、未清理 EXIF 或第三方隐私信息。
- **Don't** 把 `noindex` 当作隐私措施；任何已经上传到公开站点的资产都应视为可被访问。
- **Don't** 将灯箱的深色舞台推广成摄影页面或全站的默认深色表面。
