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
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { reduceMotion } = context.conditions as {
        reduceMotion: boolean;
      };

      if (reduceMotion) return;

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
    },
    document.body,
  );

  const refreshAfterFonts = () => ScrollTrigger.refresh();
  document.fonts?.ready.then(refreshAfterFonts);

  window.__incessantMotionCleanup = () => media.revert();
}
