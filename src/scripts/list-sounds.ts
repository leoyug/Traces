import { playInterfaceSound } from "./sound";

const listItemAt = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLElement>("[data-list-sound]") : null;

document.addEventListener("pointerover", (event) => {
  if (event.pointerType === "touch") return;
  const item = listItemAt(event.target);
  if (!item || (event.relatedTarget instanceof Node && item.contains(event.relatedTarget))) return;
  playInterfaceSound("tick", 0.42);
});

document.addEventListener("click", (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const item = listItemAt(event.target);
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (item && link && item.contains(link)) playInterfaceSound("select", 0.7);
});
