export type PhotoVariant = {
  src: string;
  width: number;
  height: number;
  bytes: number;
  format: "webp" | "jpeg";
};

export type GeneratedPhotoAsset = {
  slug: string;
  sourceDigest: string;
  width: number;
  height: number;
  aspectRatio: number;
  placeholder: string;
  variants: PhotoVariant[];
  publicExif: {
    camera?: string;
    lens?: string;
    focalLength?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
  };
  processedAt: string;
};

export type PhotoAssetManifest = {
  version: 1;
  generatedAt: string;
  photos: GeneratedPhotoAsset[];
};

export type BrowseContext =
  | { type: "all" }
  | { type: "album"; slug: string }
  | { type: "tag"; slug: string };

export type PhotoListItem = {
  slug: string;
  title: string;
  description: string;
  alt: string;
  width: number;
  height: number;
  aspectRatio: number;
  placeholder: string;
  sources: {
    webp: PhotoVariant[];
    jpeg: PhotoVariant[];
  };
  publishedAt: string;
  capturedAt?: string;
  albums: Array<{ slug: string; title: string }>;
  tags: string[];
  metadata: {
    camera?: string;
    lens?: string;
    focalLength?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
    place?: string;
  };
};
