import { gsap } from "gsap";

declare global {
  interface Window {
    __incessantRouteMotionCleanup?: () => void;
  }
}

const getEntranceTargets = (main: HTMLElement) => {
  const targets = Array.from(main.querySelectorAll<HTMLElement>("[data-route-enter]"));
  main.querySelectorAll<HTMLElement>("[data-route-enter-group]").forEach((group) => {
    targets.push(...Array.from(group.children).filter((element): element is HTMLElement => element instanceof HTMLElement));
  });
  const body = main.querySelector<HTMLElement>("[data-route-enter-body]");

  if (body) {
    targets.push(...Array.from(body.children).slice(0, 3) as HTMLElement[]);
  }

  if (targets.length > 0) {
    // Groups and individual items share one document-order sequence. Never
    // animate a parent and its child together (which would compound the blur).
    return [...new Set(targets)]
      .filter((target) => !targets.some((other) => other !== target && other.contains(target)))
      .sort((left, right) => left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  }

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
  let entranceFrame = 0;
  let motion = { duration: 0.84, stagger: 0.07, staggerMax: 0.42, distance: 16, blur: 4 };
  const entranceProps = "transform,visibility,opacity,filter";

  const resetEntrance = () => {
    entrancePrepared = false;
    if (targets.length > 0) {
      gsap.killTweensOf(targets);
      gsap.set(targets, { clearProps: entranceProps });
    }
  };

  const prepareEntrance = () => {
    resetEntrance();
    if (reducedMotion.matches || document.documentElement.dataset.detailTransition) return;

    const main = document.querySelector<HTMLElement>("[data-route-main]");
    if (!main) return;

    targets = getEntranceTargets(main);
    if (targets.length === 0) return;
    const styles = getComputedStyle(document.documentElement);
    motion = {
      duration: parseFloat(styles.getPropertyValue("--duration-route-enter")) / 1000,
      stagger: parseFloat(styles.getPropertyValue("--duration-route-stagger")) / 1000,
      staggerMax: parseFloat(styles.getPropertyValue("--duration-route-stagger-max")) / 1000,
      distance: parseFloat(styles.getPropertyValue("--distance-route-enter")),
      blur: parseFloat(styles.getPropertyValue("--blur-route-enter")),
    };
    // Keep content present while it settles into focus; no blank loading phase.
    gsap.set(targets, { autoAlpha: 0.15, y: motion.distance, filter: `blur(${motion.blur}px)` });
    entrancePrepared = targets.length > 0;
  };

  const playEntrance = () => {
    if (reducedMotion.matches || !entrancePrepared || targets.length === 0) return;
    entrancePrepared = false;

    gsap.to(targets, {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      duration: motion.duration,
      ease: "power3.out",
      stagger: Math.min(motion.stagger, motion.staggerMax / Math.max(1, targets.length - 1)),
      overwrite: "auto",
      clearProps: entranceProps,
    });
  };

  prepareEntrance();
  entranceFrame = requestAnimationFrame(playEntrance);
  document.addEventListener("astro:after-swap", prepareEntrance);
  document.addEventListener("astro:page-load", playEntrance);
  const onMotionPreferenceChange = () => {
    if (reducedMotion.matches) resetEntrance();
  };
  reducedMotion.addEventListener("change", onMotionPreferenceChange);

  window.__incessantRouteMotionCleanup = () => {
    document.removeEventListener("astro:after-swap", prepareEntrance);
    document.removeEventListener("astro:page-load", playEntrance);
    reducedMotion.removeEventListener("change", onMotionPreferenceChange);
    cancelAnimationFrame(entranceFrame);
    resetEntrance();
  };
}
