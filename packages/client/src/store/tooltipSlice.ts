/**
 * tooltipSlice — the open tooltip STACK (tooltips D2, D8).
 *
 * ⭐⭐ A tooltip is not a card. A card is born from a command and lives in
 * the feed; a tooltip is born from pointing and lives while you point at it
 * or hold it locked. So this slice holds no lifetime, no subscription and
 * no position: an entry is a snapshot of a document, opened from an
 * anchor, and nothing writes to an entry's document once it has one.
 *
 * Depth 0 is the tooltip of an anchor on the page; depth n+1 is the
 * tooltip of an anchor inside tooltip n. Opening at depth d drops every
 * entry at d and above, so the stack is always a breadcrumb.
 *
 * ⚠ Not `ghostPreview` (the status bar's one preview surface, guarded to a
 * single reader) and not `commandSheet` (the phone's confirm step). Hover
 * still writes the ghost preview exactly as before; this is a third,
 * separate channel — hover to INFORM.
 */

import type { TooltipDoc } from "@saxonberg/types";

export interface TipEntry {
  /** Unique per open — a reopen of the same anchor is a new entry. */
  id: number;
  depth: number;
  /** The element it describes; positioning reads it once, at open. */
  anchor: Element;
  /** What the anchor named (dedupes a re-hover of the same anchor). */
  key: string;
  /** `null` while its source resolves; set ONCE, then frozen. */
  doc: TooltipDoc | null;
  /** Locked: the pointer may move into it; it stays where it opened. */
  locked: boolean;
  /**
   * Opened by a long press: the stack draws as the phone's bottom sheet
   * rather than floating (touch has no hover to float on).
   */
  touch: boolean;
}

export interface TooltipSlice {
  tipStack: TipEntry[];
  /** Open at `depth`, replacing that depth and everything above it. */
  openTip: (
    depth: number,
    anchor: Element,
    key: string,
    doc: TooltipDoc | null,
    touch?: boolean,
  ) => number;
  /** Fill a resolving entry. A no-op once it has a document (the snapshot rule). */
  resolveTip: (id: number, doc: TooltipDoc) => void;
  /** Lock every entry, or one by id. */
  lockTips: (id?: number) => void;
  /** Close `depth` and everything above it. */
  closeTipsFrom: (depth: number) => void;
  closeAllTips: () => void;
}

let nextTipId = 1;

export const createTooltipSlice = (
  set: (
    partial: Partial<TooltipSlice> | ((state: TooltipSlice) => Partial<TooltipSlice>),
  ) => void,
): TooltipSlice => ({
  tipStack: [],
  openTip: (depth, anchor, key, doc, touch = false) => {
    const id = nextTipId++;
    set((s) => ({
      tipStack: [
        ...s.tipStack.filter((e) => e.depth < depth),
        { id, depth, anchor, key, doc, locked: false, touch },
      ],
    }));
    return id;
  },
  resolveTip: (id, doc) =>
    set((s) => ({
      tipStack: s.tipStack.map((e) => (e.id === id && e.doc === null ? { ...e, doc } : e)),
    })),
  lockTips: (id) =>
    set((s) => ({
      tipStack: s.tipStack.map((e) =>
        (id === undefined || e.id === id) && !e.locked ? { ...e, locked: true } : e,
      ),
    })),
  closeTipsFrom: (depth) =>
    set((s) => ({ tipStack: s.tipStack.filter((e) => e.depth < depth) })),
  closeAllTips: () => set(() => ({ tipStack: [] })),
});
