/**
 * CardSheet — a card at stage on the phone (client-surface W6): a sheet
 * over the stage, the terminal keeping a strip at the bottom so the last
 * lines and the command bar stay where the hands are.
 */

import React from "react";
import styled from "styled-components";
import type { CardState } from "../../store/cardFeedSlice";
import { tokens } from "../ui";

const Sheet = styled.div`
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  background: ${tokens.color.surfaceSunken};
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: ${tokens.space.sm};
`;

const Close = styled.button`
  align-self: flex-end;
  font: inherit;
  min-height: 44px;
  padding: 0 ${tokens.space.md};
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
`;

export function CardSheet({
  card,
  onClose,
  renderCard,
  strip,
}: {
  card: CardState;
  onClose: () => void;
  renderCard: (card: CardState) => React.ReactElement;
  /** The terminal strip and its bar. */
  strip: React.ReactNode;
}): React.ReactElement {
  return (
    <Sheet data-testid="card-sheet">
      <Close type="button" aria-label="back to the terminal" onClick={onClose}>
        done
      </Close>
      <Body>{renderCard(card)}</Body>
      {strip}
    </Sheet>
  );
}
