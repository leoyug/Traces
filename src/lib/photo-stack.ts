import { getImage } from "astro:assets";
import street from "../../public/media/photos/light-01/src.jpg";
import pier from "../../public/media/photos/park-walk/src.jpg";
import camping from "../../public/media/photos/light-03/src.jpg";
import dog from "../../public/media/photos/light-04/src.jpg";
import sunset from "../../public/media/photos/light-05/src.jpg";
import trees from "../../public/media/photos/light-06/src.jpg";
import { getPhotos } from "./photos";
import type { PhotoStackPhoto } from "./photo-stack-types";

const stackImages = [
  { slug: "light-01", image: street },
  { slug: "park-walk", image: pier },
  { slug: "light-03", image: camping },
  { slug: "light-04", image: dog },
  { slug: "light-05", image: sunset },
  { slug: "light-06", image: trees },
];

export async function getPhotoStackPhotos(): Promise<PhotoStackPhoto[]> {
  const published = await getPhotos();
  return Promise.all(stackImages.map(async ({ slug, image }, index) => {
    const photo = published.find((entry) => entry.slug === slug);
    if (!photo) throw new Error(`照片堆叠只能使用已发布照片：${slug}`);
    const preview = await getImage({ src: image, width: 480, format: "webp" });
    const compact = index < 3
      ? await getImage({ src: image, width: 222, format: "webp" })
      : preview;
    return { id: slug, src: photo.src, previewSrc: preview.src, stackSrc: compact.src, alt: photo.alt, width: photo.width, height: photo.height };
  }));
}
