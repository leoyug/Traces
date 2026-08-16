import { articles } from "../data/site";

export function GET({ site }) {
  const items = articles.map((article) => `<item><title><![CDATA[${article.title}]]></title><link>${new URL(article.href, site)}</link><description><![CDATA[${article.summary}]]></description></item>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>不息的文章</title><link>${site}</link><description>关于设计工程、个人档案与日常观察。</description>${items}</channel></rss>`, { headers: { "Content-Type": "application/xml" } });
}
