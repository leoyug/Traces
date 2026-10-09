import { createOrderStore } from "./store.mjs";

const store = createOrderStore(process.cwd());
for (const collection of ["projects", "photos", "articles"]) {
  const { entries } = await store.snapshot(collection);
  if (entries.some((entry, index) => entry.order !== index + 1)) {
    throw new Error(`${collection} 的展示位置须从 1 开始连续且不重复；请启动后台整理顺序后重新构建。`);
  }
  console.log(`${collection} 顺序审计通过：${entries.length} 项，含草稿。`);
}
