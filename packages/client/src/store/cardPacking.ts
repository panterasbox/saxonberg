/**
 * Packing the card gallery — the photo-grid layout.
 *
 * ⭐ Cards keep their natural height. In order, each goes into whichever
 * column is shortest so far, so a short card leaves no hole beside a tall
 * one and the area fills from the top. Column count follows the width:
 * as many as fit at the minimum card width, stretched to share the rest.
 *
 * Pure: the component measures, this places.
 */

export interface PackedSlot {
  x: number;
  y: number;
  width: number;
}

export interface Packing {
  slots: Map<string, PackedSlot>;
  /** The tallest column — the area's content height. */
  height: number;
  columns: number;
}

/** How many columns fit `width` at `minWidth` each, `gap` between. */
export function columnsFor(width: number, minWidth: number, gap: number): number {
  if (width <= 0) return 1;
  return Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
}

/**
 * Place `ids` in order, each into the shortest column. A card not yet
 * measured counts as `estimate` tall, so the first frame is close and
 * the next one exact.
 */
export function packCards(
  ids: readonly string[],
  heights: ReadonlyMap<string, number>,
  width: number,
  minWidth: number,
  gap: number,
  estimate = 160,
): Packing {
  const columns = columnsFor(width, minWidth, gap);
  const colWidth = (width - gap * (columns - 1)) / columns;
  const tops = new Array<number>(columns).fill(0);
  const slots = new Map<string, PackedSlot>();
  for (const id of ids) {
    let col = 0;
    for (let c = 1; c < columns; c++) if (tops[c]! < tops[col]!) col = c;
    slots.set(id, { x: col * (colWidth + gap), y: tops[col]!, width: colWidth });
    tops[col] = tops[col]! + (heights.get(id) ?? estimate) + gap;
  }
  const height = Math.max(0, ...tops.map((t) => t - gap));
  return { slots, height, columns };
}

/** `order` with `moving` taken out and put just before `before` (or last). */
export function moveBefore(order: readonly string[], moving: string, before: string | null): string[] {
  const rest = order.filter((id) => id !== moving);
  const at = before === null ? -1 : rest.indexOf(before);
  if (at < 0) return [...rest, moving];
  return [...rest.slice(0, at), moving, ...rest.slice(at)];
}
