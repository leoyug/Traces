---
status: accepted
---

# 选择性借鉴 Afilmory，而不嵌入其完整应用

照片模块采用 Afilmory 的增量处理、Manifest、图片占位和 URL 驱动查看器等思路，并只在确有收益时使用其明确标为 MIT 的库代码；不复制或嵌入 Afilmory 的完整 Web 应用。这样可以保留 Astro 纯静态架构、无后端和统一的网站体验，同时避开 React SPA/Next.js 运行边界、AGPL 项目代码义务、公开原图与 GPS 数据，以及现有 UI 无法满足本站键盘顺序和灯箱焦点要求的问题。

## Consequences

- 需要自行实现 Astro 页面、照片列表和无障碍灯箱。
- 图片处理可以参考 Afilmory Builder，但必须支持本站目录、响应式尺寸和隐私白名单，不能原样接入。
- 首版不引入 WebGL 缩放、地图、Live Photo、评论、后台或远程存储。
