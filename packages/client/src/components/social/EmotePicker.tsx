/**
 * EmotePicker — the palette body. Shared verbatim by the desktop
 * popover and the phone sheet, so grammar survives the phone.
 *
 * ⭐ **This is an emote picker, not a reaction picker.** Emoji are an
 * alias surface over canonical verbs, so every cell prints the verb it
 * sends underneath its glyph, and the command bar fills with the real
 * command. Reacting is the most-used interaction in the product; it is
 * the last place the command line should go quiet.
 *
 * ⭐ **The grid is drawn from the server's catalogue and nothing else**
 * (`store.emoteCatalogue`, cached at session-establish). It replaced a
 * hardcoded six-entry array of verb/emoji pairs — a pairing that drifts
 * from the catalogue silently, which is why `noHardcodedEmoji.test.ts`
 * now guards this file.
 *
 * Emotes with grammar (`;wave bob happily`) cannot fit a flat grid, so
 * selecting one reveals its declared slots: `stuff` slots resolve by MQL
 * server-side and render solid, `free` slots take arbitrary text and
 * render dashed. Declaration order is binding order.
 */

import React from "react";
import styled from "styled-components";
import type { EmoteCatalogueEntry } from "@saxonberg/types";
import { tokens } from "../ui";
import {
  composeReactCommand,
  firstUnfilledRequiredSlot,
  paletteEntries,
  type SlotValues,
} from "./reactCommand";
import { useStore } from "../../store";

const Panel = styled.div`
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surface};
  padding: ${tokens.space.sm};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
`;

const Header = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
  gap: ${tokens.space.xs};
  max-height: 12rem;
  overflow-y: auto;
`;

const Cell = styled.button<{ $on: boolean }>`
  appearance: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${tokens.space.xs} 0;
  border: 1px solid
    ${(p) => (p.$on ? tokens.color.accent : "transparent")};
  border-radius: ${tokens.radius.sm};
  background: ${(p) =>
    p.$on ? tokens.color.surfaceAlt : "transparent"};
  color: ${tokens.color.fgMuted};
  cursor: pointer;
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const Glyph = styled.span`
  font-size: 1.15rem;
  line-height: 1.1;
`;

/** The verb under every cell — the thing that actually gets sent. */
const Verb = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
`;

const SlotRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
  border-top: 1px solid ${tokens.color.border};
  padding-top: ${tokens.space.sm};
`;

const SlotLabel = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

/**
 * `stuff` slots render solid (the server resolves them by MQL); `free`
 * slots render dashed (arbitrary text). The border IS the affordance's
 * explanation, so the two must not look alike.
 */
const SlotInput = styled.input<{ $free: boolean }>`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
  background: ${tokens.color.surfaceAlt};
  border: 1px ${(p) => (p.$free ? "dashed" : "solid")}
    ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  padding: 1px ${tokens.space.sm};
  width: 8rem;
  &:focus {
    outline: none;
    border-color: ${tokens.color.accent};
  }
`;

const CommandLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.space.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const Composed = styled.code`
  color: ${tokens.color.fg};
  overflow-x: auto;
  white-space: nowrap;
`;

const SendBtn = styled.button`
  appearance: none;
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  padding: 1px ${tokens.space.sm};
  cursor: pointer;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  &:not(:disabled):hover {
    border-color: ${tokens.color.accent};
  }
`;

export interface EmotePickerProps {
  /** The act being reacted to — its gutter number. */
  frameId: number;
  /** Verbs the viewer has already reacted with, which makes a second
   *  click on one an un-react. */
  mine: readonly string[];
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
  /** Rendered top-right; the sheet passes its close control here. */
  trailing?: React.ReactNode;
}

export function EmotePicker({
  frameId,
  mine,
  onCommandClick,
  onCommandPreview,
  trailing,
}: EmotePickerProps): React.ReactElement {
  const catalogue = useStore((s) => s.emoteCatalogue);
  const entries = React.useMemo(() => paletteEntries(catalogue), [catalogue]);

  const [selected, setSelected] = React.useState<string | null>(null);
  const [values, setValues] = React.useState<SlotValues>({});

  // Changing emote clears the slot values — they are that emote's slots,
  // and carrying "happily" from `;wave` into `;glare` would fill a
  // control the player never touched.
  const select = React.useCallback((verb: string) => {
    setSelected(verb);
    setValues({});
  }, []);

  const entry: EmoteCatalogueEntry | undefined = selected
    ? catalogue.get(selected)
    : undefined;

  const command = entry
    ? composeReactCommand({
        frameId,
        verb: entry.verb,
        slots: entry.slots,
        values,
        remove: mine.includes(entry.verb),
      })
    : null;

  const missing = entry ? firstUnfilledRequiredSlot(entry, values) : null;

  /*
   * A slotless emote sends on the cell click — that is the frictionless
   * everyday path and the reason the grid exists. A slot-bearing one
   * cannot: it needs its controls filled first, so the cell only selects
   * and the send control commits.
   */
  const clickCell = (e: EmoteCatalogueEntry) => {
    if (e.slots.length === 0) {
      onCommandClick(
        composeReactCommand({
          frameId,
          verb: e.verb,
          remove: mine.includes(e.verb),
        }),
      );
      return;
    }
    select(e.verb);
  };

  const previewCell = (e: EmoteCatalogueEntry | null) =>
    onCommandPreview(
      e === null
        ? null
        : composeReactCommand({
            frameId,
            verb: e.verb,
            slots: e.slots,
            values: e.verb === selected ? values : {},
            remove: mine.includes(e.verb),
          }),
    );

  return (
    <Panel data-testid="emote-picker">
      <Header>
        <span>Emotes</span>
        {trailing ?? <span>reacting to {frameId}</span>}
      </Header>

      <Grid>
        {entries.map((e) => (
          <Cell
            key={e.verb}
            $on={e.verb === selected}
            data-emote={e.verb}
            onClick={() => clickCell(e)}
            onMouseEnter={() => previewCell(e)}
            onMouseLeave={() => previewCell(null)}
          >
            <Glyph aria-hidden>{e.emoji}</Glyph>
            <Verb>{e.verb}</Verb>
          </Cell>
        ))}
      </Grid>

      {entry && (
        <SlotRow data-testid="emote-slots">
          <SlotLabel>Slots</SlotLabel>
          {entry.slots.length === 0 ? (
            <span>this emote takes no arguments</span>
          ) : (
            entry.slots.map((slot) => (
              <SlotInput
                key={slot.name}
                $free={slot.kind === "free"}
                data-slot={slot.name}
                data-slot-kind={slot.kind}
                placeholder={`<${slot.name}>`}
                value={values[slot.name] ?? ""}
                onChange={(ev) =>
                  setValues((v) => ({ ...v, [slot.name]: ev.target.value }))
                }
              />
            ))
          )}
        </SlotRow>
      )}

      {command !== null && (
        <CommandLine>
          {/*
            ⭐ The verbatim command, shown because this is the surface the
            axiom binds hardest on. It is the SAME string the send emits
            — one `composeReactCommand` call feeds both, so they cannot
            drift.
          */}
          <Composed data-testid="composed-command">{command}</Composed>
          <SendBtn
            disabled={missing !== null}
            title={
              missing !== null ? `fill <${missing}> first` : "send this react"
            }
            onClick={() => onCommandClick(command)}
            onMouseEnter={() => onCommandPreview(command)}
            onMouseLeave={() => onCommandPreview(null)}
          >
            send ⏎
          </SendBtn>
        </CommandLine>
      )}
    </Panel>
  );
}
