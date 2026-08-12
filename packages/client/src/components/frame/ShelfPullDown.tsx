/**
 * `ShelfPullDown` — the shelf, disclosed.
 *
 * ⭐ **Same catalogue, same order, different disclosure.** Desktop's
 * shelf lives inline in the bar and wraps; a phone's cannot, because
 * every chrome row costs the feed a row. So the rows that do not fit on
 * the glance-line are not *hidden* — they are one tap away, here, where
 * a phone can afford height and never width. Hence **two-up** with the
 * `card` variant: the pull-down is where a widget gets big enough to
 * read, and `chip` exists for the bar strip.
 *
 * ⚠ It **overlays** the feed rather than displacing it. Pushing the
 * transcript down would make opening the shelf reflow everything the
 * player was reading — and closing it would scroll them somewhere they
 * did not ask to be.
 *
 * ⚠ Every row is rendered through `Figure`, hatch reasons included, and
 * the catalogue + reasons are IMPORTED from `Shelf.tsx` rather than
 * restated. Two copies of the hatch reasons is precisely the decay the
 * three-category table exists to prevent — the second copy is where a
 * reason gets softened into a generic "not wired" by whoever is in a
 * hurry.
 *
 * The pull-down shows the SHELF (what you pinned). Choosing what is on
 * it is `ShelfScreen`, one affordance away — a separate surface because
 * reading your figures and editing which figures you have are different
 * intentions, and mixing them puts destructive affordances under a
 * thumb that came here to read a number.
 */

import React from "react";
import styled from "styled-components";
import type { ShelfRowId } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { Figure, tokens } from "../ui";
import {
  SHELF_CATALOGUE,
  figureFor,
  pinnedShelf,
  type ShelfRow,
} from "./Shelf";
import { ShelfScreen } from "./ShelfScreen";

const Sheet = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  z-index: 40;
  max-height: 70vh;
  overflow-y: auto;
  /* ⚠ Never sideways. A pull-down that scrolls the page horizontally is
     the add-widget menu's failure with a bigger surface. */
  overflow-x: hidden;
  background: ${tokens.color.surfaceAlt};
  border-bottom: 1px solid ${tokens.color.border};
  box-shadow: 0 4px 12px ${tokens.color.shadow};
  padding: ${tokens.space.md};
  padding-bottom: calc(${tokens.space.md} + env(safe-area-inset-bottom, 0px));
`;

const Anchor = styled.div`
  position: relative;
`;

const Grid = styled.div`
  display: grid;
  /* Two-up: a phone can afford height here and never width. */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${tokens.space.sm};
`;

const Cell = styled.div`
  min-width: 0;
`;

const Empty = styled.p`
  margin: 0 0 ${tokens.space.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  line-height: 1.4;
`;

const Footer = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  margin-top: ${tokens.space.md};
`;

const FooterButton = styled.button`
  flex: 1;
  min-height: 44px;
  background: transparent;
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgEmphasis};
  font: inherit;
  font-size: ${tokens.font.small};
  cursor: pointer;
`;

interface ShelfPullDownProps {
  /** Close the pull-down (the grab toggles it too). */
  onClose: () => void;
  /** Click-to-send a command (command-bus primacy). */
  onCommandClick?: (command: string) => void;
}

export const ShelfPullDown: React.FC<ShelfPullDownProps> = ({
  onClose,
  onCommandClick,
}) => {
  const clientState = useStore((s) => s.clientState);
  const shelfFigures = useStore((s) => s.shelfFigures);
  const [choosing, setChoosing] = React.useState(false);

  // One list, read the same way everywhere.
  const pinned: ShelfRowId[] = pinnedShelf(clientState);
  const byId = new Map(SHELF_CATALOGUE.map((r) => [r.id, r]));
  const rows = pinned
    .map((id) => byId.get(id))
    .filter((r): r is ShelfRow => r !== undefined);

  return (
    <Anchor>
      <Sheet role="region" aria-label="The shelf" data-testid="shelf-pulldown">
        {rows.length === 0 ? (
          <Empty>
            Nothing is on your shelf. Everything the shelf can show is one
            tap away below.
          </Empty>
        ) : (
          <Grid data-testid="pulldown-grid">
            {rows.map((row) => (
              <Cell key={row.id}>
                <Figure
                  variant="card"
                  label={row.label}
                  figure={figureFor(row, shelfFigures)}
                />
              </Cell>
            ))}
          </Grid>
        )}
        <Footer>
          <FooterButton
            type="button"
            data-testid="open-shelf-screen"
            onClick={() => setChoosing(true)}
          >
            Choose what rides the bar
          </FooterButton>
          <FooterButton type="button" onClick={onClose}>
            Close
          </FooterButton>
        </Footer>
      </Sheet>
      {choosing ? (
        <ShelfScreen
          onClose={() => setChoosing(false)}
          {...(onCommandClick ? { onCommandClick } : {})}
        />
      ) : null}
    </Anchor>
  );
};
