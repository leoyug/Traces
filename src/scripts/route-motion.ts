import { gsap } from "gsap";

declare global {
  interface Window {
    __incessantRouteMotionCleanup?: () => void;
  }
}

const getEntranceTargets = (main: HTMLElement) => {
  const targets = Array.from(main.querySelectorAll<HTMLElement>("[data-route-enter]"));
  const body = main.querySelector<HTMLElement>("[data-route-enter-body]");

  if (body) {
    targets.push(...Array.from(body.children).slice(0, 3) as HTMLElement[]);
  }

  if (targets.length > 0) return targets;

  return Array.from(main.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .filter((element) => !element.hasAttribute("data-route-enter-exempt"))
    .slice(0, 6);
};

export function initRouteMotion() {
  window.__incessantRouteMotionCleanup?.();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let targets: HTMLElement[] = [];
  let entrancePrepared = false;

  const prepareEntrance = () => {
    if (reducedMotion.matches) return;

    const main = document.querySelector<HTMLElement>("[data-route-main]");
    if (!main) return;

    targets = getEntranceTargets(main);
    gsap.set(targets, { autoAlpha: 0, y: 18 });
    entrancePrepared = targets.length > 0;
  };

  const playEntrance = () => {
    if (reducedMotion.matches || !entrancePrepared || targets.length === 0) return;
    entrancePrepared = false;

    gsap.to(targets, {
      autoAlpha: 1,
      y: 0,
      duration: 0.64,
      ease: "power3.out",
      stagger: 0.08,
      overwrite: "auto",
      clearProps: "transform,visibility,opacity",
    });
  };

  prepareEntrance();
  requestAnimationFrame(playEntrance);
  document.addEventListener("astro:after-swap", prepareEntrance);
  document.addEventListener("astro:page-load", playEntrance);

  window.__incessantRouteMotionCleanup = () => {
    document.removeEventListener("astro:after-swap", prepareEntrance);
    document.removeEventListener("astro:page-load", playEntrance);
    gsap.killTweensOf(targets);
    gsap.set(targets, { clearProps: "transform,visibility,opacity" });
  };
}
