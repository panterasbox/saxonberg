/**
 * WorldLayout — the classic terminal cockpit (the default layout).
 *
 * The single-terminal arrangement: a tabbed-filter strip + the scrollback
 * Terminal + its command bar in the primary column, with the **card
 * feed** as the side rail. This is the "Single + fixed rail" canonical
 * split.
 *
 * ⭐⭐ **The switcher is gone.** `Inspect · Who's Online · News · Wiki`
 * was four hand-written client surfaces with their own data paths in a
 * tab strip, and it existed *because* the only way a card could be born
 * was a focus change — none of the other three is one. A command opens
 * a card now, so the constraint that produced the switcher is gone and
 * with it the switcher's only justification. The right column renders
 * the feed and nothing else.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../store/index";
import {
  ensureSeededViews,
  setActiveFacetFilter,
} from "../store/consoleActions";
import type { LayoutProps } from "./types";
import { Cockpit, LeftColumn, tokens } from "./primitives";
import { useIsCompact } from "../lib/style/useIsCompact";
import { TabStrip } from "../components/TabStrip";
import { FilterDrawer } from "../components/FilterDrawer";
import { Terminal } from "../components/Terminal";
import { CommandBar } from "../components/CommandBar";
import { PromptStrip } from "../components/PromptStrip";
import { CardFeed } from "../components/cards/CardFeed";
import { RadialOverlay } from "../components/cards/RadialOverlay";
import {
  InlineCard,
  PinnedChipRow,
} from "../components/cards/MobilePlaySurface";

/**
 * The right column — the card feed, and nothing else. Sizes to the feed
 * (which declares its own fixed width on a desktop rail).
 */
const RightColumn = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 0;

  /*
   * ⭐ **The rail stops being a fixed column on a phone.**
   *
   * Each card declares its own fixed 360px width/min-width/max-width,
   * so beside a terminal the in-world document computed ~698px at a
   * 390px viewport. Under the mobile viewport model an overflowing
   * document WIDENS the initial containing block, which is what
   * position:fixed resolves against — so the shell's own fixed
   * surfaces (the shelf screen, the command sheet) rendered off-screen
   * and unreachable. The arrival path terminates here, and an arrival
   * that delivers you somewhere broken has not arrived.
   *
   * ⚠ This is the COLLAPSE and nothing more. Redesigning the play
   * surface for a phone — what the cards should be, whether they
   * belong inline in the feed — is Wave 4's, and this must not
   * pre-empt it.
   *
   * ⚠ the !important below because the cards set their own width at equal
   * specificity and the injection order between styled-components
   * classes is not a contract. Narrowly scoped to the card slot's
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

/** The count-vs-body reconciler. Only ever on screen when they differ. */
const FilteredNotice = styled.div`
  flex: none;
  padding: ${tokens.space.sm} ${tokens.space.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  max-width: 100%;
`;

/**
 * ⚠ Not a command preview, because changing a tab's facet predicate is
 * not a command — it is a saved viewport setting, the same line
 * `open <feed>` and the tab strip already sit on.
 */
const FilterLink = styled.button`
  font: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  color: ${tokens.color.fgEmphasis};
  text-decoration: underline;
`;

/** The inline card stack, between the transcript and the command bar. */
const InlineStack = styled.div`
  flex: none;
  max-height: 45vh;
  overflow-y: auto;
  max-width: 100%;
  padding: 0 ${tokens.space.md};
`;

