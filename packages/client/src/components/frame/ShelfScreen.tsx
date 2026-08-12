/**
 * `ShelfScreen` — choosing what rides the bar.
 *
 * ⭐ **The glance-line is presented as the scarce slot it is.** The
 * screen opens with the three rows that fit on the bar, named as such,
 * above the full catalogue — because on a phone the question is not
 * *what can the shelf show* but *which three do I want without
 * reaching*. Everything else is one drag away, and saying so is what
 * makes the pull-down feel like disclosure rather than truncation.
 *
 * ⭐ **Reordering, not a second list.** `first` moves a row to the head
 * of `cockpit.shelf` — and because the glance-line IS the head of that
 * one list, promoting a row is how it reaches the bar. There is no
 * client-side glance list to keep in step, and a test asserts none is
 * stored.
 *
 * ⚠ Every affordance sends a `cockpit shelf …` command and **mutates
 * nothing locally**. The server writes `cockpit.shelf` and pushes it
 * back; the screen re-renders from that. This is the same rule the
 * desktop widget menu keeps, and the reason is unchanged: a control
 * that mutated local state would falsify the one axiom the whole click
 * model advertises.
 *
 * ⚠ **Identity and connection are absent by design.** They are not
 * shelf rows at all — `cockpit shelf unpin identity` refuses with
 * *unknown shelf row*, and that refusal is a stronger guarantee than a
 * rule somebody could edit out of this file.
 *
 * ⚠ Hatched rows carry their reason as VISIBLE text at this size, not a
 * tooltip. A phone has no hover, so a `title` attribute is a reason
 * nobody can read — which would make "each with its reason" true of the
 * markup and false of the surface.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";
import {
  SHELF_CATALOGUE,
  HATCH_COPY,
  pinnedShelf,
  pinCommand,
  unpinCommand,
  firstCommand,
  GLANCE_ROWS,
} from "./Shelf";

const Screen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: ${tokens.color.surface};
  overflow-y: auto;
  overflow-x: hidden;
  padding: calc(${tokens.space.md} + env(safe-area-inset-top, 0px))
    ${tokens.space.md}
    calc(${tokens.space.md} + env(safe-area-inset-bottom, 0px));
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.space.sm};
  margin-bottom: ${tokens.space.md};
`;

const Title = styled.h2`
  margin: 0;
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.title};
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${tokens.color.fgEmphasis};
`;

const CloseButton = styled.button`
  flex: none;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgDim};
  font: inherit;
  cursor: pointer;
`;

const SectionLabel = styled.h3`
  margin: ${tokens.space.lg} 0 ${tokens.space.xs};
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
`;

const SectionNote = styled.p`
  margin: 0 0 ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  line-height: 1.4;
`;

const RowBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm} 0;
  border-bottom: 1px solid ${tokens.color.borderMuted};
  min-width: 0;
`;

const RowText = styled.div`
  flex: 1;
  min-width: 0;
`;

const RowLabel = styled.span`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.fgDim};
  margin-right: ${tokens.space.sm};
`;

const RowDesc = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
`;

/** The hatch reason, as text a thumb can read — never a tooltip. */
const RowReason = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  margin-top: 2px;
  line-height: 1.4;
`;

const Actions = styled.div`
  flex: none;
  display: flex;
  gap: ${tokens.space.xs};
`;

const Action = styled.button`
  min-width: 44px;
  min-height: 44px;
  padding: 0 ${tokens.space.sm};
  background: transparent;
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgEmphasis};
  font: inherit;
  font-size: ${tokens.font.micro};
  cursor: pointer;
`;

interface ShelfScreenProps {
  onClose: () => void;
  /** Click-to-send a command (command-bus primacy). */
  onCommandClick?: (command: string) => void;
}

export const ShelfScreen: React.FC<ShelfScreenProps> = ({
  onClose,
  onCommandClick,
}) => {
  const clientState = useStore((s) => s.clientState);
  const pinned = pinnedShelf(clientState);
  const onBar = new Set(pinned.slice(0, GLANCE_ROWS));
  const byId = new Map(SHELF_CATALOGUE.map((r) => [r.id, r]));

  const send = (command: string) => onCommandClick?.(command);

  return (
    <Screen role="dialog" aria-label="Choose what rides the bar" data-testid="shelf-screen">
      <Head>
        <Title>The shelf</Title>
        <CloseButton type="button" aria-label="Close" onClick={onClose}>
          ✕
        </CloseButton>
      </Head>

      <SectionLabel>On the bar</SectionLabel>
      <SectionNote>
        {GLANCE_ROWS} fit on the bar without pulling down. Everything else
        is one drag away.
      </SectionNote>
      {pinned.slice(0, GLANCE_ROWS).length === 0 ? (
        <SectionNote>Nothing is on your bar.</SectionNote>
      ) : (
        pinned.slice(0, GLANCE_ROWS).map((id) => {
          const row = byId.get(id);
          if (!row) return null;
          return (
            <RowBox key={`bar-${id}`} data-testid={`glance-row-${id}`}>
              <RowText>
                <RowLabel>{row.label}</RowLabel>
                <RowDesc>{row.desc}</RowDesc>
                {row.source === "live" ? null : (
                  <RowReason>{HATCH_COPY[row.source]}</RowReason>
                )}
              </RowText>
              <Actions>
                <Action
                  type="button"
                  data-command={unpinCommand(id)}
                  onClick={() => send(unpinCommand(id))}
                >
                  remove
                </Action>
              </Actions>
            </RowBox>
          );
        })
      )}

      <SectionLabel>Everything the shelf can show</SectionLabel>
      {SHELF_CATALOGUE.map((row) => {
        const isPinned = pinned.includes(row.id);
        return (
          <RowBox key={row.id} data-testid={`catalogue-row-${row.id}`}>
            <RowText>
              <RowLabel>{row.label}</RowLabel>
              <RowDesc>{row.desc}</RowDesc>
              {row.source === "live" ? null : (
                <RowReason>{HATCH_COPY[row.source]}</RowReason>
              )}
            </RowText>
            <Actions>
              {onBar.has(row.id) ? null : (
                // ⭐ `first` on an unpinned row PINS it at the front, so
                // "put this on my bar" stays one tap for a row that is
                // not on the shelf at all.
                <Action
                  type="button"
                  data-command={firstCommand(row.id)}
                  onClick={() => send(firstCommand(row.id))}
                >
                  to bar
                </Action>
              )}
              <Action
                type="button"
                data-command={
                  isPinned ? unpinCommand(row.id) : pinCommand(row.id)
                }
                onClick={() =>
                  send(isPinned ? unpinCommand(row.id) : pinCommand(row.id))
                }
              >
                {isPinned ? "unpin" : "pin"}
              </Action>
            </Actions>
          </RowBox>
        );
      })}
    </Screen>
  );
};
