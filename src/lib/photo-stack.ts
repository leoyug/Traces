import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";
import { getComponentPhotos } from "./photo-components";
import type { PhotoStackPhoto } from "./photo-stack-types";

export async function getPhotoStackPhotos(): Promise<PhotoStackPhoto[]> {
  const photos = await getComponentPhotos("textHover");
  if (photos.length < 6) return [];

  return Promise.all(photos.map(async (photo, index) => {
    // Use the current published asset and its validated dimensions. Static imports
    // would retain deleted, renamed or newly drafted photos in the build graph.
    const extension = photo.src.split(".").at(-1)?.toLowerCase();
    const image: ImageMetadata = {
      src: photo.src,
      width: photo.width,
      height: photo.height,
      format: (extension === "jpeg" ? "jpg" : extension) as ImageMetadata["format"],
    };
    const preview = await getImage({ src: image, width: 480, format: "webp" });
    const compact = index < 3
      ? await getImage({ src: image, width: 222, format: "webp" })
      : preview;
    return { id: photo.slug, src: photo.src, previewSrc: preview.src, stackSrc: compact.src, alt: photo.alt, width: photo.width, height: photo.height };
  }));
}
