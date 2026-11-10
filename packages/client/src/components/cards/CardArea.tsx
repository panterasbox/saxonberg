/**
 * CardArea — the cards beside the terminal column, packed like a photo
 * gallery.
 *
 * ⭐ **Packed, not gridded.** Cards keep their natural height and each
 * goes into the shortest column (`packCards`), so a short card leaves no
 * hole; columns are as many as fit at the minimum card width, stretched
 * to share the rest. Cards are placed absolutely, so when the order
 * changes they glide to their new place rather than jump.
 *
 * ⭐ **The order is the player's, in the client.** Cards arrive in the
 * order they were opened. Drag one by its header and the others make
 * room as you move — the gallery previews where it will land — and the
 * drop commits it (the store's `cardOrder`). Nothing is sent to the
 * server for a reorder.
 *
 * Below one unit of room the area is a glance strip of chips, and a
 * chip opens its card at measure.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";
import { Card } from "./Card";
import { CardBody } from "./CardBodies";
import { visibleCards, type CardState } from "../../store/cardFeedSlice";
import { activeCardKinds } from "../../store/cardViewActions";
import { CARD_LABEL } from "./useCardFeed";
import { moveBefore, packCards } from "../../store/cardPacking";

const Area = styled.section<{ $overflow: boolean }>`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm};
  background: ${tokens.color.surfaceMuted};
  border-left: 1px solid ${tokens.color.border};
  /* ⭐ Overflow scrolls the AREA as one surface, never per column. */
  overflow-y: ${(p) => (p.$overflow ? "auto" : "hidden")};
`;

/**
 * The narrowest a card in the grid gets. ⭐ 20rem, not the stage's unit:
 * at 2560px and 150% zoom with the room panel open the area is ~707px,
 * and the unit's minimum left ONE 694px-wide column of short cards;
 * 20rem gives two of ~345px, still wide enough for a card's header.
 */
const CARD_MIN_REM = 20;

/** The gallery: a box as tall as its tallest column. */
const Gallery = styled.div`
  position: relative;
  width: 100%;
`;

const Slot = styled.div<{ $dragging: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  /* ⭐ Cards glide to a new place rather than jump — which is what makes
     "the others make room" readable while you drag. */
  transition: transform 160ms ease;
  opacity: ${(p) => (p.$dragging ? 0.45 : 1)};
`;

const Trail = styled.div`
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
  /* Two lines at most, then "+N". */
  max-height: 3.4rem;
  overflow: hidden;
  font-size: ${tokens.font.micro};
`;

const Chip = styled.button`
  font: inherit;
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0.1rem ${tokens.space.sm};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  cursor: pointer;

  &:hover {
    border-color: ${tokens.color.fgEmphasis};
  }
`;

function titleOf(card: CardState): string {
  return (
    (card.records[0]?.displayName as string | undefined) ||
    card.title ||
    card.lastTitle ||
    CARD_LABEL[card.cardId] ||
    "a card"
  );
}

