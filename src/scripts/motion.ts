import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

declare global {
  interface Window {
    __incessantMotionCleanup?: () => void;
  }
}

export function initMotion() {
  window.__incessantMotionCleanup?.();

  const media = gsap.matchMedia();

  media.add(
    {
      desktop: "(min-width: 48rem) and (pointer: fine)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { desktop, reduceMotion } = context.conditions as {
        desktop: boolean;
        reduceMotion: boolean;
      };

      if (reduceMotion) return;

      const hero = document.querySelector<HTMLElement>(".hero");
      const orbit = hero?.querySelector<HTMLElement>(".hero__orbit");

      if (orbit) {
        gsap.timeline({ defaults: { ease: "power3.out" } })
          .fromTo(orbit, { rotation: -5, scale: 0.98 }, { rotation: 0, scale: 1, duration: 0.8 })
          .to(orbit, { "--orbit-progress": 1, duration: 0.65 }, "<0.12");
      }

      let removePointerListener: (() => void) | undefined;

      if (desktop && hero && orbit) {
        const xTo = gsap.quickTo(orbit, "x", { duration: 0.45, ease: "power3.out" });
        const yTo = gsap.quickTo(orbit, "y", { duration: 0.45, ease: "power3.out" });
        const clamp = gsap.utils.clamp(-10, 10);

        const onPointerMove = (event: PointerEvent) => {
          const bounds = hero.getBoundingClientRect();
          const mapX = gsap.utils.mapRange(bounds.left, bounds.right, -10, 10);
          const mapY = gsap.utils.mapRange(bounds.top, bounds.bottom, -8, 8);
          xTo(clamp(mapX(event.clientX)));
          yTo(clamp(mapY(event.clientY)));
        };

        hero.addEventListener("pointermove", onPointerMove, { passive: true });
        removePointerListener = () => hero.removeEventListener("pointermove", onPointerMove);
      }

      gsap.utils
        .toArray<HTMLElement>(".home-section")
        .filter((section) => section.getBoundingClientRect().top > window.innerHeight * 0.82)
        .forEach((section) => {
          gsap.fromTo(
            section,
            { y: 12 },
            {
              y: 0,
              duration: 0.5,
              ease: "power3.out",
              clearProps: "transform",
              scrollTrigger: {
                trigger: section,
                start: "clamp(top 88%)",
                once: true,
              },
            },
          );
        });

      return () => removePointerListener?.();
    },
    document.body,
  );

  const refreshAfterFonts = () => ScrollTrigger.refresh();
  document.fonts?.ready.then(refreshAfterFonts);

  window.__incessantMotionCleanup = () => media.revert();
}
