const randomUnit = (key: string) => {
  let hash = 2166136261;

  for (const character of key) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }

  return (hash >>> 0) / 0xffffffff;
};

const vary = (source: string, imageIndex: number, property: string, min: number, max: number) =>
  Math.round((min + randomUnit(`${source}:${imageIndex}:${property}`) * (max - min)) * 10) / 10;

export const projectStackStyle = (source: string, imageIndex: number) => {
  const side = randomUnit(`${source}:side`) < 0.5 ? -1 : 1;
  const fanDirection = imageIndex === 0 ? -side : side;
  const isFront = imageIndex === 2;
  const lowerImageIndex = randomUnit(`${source}:lower-image`) < 0.5 ? 1 : 2;
  const isLower = imageIndex === lowerImageIndex;

  const restX = isFront ? vary(source, imageIndex, "rest-x", -1.5, 1.5) : fanDirection * vary(source, imageIndex, "rest-x", 1, 3);
  const restY = vary(source, imageIndex, "rest-y", -2, 2);
  const restRotate = isFront ? vary(source, imageIndex, "rest-angle", -2, 2) : fanDirection * vary(source, imageIndex, "rest-angle", 2, 6);
  const openX = isLower
    ? vary(source, imageIndex, "open-x", -3, 3)
    : fanDirection * vary(source, imageIndex, "open-x", 15, 20);
  const openY = isLower
    ? vary(source, imageIndex, "open-y", 10, 14)
    : vary(source, imageIndex, "open-y", -10, -6);
  const openRotate = isFront ? vary(source, imageIndex, "open-angle", -3, 3) : fanDirection * vary(source, imageIndex, "open-angle", 7, 12);

  return `--stack-rest-x:${restX}px;--stack-rest-y:${restY}px;--stack-rest-rotate:${restRotate}deg;--stack-open-x:${openX}px;--stack-open-y:${openY}px;--stack-open-rotate:${openRotate}deg`;
};
