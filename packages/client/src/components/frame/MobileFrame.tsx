/**
 * `MobileFrame` — the civic top bar on a phone. Two rows, and the
 * inversion of everything `Frame` does.
 *
 *     row 1   [seal] [connection] [identity ▾]        ← never removable
 *     row 2   [ GLANCE-LINE — head of the shelf ] [⌄] ← the grab
 *
 * ## ⭐ Why this is not `Frame` with a media query
 *
 * *A bar that wraps has nowhere to wrap to.* Desktop's shelf grows a
 * second row when you pin too much and the page absorbs it. On a phone
 * every row the chrome takes is a row **the feed loses**, and the feed
 * is the app. So the shelf cannot live in the bar at all: the bar keeps
 * the two fixed facts plus one glance-line of the player's choosing,
 * and the rest arrives on a pull-down. Same catalogue, same order,
 * different disclosure.
 *
 * ## ⭐ The server owns WHAT is shown; the viewport owns HOW it is
 * disclosed
 *
 * `cockpit.shelf` is identical on both form factors — same rows, same
 * order, same verb. Nothing here is a second source of truth, and there
 * is deliberately no `cockpit.formFactor`: the server cannot know a
 * viewport, so a key claiming it would be a fake fact, which is the
 * honesty failure one level up from a fake figure.
 *
 * The glance-line is `shelf.slice(0, GLANCE_ROWS)` — **the head of the
 * one list**, not a second list. Two lists that must agree is the drift
 * this codebase keeps warning about: an unpin that forgot the glance
 * key, a glance row that is not on the shelf, and a `list` that cannot
 * say which is true. Choosing what rides the bar is therefore
 * *reordering*, which is what `cockpit shelf first` exists for.
 *
 * ## What is reused, and what is absent
 *
 * `Seal`, `ConnectionChip` and `AccountMenu` are the SAME components,
 * unchanged — the fixed facts are not mobile copies, and a copy is how
 * two surfaces start disagreeing about one socket. `ViewsMenu` and
 * Settings move into the account dropdown (see `AccountMenu.extras`).
 *
 * ⚠⚠ **There is no notification bell**, and its absence is asserted by
 * name. The reference art puts `◔ 3` in row one and calls it never
 * removable. What belongs in that tray is whatever the receiver *said*
 * they wanted, which wants `NotifyPolicy` read first — and nothing
 * about a smaller screen changes what is behind it. A stub would be an
 * interface promising a model that does not exist, in the scarcest row
 * on the screen. `SocialNotificationsPane` stays reachable from the
 * account menu, so the capability has a home.
 */

import React from "react";
import styled from "styled-components";
import type { LayoutName } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { Figure, tokens } from "../ui";
import { Seal } from "./Seal";
import { ConnectionChip } from "./ConnectionChip";
import { AccountMenu } from "./AccountMenu";
import {
  SHELF_CATALOGUE,
  figureFor,
  pinnedShelf,
  useSelfFigures,
  GLANCE_ROWS,
} from "./Shelf";
import { ViewsMenu } from "../ViewsMenu";
import { ShelfPullDown } from "./ShelfPullDown";
import { DroppedRow } from "./DroppedRow";

const Bar = styled.header`
  display: flex;
  flex-direction: column;
  flex: none;
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  /*
   * ⚠ The safe area is a LAYOUT rule, not a per-component nicety — and
   * it is dead CSS without viewport-fit=cover in index.html, because
   * env() then resolves to 0px and the padding renders faithfully to
   * nothing. The failure is silent, which is why the meta tag is part
   * of this build rather than a detail.
   */
  padding-top: env(safe-area-inset-top, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} ${tokens.space.md};
  min-width: 0;
`;

const FactsRow = styled(Row)`
  /* ⚠ 44px is the tap-target floor, held by min-height so weight comes
     from padding, never by shrinking the box. */
  min-height: 44px;
`;

const GlanceRow = styled(Row)`
  border-top: 1px solid ${tokens.color.borderMuted};
  min-height: 44px;
`;

/**
 * ⚠ The glance-line SCROLLS where desktop's shelf wraps, and that is
 * the one place the two disclosures legitimately differ: wrapping is
 * what a phone cannot afford (a second chrome row costs the feed), and
 * the rows that do not fit are not hidden behind a gesture — they are
 * one tap away in the pull-down, which shows the whole catalogue.
 */
const Glance = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Empty = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  font-style: italic;
`;

const Grab = styled.button`
  flex: none;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgDim};
  font: inherit;
  font-size: ${tokens.font.small};
  cursor: pointer;
