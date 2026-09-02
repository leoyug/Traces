export interface GalleryPhoto {
  slug: string;
  src: string;
  alt: string;
  size: "tall" | "short";
}

const photos = [
  ["夜色中被暖光照亮的街巷建筑", "tall"],
  ["蓝色夜幕下延伸入海的栈桥", "short"],
  ["暮色草地上的帐篷与行人", "tall"],
  ["街道上散步的人与白色小狗", "short"],
  ["粉色暮光中沿海边步道行走的人", "tall"],
  ["树荫覆盖的城市人行道", "short"],
  ["海边礁石上面向远方的人", "tall"],
  ["街边冰淇淋店与经过的路人", "short"],
  ["镜子前拿着相机合影的两个人", "tall"],
  ["夕阳穿过树梢与云层", "tall"],
  ["夜晚树林中的灯光装置", "tall"],
  ["绿树旁站立的年轻女性", "short"],
  ["蓝天下屋檐与云层", "short"],
  ["绿树环绕的校园道路", "tall"],
  ["临海公路、山体与远处的岛屿", "short"],
  ["傍晚安静的城市街道", "short"],
] as const;

export const galleryPhotos: GalleryPhoto[] = photos.map(([alt, size], index) => {
  const number = index + 1;
  const slug = number === 8
    ? "public-phone"
    : number === 2
      ? "park-walk"
      : number === 15
        ? "cranes-at-dusk"
        : `light-${String(number).padStart(2, "0")}`;

  return {
    slug,
    src: `/assets/figma-v03/photos/photo-${String(number).padStart(2, "0")}.jpg`,
    alt,
    size,
  };
});
