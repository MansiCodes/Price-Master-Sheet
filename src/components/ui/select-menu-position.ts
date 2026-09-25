export type SelectMenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export function measureSelectMenuPos(
  el: HTMLElement,
  searchable: boolean,
): SelectMenuPos {
  const rect = el.getBoundingClientRect();
  const gap = 6;
  const edgePad = 16;
  const spaceBelow = window.innerHeight - rect.bottom - gap - edgePad;
  const spaceAbove = rect.top - gap - edgePad;
  const minSpace = searchable ? 220 : 180;
  const openUp = spaceBelow < minSpace && spaceAbove > spaceBelow;
  const maxHeight = Math.max(
    searchable ? 160 : 140,
    Math.min(searchable ? 320 : 280, openUp ? spaceAbove : spaceBelow),
  );
  const maxWidth = Math.max(120, window.innerWidth - edgePad * 2);
  const width = Math.min(Math.max(rect.width, 128), maxWidth);
  let left = rect.left;
  if (left + width > window.innerWidth - edgePad) {
    left = window.innerWidth - edgePad - width;
  }
  left = Math.max(edgePad, left);
  return {
    top: openUp ? rect.top - gap : rect.bottom + gap,
    left,
    width,
    maxHeight,
    openUp,
  };
}
