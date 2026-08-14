/**
 * WorldLayout — the classic terminal cockpit (the default layout).
 *
 * The single-terminal arrangement: a tabbed-filter strip + the scrollback
 * Terminal + its command bar in the primary column, with a view-sensitive
 * right column as the side rail. A small pane switch chooses the right
 * column's pane — Inspection (the focused-object detail) or Who's Online
 * (the live roster). This is the "Single + fixed rail" canonical split.
 */

import React, { useState } from "react";
import styled from "styled-components";
import { useStore } from "../store/index";
import type { LayoutProps } from "./types";
import { Cockpit, LeftColumn, tokens } from "./primitives";
import { useIsCompact } from "../lib/style/useIsCompact";
import { TabStrip } from "../components/TabStrip";
import { FeedSwitcher } from "../components/routing/FeedSwitcher";
import { RoutingTable } from "../components/routing/RoutingTable";
import { Terminal } from "../components/Terminal";
import { FilterDrawer } from "../components/FilterDrawer";
import { CommandBar } from "../components/CommandBar";
import { PaneFeed } from "../components/panes/PaneFeed";
import { RadialOverlay } from "../components/panes/RadialOverlay";
import { WhoPane } from "../components/WhoPane";
import { NewsTickerPane } from "../components/NewsTickerPane";
import { WikiPane } from "../components/WikiPane";

/**
 * The view-sensitive right column — a small pane switch above the active
 * cockpit pane (Inspection | Who's Online | News | Wiki). Sizes to the
 * pane child (each
 * declares its own fixed width); `PaneSlot` is `flex: 1` so the pane's
 * `height: 100%` resolves against the space below the switch.
 */
const RightColumn = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 0;

  /*
   * ⭐ **The rail stops being a fixed column on a phone.**
   *
   * Each pane declares its own fixed 360px width/min-width/max-width,
   * so beside a terminal the in-world document computed ~698px at a
   * 390px viewport. Under the mobile viewport model an overflowing
   * document WIDENS the initial containing block, which is what
   * position:fixed resolves against — so the shell's own fixed
   * surfaces (the shelf screen, the command sheet) rendered off-screen
   * and unreachable. The arrival path terminates here, and an arrival
   * that delivers you somewhere broken has not arrived.
   *
   * ⚠ This is the COLLAPSE and nothing more. Redesigning the play
   * surface for a phone — what the panes should be, whether they
   * belong inline in the feed — is Wave 4's, and this must not
   * pre-empt it.
   *
   * ⚠ the !important below because the panes set their own width at equal
   * specificity and the injection order between styled-components
   * classes is not a contract. Narrowly scoped to the pane slot's
   * direct child so nothing else inherits it.
   */
  ${(p) =>
    p.$compact
      ? `
    width: 100%;
    max-width: 100%;
  `
      : ""}
`;

const PaneSwitch = styled.div`
  display: flex;
  gap: 0.25rem;
  width: 100%;
  box-sizing: border-box;
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-left: 1px solid ${tokens.color.border};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceAlt};
`;

const PaneSlot = styled.div<{ $compact?: boolean }>`
  flex: 1;
  min-height: 0;
  display: flex;

  ${(p) =>
    p.$compact
      ? `
    & > * {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
  `
      : ""}
`;

/** The routing table's slide-out, mirroring the filter drawer's shell. */
const RoutingDrawer = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 24rem;
  max-width: 100%;
  background: ${tokens.color.surface};
  border-left: 1px solid ${tokens.color.borderEmphasis};
  overflow-y: auto;
  z-index: 40;
`;

const RoutingClose = styled.button`
  position: absolute;
  top: ${tokens.space.md};
  right: ${tokens.space.md};
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.title};
  cursor: pointer;
  min-height: 44px;
`;

const RoutingToggle = styled.button`
  align-self: flex-start;
  font: inherit;
  font-size: ${tokens.font.label};
  cursor: pointer;
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
  padding: 0 ${tokens.space.md};
  min-height: 44px;

  &:hover {
    color: ${tokens.color.fg};
  }
`;

const PaneTab = styled.button<{ $active: boolean }>`
  background: ${(p) => (p.$active ? tokens.color.surfaceAlt : "transparent")};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  padding: 0.15rem 0.6rem;
  font: inherit;
`;

