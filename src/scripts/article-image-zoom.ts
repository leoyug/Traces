import gsap from "gsap";

type ZoomDialog = HTMLDialogElement & { imageZoomCleanup?: () => void };
type ZoomState = "closed" | "opening" | "open" | "closing";

const initializeImageZoom = () => {
  document.querySelectorAll<ZoomDialog>("[data-article-image-zoom]").forEach((dialog) => {
    if (dialog.imageZoomCleanup) return;
    const selector = dialog.dataset.imageSelector;
    const view = dialog.querySelector<HTMLButtonElement>(".article-image-zoom__view");
    const enlarged = view?.querySelector<HTMLImageElement>("img");
    const backdrop = dialog.querySelector<HTMLElement>(".article-image-zoom__backdrop");
    if (!selector || !view || !enlarged || !backdrop) return;

    const controller = new AbortController();
    const { signal } = controller;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const styles = getComputedStyle(document.documentElement);
    const seconds = (token: string) => parseFloat(styles.getPropertyValue(token)) / 1000;
    const openDuration = seconds("--duration-article-image-open");
    const closeDuration = seconds("--duration-article-image-close");
    const pressDuration = seconds("--duration-micro");
    const pressScale = parseFloat(styles.getPropertyValue("--scale-article-image-press"));
    const zoomFactor = parseFloat(styles.getPropertyValue("--article-image-zoom-factor"));
    const triggers: Array<{ button: HTMLButtonElement; image: HTMLImageElement; media: HTMLElement }> = [];
    let state: ZoomState = "closed";
    let animation: gsap.core.Timeline | null = null;
    let active: typeof triggers[number] | null = null;
    let pressed: HTMLButtonElement | null = null;
    let sourceVisibility = "";
    let base = { width: 0, height: 0 };
    let disposed = false;

    const setState = (next: ZoomState) => {
      state = next;
      dialog.dataset.state = next;
    };
    setState("closed");

    const targetPosition = () => {
      const gutter = parseFloat(getComputedStyle(dialog).paddingLeft);
      const scale = Math.min(zoomFactor, (dialog.clientWidth - 2 * gutter) / base.width, (dialog.clientHeight - 2 * gutter) / base.height);
      return { x: (dialog.clientWidth - base.width * scale) / 2, y: (dialog.clientHeight - base.height * scale) / 2, scale };
    };

    const resetPress = (button: HTMLButtonElement) => {
      gsap.to(button, {
        scale: 1,
        duration: reducedMotion.matches ? 0 : pressDuration,
        ease: "power2.out",
        overwrite: true,
        clearProps: "transform",
      });
      if (pressed === button) pressed = null;
    };

    const finishClose = (restoreFocus = true) => {
      animation?.kill();
      animation = null;
      gsap.killTweensOf(view);
      const sourceButton = active?.button;
      if (active) {
        active.image.style.visibility = sourceVisibility;
        active.button.setAttribute("aria-expanded", "false");
      }
      dialog.close();
      document.documentElement.classList.remove("has-article-image-zoom");
      if (restoreFocus && sourceButton?.isConnected) sourceButton.focus({ preventScroll: true });
      active = null;
      setState("closed");
    };

    const close = () => {
      if (!active || state === "closed" || state === "closing") return;
      if (!dialog.open) {
        finishClose();
        return;
      }
      animation?.kill();
      gsap.killTweensOf(view);
      setState("closing");
      const destination = active.image.getBoundingClientRect();
      animation = gsap.timeline({ onComplete: () => finishClose() });
      animation.to(view, {
        x: destination.left,
        y: destination.top,
        scaleX: destination.width / base.width,
        scaleY: destination.height / base.height,
        duration: reducedMotion.matches ? 0 : closeDuration,
        ease: "power3.inOut",
      }, 0);
      animation.to(backdrop, { opacity: 0, duration: reducedMotion.matches ? 0 : closeDuration, ease: "power2.out" }, 0);
    };

    const open = async (entry: typeof triggers[number]) => {
      if (state !== "closed" || !entry.image.complete || !entry.image.naturalWidth) return;
      setState("opening");
      active = entry;
      sourceVisibility = entry.image.style.visibility;
      const imageStyle = getComputedStyle(entry.image);
      enlarged.src = entry.image.currentSrc || entry.image.src;
      enlarged.alt = entry.image.alt;
      enlarged.style.objectFit = imageStyle.objectFit;
      enlarged.style.objectPosition = imageStyle.objectPosition;
      view.style.borderRadius = imageStyle.borderTopLeftRadius;

      await enlarged.decode().catch(() => undefined);
      if (disposed || dialog.dataset.state !== "opening" || !dialog.isConnected) return;

      const pressedBounds = entry.image.getBoundingClientRect();
      gsap.killTweensOf(entry.button);
      gsap.set(entry.button, { clearProps: "transform" });
      pressed = null;
      const source = entry.image.getBoundingClientRect();
      base = { width: source.width, height: source.height };
      view.style.width = `${base.width}px`;
      view.style.height = `${base.height}px`;
      gsap.set(view, { x: pressedBounds.left, y: pressedBounds.top, scale: pressedBounds.width / base.width });
      gsap.set(backdrop, { opacity: 0 });
      dialog.showModal();
      document.documentElement.classList.add("has-article-image-zoom");
      entry.image.style.visibility = "hidden";
      entry.button.setAttribute("aria-expanded", "true");
      const target = targetPosition();
      animation = gsap.timeline({ onComplete: () => { animation = null; setState("open"); } });
      animation.to(view, { ...target, duration: reducedMotion.matches ? 0 : openDuration, ease: "power3.inOut" }, 0);
      animation.to(backdrop, { opacity: 1, duration: reducedMotion.matches ? 0 : openDuration, ease: "power2.out" }, 0);
    };

    document.querySelectorAll<HTMLImageElement>(selector).forEach((image) => {
      if (!image.alt || image.closest("a, button, [data-no-image-zoom]")) return;
      const media = image.closest("picture") ?? image;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "article-image-zoom-trigger";
      button.setAttribute("aria-label", `放大图片：${image.alt}`);
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-expanded", "false");
      media.before(button);
      button.append(media);
      const entry = { button, image, media };
      triggers.push(entry);

      button.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !event.isPrimary || state !== "closed" || reducedMotion.matches) return;
        pressed = button;
        gsap.to(button, { scale: pressScale, duration: pressDuration, ease: "power2.out", overwrite: true });
      }, { signal });
      button.addEventListener("pointerleave", () => { if (pressed === button) resetPress(button); }, { signal });
      button.addEventListener("pointercancel", () => resetPress(button), { signal });
      button.addEventListener("click", () => { void open(entry); }, { signal });
      button.addEventListener("dragstart", (event) => event.preventDefault(), { signal });
    });

    window.addEventListener("pointerup", () => {
      requestAnimationFrame(() => { if (!disposed && state === "closed" && pressed) resetPress(pressed); });
    }, { signal });
    view.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !event.isPrimary || state !== "open" || reducedMotion.matches) return;
      const target = targetPosition();
      gsap.to(view, {
        x: target.x + base.width * target.scale * (1 - pressScale) / 2,
        y: target.y + base.height * target.scale * (1 - pressScale) / 2,
        scale: target.scale * pressScale,
        duration: pressDuration,
        ease: "power2.out",
        overwrite: true,
      });
    }, { signal });
    const resetViewPress = () => {
      if (state === "open") gsap.to(view, { ...targetPosition(), duration: reducedMotion.matches ? 0 : pressDuration, overwrite: true });
    };
    view.addEventListener("pointerleave", resetViewPress, { signal });
    view.addEventListener("pointercancel", resetViewPress, { signal });
    dialog.addEventListener("click", close, { signal });
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); }, { signal });
    window.addEventListener("resize", () => {
      if (!dialog.open) return;
      if (state === "closing") { finishClose(); return; }
      if (state === "opening") animation?.progress(1);
      gsap.to(view, { ...targetPosition(), duration: reducedMotion.matches ? 0 : pressDuration, overwrite: true });
    }, { signal });
    reducedMotion.addEventListener("change", () => {
      if (!reducedMotion.matches) return;
      if (pressed) resetPress(pressed);
      animation?.progress(1);
    }, { signal });

    dialog.imageZoomCleanup = () => {
      disposed = true;
      controller.abort();
      finishClose(false);
      triggers.forEach(({ button, media }) => {
        gsap.killTweensOf(button);
        button.replaceWith(media);
      });
      delete dialog.imageZoomCleanup;
    };
  });
};

initializeImageZoom();
document.addEventListener("astro:page-load", initializeImageZoom);
document.addEventListener("astro:before-swap", () => {
  document.querySelectorAll<ZoomDialog>("[data-article-image-zoom]").forEach((dialog) => dialog.imageZoomCleanup?.());
});
