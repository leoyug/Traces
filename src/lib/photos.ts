import { getCollection } from "astro:content";
import { formatDate } from "./content";

export interface Photo {
  slug: string;
  src: string;
  alt: string;
  size: "tall" | "short";
  orientation: "portrait" | "landscape";
  width: number;
  height: number;
  facts: Array<[label: string, value: string]>;
}

export async function getPhotos(): Promise<Photo[]> {
  const entries = (
    await getCollection("photos", ({ data }) => !data.draft)
  ).sort((left, right) => left.data.order - right.data.order);
  const orders = new Set<number>();

  return entries.map((entry) => {
    const { data } = entry;
    if (orders.has(data.order))
      throw new Error(`照片展示顺序重复：${data.order}`);
    orders.add(data.order);

    const facts: Photo["facts"] = [["画面", data.alt]];
    const metadata = data.publicMetadata;
    if (metadata.capturedAt)
      facts.push(["拍摄", formatDate(metadata.capturedAt, "long")]);
    if (metadata.place) facts.push(["地点", metadata.place]);
    if (metadata.camera) facts.push(["相机", metadata.camera]);
    if (metadata.lens) facts.push(["镜头", metadata.lens]);
    if (metadata.focalLength) facts.push(["焦距", metadata.focalLength]);
    if (metadata.aperture) facts.push(["光圈", metadata.aperture]);
    if (metadata.shutterSpeed) facts.push(["快门", metadata.shutterSpeed]);
    if (metadata.iso) facts.push(["感光度", String(metadata.iso)]);
    facts.push(["尺寸", `${data.width} × ${data.height} px`]);

    return {
      slug: entry.id,
      src: data.src,
      alt: data.alt,
      size: data.size,
      orientation: data.orientation,
      width: data.width,
      height: data.height,
      facts,
    };
  });
}
