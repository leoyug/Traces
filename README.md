# 不息 Traces

“不息”是 Leo 的中文个人网站，记录写作、项目、摄影与职业经历。网站使用 Astro 6、TypeScript 和 Content Collections，生成纯静态页面。

## 本地运行

需要 Node.js 和 npm：

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run check         # 内容类型检查和照片发布资产审计
npm run build         # 生成字体子集、检查并构建静态网站
npm run preview       # 本地预览构建产物
npm run photos:audit  # 单独检查摄影图片尺寸、引用和敏感元数据
```

开发环境的 `/design-system` 展示正在使用的设计规则和组件；生产环境不公开该页面。`npm run build` 自动重新生成寒蝉宋体子集，完整 OTF 只保存在 `scripts/fonts/source/`，不会作为公开资源发布。

## 代码结构

```text
src/
├── components/            # 跨页面组件；photos/ 是摄影展示组件
├── content/               # articles、projects、photos、resume
├── content.config.ts      # 内容字段校验
├── data/                  # 导航和项目展示用的临时数据
├── layouts/               # 页面骨架与元数据
├── lib/                   # 内容查询和摄影数据整理
├── pages/                 # 路由与页面编排
├── scripts/               # 页面交互脚本
└── styles/
    ├── global.css         # 字体、设计变量、基础规则和公共组件
    ├── site.css           # 当前页面的专有样式
    └── site-responsive.css # 对应的响应式规则

public/assets/figma-v03/photos/ # 当前公开摄影图片
scripts/photos/audit.ts         # 发布图片审计
```

文章、项目和照片的文件名是稳定短名。已公开的地址不要只因标题变化而修改；确需迁移时，应补上跳转。项目列表及其详情目前是展示稿，详情正文标明哪些事实仍待核实；正式案例需要替换为真实资料。旧的相册、标签和“加载更多”内容模型已移除。

## 更新摄影内容

摄影页直接展示单张照片，点击后打开灯箱，再次点击关闭。照片描述和图片实际尺寸会显示在灯箱中；拍摄日期、地点和相机参数只有核实后才填写。每张照片有独立地址 `/photos/<短名>/`。

1. 自行备份照片原件；不要把原件、精确坐标、设备序列号或第三方隐私放进公开目录。
2. 准备适合网页发布、已清除敏感 EXIF 的图片，放入 `public/assets/figma-v03/photos/`。当前审计限制为最长边不超过 2400px、文件不超过 2MB。
3. 在 `src/content/photos/` 为该图片添加同名 JSON，填写 `src`、准确的 `alt`、唯一的 `order`、`size`、`orientation` 和图片实际的 `width`、`height`。经过核实的拍摄参数可放在 `publicMetadata`。
4. 运行 `npm run build`，再人工检查图片、替代文本、灯箱详情及移动端效果。

具体字段和检查要求见[照片发布指南](./docs/%E7%85%A7%E7%89%87%E6%A8%A1%E5%9D%97%E6%9E%84%E5%BB%BA%E4%B8%8E%E4%B8%8A%E7%BA%BF%E6%8C%87%E5%8D%97.md)。

## 设计和产品依据

- [产品与信息架构](./%E4%B8%AA%E4%BA%BA%E7%BD%91%E7%AB%99%E5%8A%9F%E8%83%BD%E6%96%B9%E6%A1%88.md)
- [设计系统](./PERSONAL_SITES_DESIGN_SYSTEM.md)
- [领域语言](./CONTEXT.md)
- [当前产品约束](./PRODUCT.md)
- [设计说明](./DESIGN.md)

当前图片和部分文章、职业信息仍需作者逐项核实后才能作为正式内容对外发布。历史版本记录保留在 `docs/releases/`。
