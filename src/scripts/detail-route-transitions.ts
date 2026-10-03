const returnContextKey = "detail-list-return";

const normalizedPath = (path: string) => path.replace(/\/+$/, "") || "/";
const listKind = (path: string) => {
  const normalized = normalizedPath(path);
  return normalized === "/projects" || normalized === "/writing" ? normalized : null;
};
const detailKind = (path: string) => {
  const match = normalizedPath(path).match(/^\/(projects|writing)\/[^/]+$/);
  return match ? `/${match[1]}` : null;
};

export function initDetailRouteTransitions() {
  document.addEventListener("astro:before-preparation", (event) => {
    if (detailKind(event.to.pathname) !== "/writing") return;

    const load = event.loader;
    event.loader = async () => {
      await load();
      if (event.signal.aborted || event.defaultPrevented) return;

      const cover = event.newDocument.querySelector<HTMLImageElement>("[data-detail-page=\"article\"] .content-detail__cover");
      const src = cover?.getAttribute("src");
      if (!src) return;

      // The transition snapshot must contain the decoded article cover.
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "high";
      image.src = new URL(src, event.to).href;
      await image.decode().catch(() => undefined);
    };
  });

  document.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;

    const from = normalizedPath(location.pathname);
    const to = new URL(link.href);
    const targetKind = detailKind(to.pathname);
    const entersDetail = targetKind === from || (from === "/" && targetKind === "/writing");
    if (to.origin !== location.origin || !targetKind || !entersDetail) return;

    sessionStorage.setItem(returnContextKey, JSON.stringify({
      from,
      to: to.href,
      historyIndex: history.state?.index,
    }));
  }, { capture: true });

  document.addEventListener("astro:before-swap", (event) => {
    const fromList = listKind(event.from.pathname);
    const toList = listKind(event.to.pathname);
    const fromDetail = detailKind(event.from.pathname);
    const toDetail = detailKind(event.to.pathname);
    const opensArticleFromHome = normalizedPath(event.from.pathname) === "/" && toDetail === "/writing";

    if (toDetail && (fromList === toDetail || opensArticleFromHome)) {
      event.newDocument.documentElement.dataset.detailTransition = "open";
      event.newDocument.documentElement.dataset.detailTransitionKind = toDetail.slice(1);
    } else if (fromDetail && fromDetail === toList && event.navigationType === "traverse" && event.direction === "back") {
      event.newDocument.documentElement.dataset.detailTransition = "close";
      event.newDocument.documentElement.dataset.detailTransitionKind = fromDetail.slice(1);
    }
  });

  const clearStaleReturn = () => {
    const stored = sessionStorage.getItem(returnContextKey);
    if (!stored) return;
    try {
      const context = JSON.parse(stored) as { to?: string };
      if (context.to) {
        const target = new URL(context.to);
        if (target.origin === location.origin && normalizedPath(target.pathname) === normalizedPath(location.pathname) && target.search === location.search) return;
      }
    } catch {
      // A stale or malformed entry must not affect a later detail visit.
    }
    sessionStorage.removeItem(returnContextKey);
  };

  clearStaleReturn();
  document.addEventListener("astro:page-load", clearStaleReturn);
}