function quoteRef(key: string): string {
  if (!/\s|"/.test(key)) return key;
  return `"${key.replace(/(["\\])/g, "\\$1")}"`;
}

export interface CardAreaProps {
  /** Card-area columns that fit (0 = a glance strip). */
  units: number;
  /** Cards drawn elsewhere — the medium slot, the stage, the panel. */
  exclude?: ReadonlySet<string>;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
  resultDisplay?: "card" | "terminal" | "both";
  /**
   * The body for a card — the stage supplies one that renders a terminal
   * card as a terminal; absent, every card gets its `CardBody`.
   */
  renderBody?: (card: CardState, cut: boolean) => React.ReactElement;
}

export function CardArea({
  units,
  exclude,
  onSendCommand,
  onCommandPreview,
  resultDisplay = "card",
  renderBody,
}: CardAreaProps): React.ReactElement {
  const byId = useStore((s) => s.cards);
  const kinds = activeCardKinds();
  const preview = onCommandPreview ?? (() => undefined);

  const order = useStore((s) => s.cardOrder);
  const setCardOrder = useStore((s) => s.setCardOrder);

  const cards = React.useMemo(() => {
    const shown = visibleCards(byId, { resultDisplay, kinds }).filter(
      (c) =>
        !c.minimized &&
        c.size !== "medium" &&
        c.size !== "full" &&
        !(exclude?.has(c.instanceId) ?? false),
    );
    const rank = new Map(order.map((id, i) => [id, i]));
    return shown.sort((a, b) => {
      const ra = rank.get(a.instanceId);
      const rb = rank.get(b.instanceId);
      if (ra !== undefined && rb !== undefined) return ra - rb;
      if (ra !== undefined) return -1;
      if (rb !== undefined) return 1;
      return a.openedAt - b.openedAt;
    });
  }, [byId, resultDisplay, kinds, exclude, order]);

  // ── measuring: the gallery's width, and each card's natural height ──
  const galleryRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const [heights, setHeights] = React.useState<Map<string, number>>(new Map());
  const slotKey = cards.map((c) => c.instanceId).join("\n");
  /*
   * ⚠ One observer per set of slots, re-observing every slot each time.
   * A memoized observer with a stable ref callback lost its targets when
   * its cleanup ran (StrictMode's double mount, or the area remounting as
   * a card left for the medium slot): the slots were never observed
   * again, every height fell back to the estimate, and the gallery
   * opened holes.
   */
  React.useLayoutEffect(() => {
    const el = galleryRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      setHeights((prev) => {
        let next: Map<string, number> | null = null;
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.cardSlot;
          if (!id) continue;
          const h = Math.round(e.contentRect.height);
          if (prev.get(id) !== h) {
            next ??= new Map(prev);
            next.set(id, h);
          }
        }
        return next ?? prev;
      });
    });
    el.querySelectorAll<HTMLElement>("[data-card-slot]").forEach((slot) => ro.observe(slot));
    return () => ro.disconnect();
  }, [slotKey]);
  React.useLayoutEffect(() => {
    const el = galleryRef.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
    // The gallery element itself comes and goes (the glance strip, an
    // empty area), so re-attach whenever what is shown changes.
  }, [units, slotKey]);

  // ── dragging: the card in hand, and where it would land ──
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [landing, setLanding] = React.useState<string[] | null>(null);
  const ids = cards.map((c) => c.instanceId);
  const shownOrder = landing ?? ids;

  const rootPx =
    typeof window === "undefined"
      ? 16
      : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const gapPx = tokens.width.gap * rootPx;
  const packing = packCards(shownOrder, heights, width, CARD_MIN_REM * rootPx, gapPx);

  const endDrag = (): void => {
    setDragging(null);
    setLanding(null);
  };
  const commit = (next: string[]): void => {
    // The whole visible order, so it holds even for cards that arrived
    // before any drag.
    const rest = order.filter((id) => !next.includes(id));
    setCardOrder([...next, ...rest]);
  };

  return (
    <Area $overflow data-testid="card-area" data-card-units={units}>
      {units <= 0 ? (
        <Trail data-testid="glance-strip" style={{ maxHeight: "none" }}>
          {cards.map((card) => {
            // Below one unit a card opens at measure, beside the terminal.
            const cmd = `client-card grow ${quoteRef(card.key)}`;
            return (
              <Chip
                key={card.instanceId}
                type="button"
                data-testid="glance-chip"
                onClick={() => onSendCommand(cmd)}
                onMouseEnter={() => preview(cmd)}
                onMouseLeave={() => preview(null)}
              >
                {titleOf(card)}
              </Chip>
            );
          })}
        </Trail>
      ) : (
        <Gallery
          ref={galleryRef}
          data-testid="card-grid"
          data-columns={packing.columns}
          style={{ height: packing.height }}
          onDragOver={(e) => {
            if (!dragging) return;
            e.preventDefault();
            // Below every card: it would land last.
            if (e.target === e.currentTarget) setLanding(moveBefore(ids, dragging, null));
          }}
          onDrop={(e) => {
            if (!dragging) return;
            e.preventDefault();
            commit(landing ?? ids);
            endDrag();
          }}
        >
          {cards.map((card) => {
            const at = packing.slots.get(card.instanceId);
            return (
              <Slot
                key={card.instanceId}
                data-card-slot={card.instanceId}
                $dragging={dragging === card.instanceId}
                style={{
                  width: at?.width ?? "100%",
                  transform: `translate(${at?.x ?? 0}px, ${at?.y ?? 0}px)`,
                }}
                onDragStart={() => setDragging(card.instanceId)}
                onDragEnd={endDrag}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragging === card.instanceId) return;
                  // ⭐ Over the top half: before it; the bottom half: after.
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const i = ids.indexOf(card.instanceId);
                  const before =
                    e.clientY < r.top + r.height / 2 ? card.instanceId : (ids[i + 1] ?? null);
                  const next = moveBefore(ids, dragging, before === dragging ? (ids[i + 2] ?? null) : before);
                  if (!landing || next.join() !== landing.join()) setLanding(next);
                }}
                onDrop={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.stopPropagation();
                  commit(landing ?? ids);
                  endDrag();
                }}
              >
                <Card card={card} onSendCommand={onSendCommand} onCommandPreview={onCommandPreview}>
                  {renderBody ? (
                    renderBody(card, false)
                  ) : (
                    <CardBody card={card} onSendCommand={onSendCommand} onCommandPreview={onCommandPreview} />
                  )}
                </Card>
              </Slot>
            );
          })}
        </Gallery>
      )}
    </Area>
  );
}