export const WorldLayout: React.FC<LayoutProps> = ({
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandPreview,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [routingOpen, setRoutingOpen] = useState(false);
  const rightPane = useStore((s) => s.rightPane);
  const activeFeed = useStore((s) => s.activeFeed);
  const setActiveFeed = useStore((s) => s.setActiveFeed);
  // ⚠ The UNFILTERED buffer. Every count in the feed switcher is
  // derived from the frames it names, and naming them from an
  // already-filtered list would make `World 1077` report how many the
  // current tab happens to show rather than how many landed there.
  const allFrames = useStore((s) => s.frames);
  const setRightPane = useStore((s) => s.setRightPane);
  // ⚠ Subscribes to `matchMedia` — dragging a desktop window narrow is
  // the cheapest way anyone will test this, and a one-shot read would
  // make exactly that not work.
  const isCompact = useIsCompact();

  return (
    <Cockpit style={isCompact ? { flexDirection: "column" } : undefined}>
      <LeftColumn>
        {/*
          ⭐ Two strips, two questions. The FEED switcher is WHERE the
          server routed a frame — independent destinations you switch
          between. The tab strip below it is a saved filter set WITHIN
          the feed you are in. Collapsing them would make "show me only
          direct messages" and "show me the Attention feed" the same
          control, and they are not: one is a predicate you tune, the
          other is a place a rule sent something.
        */}
        <FeedSwitcher
          frames={allFrames}
          active={activeFeed}
          onSelect={setActiveFeed}
        />
        <TabStrip onToggleDrawer={() => setDrawerOpen((v) => !v)} />
        <Terminal
          frames={frames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
        {drawerOpen && <FilterDrawer onClose={() => setDrawerOpen(false)} />}
        {routingOpen && (
          <RoutingDrawer>
            <RoutingClose
              aria-label="close routing"
              onClick={() => setRoutingOpen(false)}
            >
              ×
            </RoutingClose>
            <RoutingTable frames={allFrames} />
          </RoutingDrawer>
        )}
        <RoutingToggle
          aria-label="routing"
          onClick={() => setRoutingOpen((v) => !v)}
        >
          routing
        </RoutingToggle>
        <CommandBar
          barId="world"
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
        />
      </LeftColumn>
      {/*
       * ⚠⚠ **The right-column panes dispatch through `onCommandClick`,
       * not `onSendCommand`, and the distinction is not cosmetic.**
       *
       * Every call these four panes make is a CLICK ON A CONTROL — a
       * breadcrumb, a refresh, a content row, an exit. That is an
       * affordance, and affordances are what the command sheet
       * intercepts on a phone. Wired to `onSendCommand` they bypassed
       * it entirely: tapping `north` in the transcript opened a sheet
       * naming the command, tapping the identical `north` in the
       * inspection pane six inches away sent it instantly. Two rules on
       * one screen, which is worse than either rule alone — and exactly
       * the unpredictability the no-exceptions sheet policy exists to
       * avoid.
       *
       * ⚠ `onSendCommand` stays raw for `CommandBar`, correctly: TYPED
       * input is not an affordance and must never be confirmed.
       *
       * Found by driving; every unit and e2e assertion about the sheet
       * happened to pick a transcript or menu affordance, so the gap
       * was invisible to the suite.
       */}
      <RightColumn $compact={isCompact}>
        <PaneSwitch>
          <PaneTab
            $active={rightPane === "inspect"}
            onClick={() => setRightPane("inspect")}
          >
            Inspect
          </PaneTab>
          <PaneTab
            $active={rightPane === "who"}
            onClick={() => setRightPane("who")}
          >
            Who&apos;s Online
          </PaneTab>
          <PaneTab
            $active={rightPane === "news"}
            onClick={() => setRightPane("news")}
          >
            News
          </PaneTab>
          <PaneTab
            $active={rightPane === "wiki"}
            onClick={() => setRightPane("wiki")}
          >
            Wiki
          </PaneTab>
        </PaneSwitch>
        <PaneSlot $compact={isCompact}>
          {rightPane === "who" ? (
            <WhoPane
              onSendCommand={onCommandClick}
              onCommandPreview={onCommandPreview}
            />
          ) : rightPane === "news" ? (
            <NewsTickerPane
              onSendCommand={onCommandClick}
              onCommandPreview={onCommandPreview}
            />
          ) : rightPane === "wiki" ? (
            <WikiPane
              onSendCommand={onCommandClick}
              onCommandPreview={onCommandPreview}
            />
          ) : (
            /*
             * ⭐⭐ **The one focus slot is now a FEED.** N cards, each
             * held open by a server-side condition rather than by
             * recency, each naming which condition holds it. The
             * inspection pane did not go away — it is the `inspect`
             * card's body, at the foot of the feed, still owning its
             * own breadcrumb and paint/clear policy.
             */
            <PaneFeed
              onSendCommand={onCommandClick}
              onCommandPreview={onCommandPreview}
              compact={isCompact}
            />
          )}
        </PaneSlot>
      </RightColumn>
      {/*
        ⭐ Mounted once, at the layout, so the gesture on `EntityName`
        works on every named thing in the cockpit rather than on the
        surfaces that remembered to thread a callback.
      */}
      <RadialOverlay
        onSendCommand={onCommandClick}
        onCommandPreview={onCommandPreview}
      />
    </Cockpit>
  );
};