`;

const SettingsItem = styled.button`
  text-align: left;
  background: transparent;
  border: none;
  color: ${tokens.color.fg};
  font-family: inherit;
  font-size: ${tokens.font.small};
  padding: ${tokens.space.sm};
  border-radius: ${tokens.radius.sm};
  cursor: pointer;

  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

interface MobileFrameProps {
  /** The active layout (`cockpit.layout`); enables the Views switcher. */
  layout?: LayoutName;
  /** Click-to-send a command (command-bus primacy). */
  onCommandClick?: (command: string) => void;
  /** Hover-preview a command (`null` = stop). Unused on touch; threaded
   *  because `ViewsMenu` takes it and a phone may have a pointer. */
  onCommandPreview?: (command: string | null) => void;
  /** Whether the settings pane is currently open. */
  settingsActive?: boolean;
  /** Toggle the settings pane; absent → the affordance is hidden. */
  onToggleSettings?: () => void;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  layout,
  onCommandClick,
  onCommandPreview,
  settingsActive,
  onToggleSettings,
}) => {
  const clientState = useStore((s) => s.clientState);
  const shelfFigures = useStore((s) => s.shelfFigures);
  const link = useStore((s) => s.connection.link);
  const [pullDownOpen, setPullDownOpen] = React.useState(false);

  /*
   * ⚠⚠ **Without this the glance-line is empty forever.** The figures
   * live in the store, but the `self` subscription that fills them was
   * opened by `Shelf` — which the mobile bar does not render. Shipped
   * broken, green in eleven unit tests (they all seed the store
   * directly), and obvious within ten seconds of opening a phone.
   */
  useSelfFigures();

  const pinned = pinnedShelf(clientState);
  const byId = new Map(SHELF_CATALOGUE.map((r) => [r.id, r]));
  const glance = pinned
    .slice(0, GLANCE_ROWS)
    .map((id) => byId.get(id))
    .filter((r): r is (typeof SHELF_CATALOGUE)[number] => r !== undefined);

  const extras =
    layout && onCommandClick && onCommandPreview ? (
      <>
        <ViewsMenu
          inline
          current={layout}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
        {onToggleSettings ? (
          <SettingsItem
            role="menuitem"
            aria-label="Toggle settings pane"
            onClick={onToggleSettings}
          >
            Settings{settingsActive ? " ✓" : ""}
          </SettingsItem>
        ) : null}
      </>
    ) : onToggleSettings ? (
      <SettingsItem
        role="menuitem"
        aria-label="Toggle settings pane"
        onClick={onToggleSettings}
      >
        Settings{settingsActive ? " ✓" : ""}
      </SettingsItem>
    ) : null;

  return (
    <Bar data-testid="mobile-bar">
      {/*
       * ⭐ A dropped socket claims the ENTIRE first row. On a phone you
       * are usually not looking, so the bar must not understate it —
       * and the fixed facts are what a dead link makes meaningless
       * anyway. The glance-line below stays, hatched by its own
       * figures going stale, because a shelf that vanished on a blip
       * would reflow the whole bar every time a train went into a
       * tunnel.
       */}
      {link === "connected" ? (
        <FactsRow data-testid="mobile-facts-row">
          <Seal size={20} title="Saxonberg" />
          <ConnectionChip />
          <AccountMenu {...(extras ? { extras } : {})} />
        </FactsRow>
      ) : (
        <DroppedRow />
      )}
      <GlanceRow data-testid="mobile-glance-row">
        <Glance data-testid="glance-line">
          {glance.length === 0 ? (
            // ⚠ The empty shelf is a state a player can actually reach
            // (`cockpit shelf unpin` each row), so it says so rather
            // than rendering an unexplained gap.
            <Empty>nothing pinned</Empty>
          ) : (
            glance.map((row) => (
              <Figure
                key={row.id}
                variant="chip"
                label={row.label}
                figure={figureFor(row, shelfFigures)}
              />
            ))
          )}
        </Glance>
        <Grab
          type="button"
          aria-label="Open the shelf"
          aria-expanded={pullDownOpen}
          data-testid="shelf-grab"
          onClick={() => setPullDownOpen((v) => !v)}
        >
          {pullDownOpen ? "⌃" : "⌄"}
        </Grab>
      </GlanceRow>
      {pullDownOpen ? (
        <ShelfPullDown
          onClose={() => setPullDownOpen(false)}
          {...(onCommandClick ? { onCommandClick } : {})}
        />
      ) : null}
    </Bar>
  );
};
