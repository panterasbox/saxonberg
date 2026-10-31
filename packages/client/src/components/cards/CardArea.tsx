/**
 * CardArea — the cards beside the terminal column.
 *
 * ⭐ **A grid that fills the width.** Columns are as many as fit at the
 * unit's minimum width and stretch to share whatever is left, so no
 * space sits unused to the right. Cards keep their full height and the
 * area scrolls; nothing is cut or displaced to make room.
 *
 * ⭐ **The order is the player's, in the client.** Cards arrive in the
 * order they were opened; drag one onto another and it moves before it
 * (the store's `cardOrder`). Nothing is sent to the server.
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
 * ⚠ `min(100%, …)` so a single column never overflows a narrow area;
 * `1fr` so the columns share the leftover instead of leaving it empty.
 */
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(100%, ${tokens.width.unit.min}rem), 1fr)
  );
  gap: ${tokens.width.gap}rem;
  align-items: start;
`;

const Slot = styled.div<{ $over: boolean }>`
  min-width: 0;
  border-radius: ${tokens.radius.md};
  outline: ${(p) => (p.$over ? `2px dashed ${tokens.color.fgEmphasis}` : "none")};
  outline-offset: 2px;
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
  const reorderCard = useStore((s) => s.reorderCard);
  const [over, setOver] = React.useState<string | null>(null);

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

  const dragged = (e: React.DragEvent): string =>
    e.dataTransfer.getData("application/x-saxonberg-card-id");

  return (
    <Area $overflow data-testid="card-area" data-card-units={units}>
      {units <= 0 ? (
        <Trail data-testid="glance-strip" style={{ maxHeight: "none" }}>
          {cards.map((card) => {
            // Below one unit a card opens at measure, beside the terminal.
            const cmd = `cockpit card grow ${quoteRef(card.key)}`;
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
        <Grid
          data-testid="card-grid"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            // Dropped on the grid's empty space: it goes last.
            const id = dragged(e);
            if (!id) return;
            e.preventDefault();
            reorderCard(id, null);
            setOver(null);
          }}
        >
          {cards.map((card) => (
            <Slot
              key={card.instanceId}
              data-card-slot={card.instanceId}
              $over={over === card.instanceId}
              onDragOver={(e) => {
                e.preventDefault();
                if (over !== card.instanceId) setOver(card.instanceId);
              }}
              onDragLeave={() => setOver((o) => (o === card.instanceId ? null : o))}
              onDrop={(e) => {
                const id = dragged(e);
                if (!id) return;
                e.preventDefault();
                e.stopPropagation();
                if (id !== card.instanceId) reorderCard(id, card.instanceId);
                setOver(null);
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
          ))}
        </Grid>
      )}
    </Area>
  );
}
