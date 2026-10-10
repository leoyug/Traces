import homeFan from "../data/photo-components/home-fan.json";
import homeDrag from "../data/photo-components/home-drag.json";
import textHover from "../data/photo-components/text-hover.json";
import { getPhotos, type Photo } from "./photos";

const selections = { homeFan, homeDrag, textHover };
const limits = { homeFan: 7, homeDrag: 7, textHover: 6 };

// Component selections reference photography records; assets and descriptions
// stay with those records. Never replace missing selections with other photos.
export async function getComponentPhotos(component: keyof typeof selections): Promise<Photo[]> {
  const published = new Map((await getPhotos()).map((photo) => [photo.recordId, photo]));
  const ids = [...new Set(selections[component].photos)];
  return ids.flatMap((id) => {
    const photo = published.get(id);
    return photo ? [photo] : [];
  }).slice(0, limits[component]);
}
