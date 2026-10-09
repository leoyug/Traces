type PhotoRecord = { alt: string; src: string; draft?: boolean };
const records = import.meta.glob<PhotoRecord>("../content/photos/*.json", { eager: true, import: "default" });

// Keystatic relationships use the original filename, including its case.
export const adminPhotos = new Map(Object.entries(records).map(([path, photo]) => [
  path.split("/").at(-1)!.replace(/\.json$/, ""), photo,
]));

export const adminPhotoOptions = [...adminPhotos].map(([id, photo]) => ({
  id,
  label: `${photo.alt}${photo.draft ? "（草稿）" : ""}`,
}));
