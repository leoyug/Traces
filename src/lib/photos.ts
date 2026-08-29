import { getCollection, type CollectionEntry } from "astro:content";
import manifestJson from "../data/photo-assets.generated.json";
import type { PhotoAssetManifest, PhotoListItem } from "./photo-types";

const manifest = manifestJson as PhotoAssetManifest;

const referenceId = (reference: { id: string } | string) =>
  typeof reference === "string" ? reference : reference.id;

export async function getPhotoLibrary() {
  const [photoEntries, albumEntries] = await Promise.all([
    getCollection("photos", ({ data }) => !data.draft),
    getCollection("albums", ({ data }) => !data.draft),
  ]);
  const albumById = new Map(albumEntries.map((album) => [album.id, album]));
  const assetBySlug = new Map(manifest.photos.map((asset) => [asset.slug, asset]));

  const photos = photoEntries.map((entry) => {
    const asset = assetBySlug.get(entry.id);
    if (!asset) {
      throw new Error(`照片 ${entry.id} 缺少 src/data/photo-assets.generated.json 资产记录`);
    }
    const metadata = entry.data.publicMetadata;
    const albumLinks = entry.data.albums.map((reference) => {
      const id = referenceId(reference);
      const album = albumById.get(id);
      if (!album) throw new Error(`照片 ${entry.id} 引用了不存在或未发布的相册 ${id}`);
      return { slug: id, title: album.data.title };
    });
    const generatedExif = asset.publicExif ?? {};
    const webp = asset.variants.filter((variant) => variant.format === "webp").sort((a, b) => a.width - b.width);
    const jpeg = asset.variants.filter((variant) => variant.format === "jpeg").sort((a, b) => a.width - b.width);
    if (webp.length === 0 || jpeg.length === 0) {
      throw new Error(`照片 ${entry.id} 必须同时拥有 WebP 与 JPEG 发布资产`);
    }

    return {
      slug: entry.id,
      title: entry.data.title,
      description: entry.data.description,
      alt: entry.data.alt,
      width: asset.width,
      height: asset.height,
      aspectRatio: asset.aspectRatio,
      placeholder: asset.placeholder,
      sources: { webp, jpeg },
      publishedAt: entry.data.publishedAt.toISOString(),
      capturedAt: metadata.capturedAt?.toISOString(),
      albums: albumLinks,
      tags: entry.data.tags,
      metadata: {
        camera: metadata.camera ?? generatedExif.camera,
        lens: metadata.lens ?? generatedExif.lens,
        focalLength: metadata.focalLength ?? generatedExif.focalLength,
        aperture: metadata.aperture ?? generatedExif.aperture,
        shutterSpeed: metadata.shutterSpeed ?? generatedExif.shutterSpeed,
        iso: metadata.iso ?? generatedExif.iso,
        place: metadata.place,
      },
    } satisfies PhotoListItem;
  }).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const photoBySlug = new Map(photos.map((photo) => [photo.slug, photo]));
  const albums = albumEntries.map((entry) => ({
    entry,
    photos: entry.data.photos.map((reference) => {
      const id = referenceId(reference);
      const photo = photoBySlug.get(id);
      if (!photo) throw new Error(`相册 ${entry.id} 引用了不存在或未发布的照片 ${id}`);
      return photo;
    }),
    cover: entry.data.coverPhoto ? photoBySlug.get(referenceId(entry.data.coverPhoto)) : undefined,
  }));

  return { photos, albums, photoBySlug };
}

export type AlbumWithPhotos = {
  entry: CollectionEntry<"albums">;
  photos: PhotoListItem[];
  cover?: PhotoListItem;
};

export function photoHref(photo: PhotoListItem, context?: { type: string; slug?: string }, batch = 1) {
  const params = new URLSearchParams();
  if (context?.type) params.set("context", context.type);
  if (context?.slug) params.set("value", context.slug);
  if (batch > 1) params.set("batch", String(batch));
  const query = params.toString();
  return `/photos/${photo.slug}/${query ? `?${query}` : ""}`;
}
