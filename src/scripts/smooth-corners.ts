import { createDropShadow, generateClipPath, generatePath, getLayoutSize, parseBoxShadow } from "@lisse/core";

const svgNamespace = "http://www.w3.org/2000/svg";
let dispose: (() => void) | undefined;

/** Keep interactive surfaces outside the clip; only media pixels are clipped. */
export function initSmoothCorners() {
  const mount = () => {
    dispose?.();
    if (!window.ResizeObserver || !CSS.supports("clip-path", 'path("M0 0H1V1Z")')) return;
    const cleanups: (() => void)[] = [];
    const updates: (() => void)[] = [];

    document.querySelectorAll<HTMLElement>("[data-smooth-corners]").forEach((element) => {
      const surface = element.dataset.smoothCorners === "surface";
      const svg = surface ? document.createElementNS(svgNamespace, "svg") : null;
      const path = svg ? document.createElementNS(svgNamespace, "path") : null;
      if (svg && path) {
        svg.classList.add("smooth-corners__surface");
        svg.setAttribute("aria-hidden", "true");
        svg.append(path);
        element.prepend(svg);
      }
      const shadow = surface && element.hasAttribute("data-smooth-shadow") ? createDropShadow(element) : null;
      // Both SVG layers sit behind the controls. Paint the opaque surface last
      // so the blurred shadow cannot show through the panel's interior.
      if (svg) element.append(svg);
      const update = () => {
        const styles = getComputedStyle(element);
        const { width, height } = getLayoutSize(element, styles);
        if (!width || !height) return; // Hidden preference panels are measured when opened.
        const options = {
          radius: parseFloat(styles.borderTopLeftRadius) || 0,
          smoothing: parseFloat(styles.getPropertyValue("--corner-smoothing")) || 0.6,
        };
        if (svg && path) {
          svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
          path.setAttribute("d", generatePath(width, height, options));
          shadow?.update(options, parseBoxShadow(styles.getPropertyValue("--shadow-float")).shadow ?? [], width, height);
        } else {
          element.style.clipPath = generateClipPath(width, height, options);
        }
        element.classList.add("has-smooth-corners");
      };
      const resize = new ResizeObserver(update);
      resize.observe(element);
      updates.push(update);
      update();
      cleanups.push(() => {
        resize.disconnect();
        shadow?.destroy();
        svg?.remove();
        element.style.removeProperty("clip-path");
        element.classList.remove("has-smooth-corners");
      });
    });
    const theme = new MutationObserver(() => updates.forEach((update) => update()));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    dispose = () => { theme.disconnect(); cleanups.forEach((cleanup) => cleanup()); };
  };
  document.addEventListener("astro:page-load", mount);
  document.addEventListener("astro:before-swap", () => dispose?.());
  mount();
}
