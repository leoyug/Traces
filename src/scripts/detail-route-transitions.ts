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
  document.addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;

    const from = listKind(location.pathname);
    const to = new URL(link.href);
    if (!from || to.origin !== location.origin || detailKind(to.pathname) !== from) return;

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

    if (fromList && fromList === toDetail) {
      event.newDocument.documentElement.dataset.detailTransition = "open";
      event.newDocument.documentElement.dataset.detailTransitionKind = fromList.slice(1);
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
      if (context.to === location.href) return;
    } catch {
      // A stale or malformed entry must not affect a later detail visit.
    }
    sessionStorage.removeItem(returnContextKey);
  };

  clearStaleReturn();
  document.addEventListener("astro:page-load", clearStaleReturn);
}
