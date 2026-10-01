import { getCollection } from "astro:content";

export async function getProjects() {
  return (await getCollection("projects", ({ data }) => !data.draft)).sort((left, right) =>
    left.data.order - right.data.order
    || right.data.publishedAt.getTime() - left.data.publishedAt.getTime()
    || left.id.localeCompare(right.id));
}

export function projectPreview(entry: Awaited<ReturnType<typeof getProjects>>[number]) {
  return {
    title: entry.data.title,
    summary: entry.data.description,
    accent: entry.data.accent,
    image: entry.data.cover,
    href: `/projects/${entry.id}`,
  };
}
