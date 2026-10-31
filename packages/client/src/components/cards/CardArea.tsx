/**
 * CardArea — the cards beside the terminal column (client-surface D9).
 *
 * ⭐ **A feed at one column, a workspace at more**, laid out by
 * {@link arrangeCards} from the window's unit count: placed cards hold
 * their slots (units, from the server), flowing cards run by touch, and
 * when there is no room the stalest unprotected card is displaced to the
 * Recent trail, saying which command displaced it. Below one unit the
 * area is a glance strip of chips, and a chip opens its card at measure.
 *
 * ⚠ The client never decides WHERE a card is placed: dragging a card
 * sends `cockpit card move <card> <col> <row>` (insertion), and the card
 * moves when the server's `card-arranged` arrives.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";
import { Card } from "./Card";
import { CardBody } from "./CardBodies";
import { visibleCards, type CardState } from "../../store/cardFeedSlice";
import { arrangeCards, type TrailChip } from "../../store/cardLayout";
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

const Columns = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  gap: ${tokens.width.gap}rem;
`;

const Column = styled.div`
  flex: 1 1 ${tokens.width.unit.min}rem;
  min-width: ${tokens.width.unit.min}rem;
  max-width: ${tokens.width.unit.max}rem;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
`;

const Slot = styled.div`
  flex: 1 1 auto;
  min-height: 6rem;
  display: flex;
  flex-direction: column;
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

const TrailLabel = styled.span`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  color: ${tokens.color.sectionLabel};
  align-self: center;
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

const Muted = styled.span`
  color: ${tokens.color.fgMuted};
`;

const OverNote = styled.div`
  flex: none;
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

/** How many cards a column holds before it must displace: a reading of the window's height. */
function capacityPerColumn(): number {
  if (typeof window === "undefined") return 4;
  const rootPx =
    parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const remHeight = window.innerHeight / rootPx;
  // A unit card's minimum: header + its kept fields ≈ 10rem.
  return Math.max(2, Math.floor((remHeight - 6) / 10));
}

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

  const arrangement = React.useMemo(() => {
    const cards = visibleCards(byId, { resultDisplay, kinds }).filter(
      (c) =>
        !c.minimized &&
        c.size !== "medium" &&
        c.size !== "full" &&
        !(exclude?.has(c.instanceId) ?? false),
    );
    return arrangeCards(cards, units, capacityPerColumn());
  }, [byId, resultDisplay, kinds, units, exclude]);

  const chipFor = (chip: TrailChip): React.ReactElement => {
    // A husk re-runs its command; a displaced card is brought back by
    // re-running it too (a touch moves it to the bottom).
    const cmd = chip.card.key;
    return (
      <Chip
        key={chip.card.instanceId}
        type="button"
        data-testid="trail-chip"
        title={`${titleOf(chip.card)} — ${chip.reason}`}
        onClick={() => onSendCommand(cmd)}
        onMouseEnter={() => preview(cmd)}
        onMouseLeave={() => preview(null)}
      >
        {titleOf(chip.card)} <Muted>· {chip.reason}</Muted>
      </Chip>
    );
  };

  const onDrop = (col: number, e: React.DragEvent<HTMLDivElement>): void => {
    const ref = e.dataTransfer.getData("application/x-saxonberg-card");
    if (!ref) return;
    e.preventDefault();
    // ⭐ Insertion: the row is the count of slots above the drop point.
    const slots = Array.from(
      (e.currentTarget as HTMLElement).querySelectorAll("[data-card-slot]"),
    );
    const row = slots.filter((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.top + r.height / 2 < e.clientY;
    }).length;
    onSendCommand(`cockpit card move ${ref} ${col} ${row}`);
  };

  return (
    <Area
      $overflow={arrangement.overflow}
      data-testid="card-area"
      data-card-units={units}
    >
      {arrangement.trail.length > 0 ? (
        <Trail data-testid="recent-trail">
          <TrailLabel>Recent</TrailLabel>
          {arrangement.trail.map(chipFor)}
        </Trail>
      ) : null}
      {units <= 0 ? (
        <Trail data-testid="glance-strip" style={{ maxHeight: "none" }}>
          {arrangement.glance.map((card) => {
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
        <Columns>
          {arrangement.columns.map((column, col) => (
            <Column
              key={col}
              data-testid="card-column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(col, e)}
            >
              {column.map((card) => (
                <Slot key={card.instanceId} data-card-slot="">
                  <Card
                    card={card}
                    cut={column.length > 1}
                    onSendCommand={onSendCommand}
                    onCommandPreview={onCommandPreview}
                  >
                    {renderBody ? (
                      renderBody(card, column.length > 1)
                    ) : (
                      <CardBody
                        card={card}
                        cut={column.length > 1}
                        onSendCommand={onSendCommand}
                        onCommandPreview={onCommandPreview}
                      />
                    )}
                  </Card>
                </Slot>
              ))}
            </Column>
          ))}
        </Columns>
      )}
      {arrangement.overflow ? (
        <OverNote data-testid="card-area-over">
          More cards are kept than fit — the area scrolls.
        </OverNote>
      ) : null}
    </Area>
  );
}
