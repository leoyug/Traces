import { useState } from "react";
import { adminPhotos } from "./photo-records";

export function PhotoThumbnail({ id }: { id: string | null }) {
  const src = id ? adminPhotos.get(id)?.src : undefined;
  const [failedSrc, setFailedSrc] = useState<string>();
  return <span className="local-archive-image-preview local-photo-preview">
    {src && src !== failedSrc
      ? <img src={src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailedSrc(src)} />
      : <span role="img" aria-label="照片不可用">无图</span>}
  </span>;
}