export const WorldLayout: React.FC<LayoutProps> = ({
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandSend,
  onCommandPreview,
}) => {
  /*
   * ⚠⚠ **The card wiring is NOT here any more — it is in `App`.**
   *
   * It sat here because this layout renders at both form factors, which
   * fixed the phone. It did not fix `build`, `chat` or `watch`, whose
   * layouts are different components entirely — and Wave 7 puts the
   * authoring cards in `build`. So the hook moved up one more level, to
   * the one place that renders above the mode registry. Third
   * occurrence of the wiring-at-the-layout bug; this is the position
   * that has no fourth.
   */
  /*
   * ⭐ The view editor. Opened by `+` (which has just created and
   * activated the view) and by the `⋯` on your own active view — never
   * by a bare gear that edits "whichever tab happens to be selected",
   * which was the version nobody could explain to themselves.
   */
  const [viewEditorOpen, setViewEditorOpen] = React.useState(false);
  /*
   * ⚠⚠ Seeding waits for client state to actually ARRIVE.
   *
   * It ran on mount alone, and `App` renders this layout on its
   * `default:` branch — so it could fire before the connection payload
   * landed, read "no tabs", and write the ship defaults over the
   * player's saved views. Keyed on the value being present, the effect
   * re-runs when it lands and seeds additively then.
   */
  const tabsLoaded = useStore((s) =>
    Array.isArray(s.clientState["console.tabs"]),
  );
  React.useEffect(() => {
    if (tabsLoaded) ensureSeededViews();
  }, [tabsLoaded]);
  // ⚠ The UNFILTERED buffer. Every count in the feed switcher is
  // derived from the frames it names, and naming them from an
  // already-filtered list would make `World 1077` report how many the
  // current tab happens to show rather than how many landed there.
  const allFrames = useStore((s) => s.frames);
  const cards = useStore((s) => s.cards);
  // ⚠ Subscribes to `matchMedia` — dragging a desktop window narrow is
  // the cheapest way anyone will test this, and a one-shot read would
  // make exactly that not work.
  const isCompact = useIsCompact();
  // Newest last, so a card sits AFTER the frames that caused it.
  const inlineCards = React.useMemo(
    () => Object.values(cards).sort((a, b) => a.openedAt - b.openedAt),
    [cards],
  );
  /*
   * The whole buffer — the denominator the reconciler quotes. Every
   * tab is a view over exactly these frames now, so "N in the buffer"
   * is the honest number: there is no second place a frame could be.
   */
  const hiddenHere = allFrames.length;
  const activeTabName = useStore(
    (s) => (s.clientState["console.activeTab"] as string | undefined) ?? "All",
  );

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
        {/*
          ⭐⭐ **One strip, and every tab is a VIEW over the whole
          buffer** — not a destination a rule moved something into.

          There used to be a second strip of routed feeds
          (`World | Attention | Channels | Diag`) above this one, and it
          was the same act performed by a second control: both
          partitioned the same scrollback into exclusive things you
          switch between. Two properties settled it, and neither was
          patchable inside the destination model:

          - the routing stamp was applied at DELIVERY, so changing a
            rule never re-sorted your history; and
          - the frame store does not persist the stamp, so on reconnect
            every backfilled frame landed in `world` regardless. Live,
            that read `World 244 · Attention 1 · Channels 0` — the
            non-World counts were only what had arrived since the socket
            opened. Your dm history was not in Attention.

          A predicate has neither problem: it is recomputed over the
          buffer every render, so it is retroactive by construction and
          survives backfill for free. MOVE/COPY disappears with the
          buckets — a frame is simply in every view whose predicate it
          satisfies, which is what COPY was straining to fake.
        */}
        <TabStrip
          presetsOnly
          onToggleDrawer={() => setViewEditorOpen((v) => !v)}
        />
        <Terminal
          frames={frames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
          onCommandSend={onCommandSend}
        />
        {/*
          ⚠⚠ **The count and the body have to agree, or say why not.**

          Found by driving: the switcher read `Diag 10`, the Diag feed
          rendered NOTHING, and there was no third thing on screen to
          reconcile them. Each half is right on its own — the count is
          over the FEED (naming it from an already-filtered list would
          make `World 1077` report the tab), and the body also applies
          the tab's standing facet predicate. Together they are a lie of
          exactly the kind an unwired figure is: a number promising
          content that is not there.

          So the third thing exists. It appears only in the disagreeing
          case, states both numbers, and names the filter doing it.
        */}
        {frames.length === 0 && hiddenHere > 0 && (
          <FilteredNotice data-testid="all-filtered-notice">
            {hiddenHere} in the buffer, all hidden by{" "}
            <strong>{activeTabName}</strong>.{" "}
            {/*
              ⚠ It offers the WAY OUT, and the way out has to be one
              that always exists. Naming a specific view would assume a
              view the player may have deleted — every view is theirs to
              remove. Clearing THIS view's filter is always available
              and always works.
            */}
            <FilterLink
              aria-label="clear this view's filter"
              onClick={() => setActiveFacetFilter({})}
            >
              clear it
            </FilterLink>
          </FilteredNotice>
        )}
        {viewEditorOpen && (
          <FilterDrawer onClose={() => setViewEditorOpen(false)} />
        )}
        {/*
          ⭐⭐ **On a phone the cards come INLINE.** Interleave what is
          causally related, switch what is independent: a card is caused
          by what you just did, so it belongs where that happened — not
          in a second column, and not in a drawer you forget exists.
        */}
        {isCompact && (
          <InlineStack data-testid="inline-card-stack">
            {inlineCards.map((card) => (
              <InlineCard
                key={card.instanceId}
                card={card}
                onSendCommand={onCommandClick}
                onCommandPreview={onCommandPreview}
              />
            ))}
          </InlineStack>
        )}
        {isCompact && <PinnedChipRow onSendCommand={onCommandClick} />}
        {/*
          ⭐ One slot, three occupants — in the order they sit on
          screen. Everything WAITING is above the input; the format bar
          describes what the slot shows at rest; the input itself holds
          the foreground prompt when there is one.
        */}
        <PromptStrip
          onCancelPrompt={onCancelPrompt}
          onSendCommand={onCommandClick}
          onCommandPreview={onCommandPreview}
          compact={isCompact}
        />

        <CommandBar
          barId="world"
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
        />
      </LeftColumn>
      {/*
       * ⚠⚠ **The right-column cards dispatch through `onCommandClick`,
       * not `onSendCommand`, and the distinction is not cosmetic.**
       *
       * Every call these four cards make is a CLICK ON A CONTROL — a
       * breadcrumb, a refresh, a content row, an exit. That is an
       * affordance, and affordances are what the command sheet
       * intercepts on a phone. Wired to `onSendCommand` they bypassed
       * it entirely: tapping `north` in the transcript opened a sheet
       * naming the command, tapping the identical `north` in the
       * inspection card six inches away sent it instantly. Two rules on
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
      {/*
        ⚠ The rail is ABSENT on a phone, not collapsed to full width.
        A collapsed rail is a second screenful the player has to scroll
        past to reach their own input — and the cards it held are now
        inline in the feed above, so keeping it would show every card
        twice.
      */}
      {!isCompact && (
      <RightColumn $compact={isCompact}>
        {/*
          ⭐⭐ **One slot became a FEED, and then the switcher went
          too.** N cards, each opened by a command, each ageing out of
          one server-owned relevance window unless the player pins it.
          `who` / `news` / `wiki` are catalogue rows in this feed now —
          their row-rendering knowledge was salvaged into `CardBodies`;
          what died is the pane shell, its 360px chrome, its own data
          path and its tab.
        */}
        <CardFeed
          onSendCommand={onCommandClick}
          onCommandPreview={onCommandPreview}
          compact={isCompact}
        />
      </RightColumn>
      )}
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
