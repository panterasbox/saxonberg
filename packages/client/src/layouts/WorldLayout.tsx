/**
 * WorldLayout — the classic terminal cockpit (the default layout).
 *
 * The single-terminal arrangement: a tabbed-filter strip + the scrollback
 * Terminal + its command bar in the primary column, with a view-sensitive
 * right column as the side rail. A small card switch chooses the right
 * column's card — Inspection (the focused-object detail) or Who's Online
 * (the live roster). This is the "Single + fixed rail" canonical split.
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
import { useCardFeed } from "../components/cards/useCardFeed";
import { useInspectionSubscriptions } from "../components/InspectionCard";
import { RadialOverlay } from "../components/cards/RadialOverlay";
import {
  InlineCard,
  PinnedChipRow,
} from "../components/cards/MobilePlaySurface";
import { WhoCard } from "../components/WhoCard";
import { NewsTickerCard } from "../components/NewsTickerCard";
import { WikiCard } from "../components/WikiCard";

/**
 * The view-sensitive right column — a small card switch above the active
 * cockpit card (Inspection | Who's Online | News | Wiki). Sizes to the
 * card child (each
 * declares its own fixed width); `CardSlot` is `flex: 1` so the card's
 * `height: 100%` resolves against the space below the switch.
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

const CardSwitch = styled.div`
  display: flex;
  gap: 0.25rem;
  width: 100%;
  box-sizing: border-box;
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-left: 1px solid ${tokens.color.border};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceAlt};
`;

const CardSlot = styled.div<{ $compact?: boolean }>`
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

const CardTab = styled.button<{ $active: boolean }>`
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
  onCommandSend,
  onCommandPreview,
}) => {
  /*
   * ⚠⚠ **Here, not in `CardFeed`.** This hook opens the `place`
   * subscription and registers the three subscription handlers, and it
   * has to run at BOTH form factors — `CardFeed` is the desktop right
   * column, so hanging the wiring off it left the phone with a card
   * store nothing ever wrote to. Cards the server pushed for a saved
   * arrangement were discarded, and a card the radial opened stayed
   * empty forever.
   */
  useCardFeed();
  /*
   * ⚠⚠ Here for the same reason `useCardFeed` is, and it has been the
   * same mistake twice. This hook keeps `cardLastResult` pointed at
   * what the player is looking at — the ATTENTION SIGNAL every card is
   * minted from. Hung off `CardFeed` (the desktop-only right column) it
   * meant a phone never got a focus result, so it never opened a card
   * at all: the feed was not broken, it was never fed.
   */
  useInspectionSubscriptions();
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
  const rightCard = useStore((s) => s.rightCard);
  // ⚠ The UNFILTERED buffer. Every count in the feed switcher is
  // derived from the frames it names, and naming them from an
  // already-filtered list would make `World 1077` report how many the
  // current tab happens to show rather than how many landed there.
  const allFrames = useStore((s) => s.frames);
  const cards = useStore((s) => s.cards);
  const setRightCard = useStore((s) => s.setRightCard);
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
                key={card.subscriptionId}
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
        <CardSwitch>
          <CardTab
            $active={rightCard === "inspect"}
            onClick={() => setRightCard("inspect")}
          >
            Inspect
          </CardTab>
          <CardTab
            $active={rightCard === "who"}
            onClick={() => setRightCard("who")}
          >
            Who&apos;s Online
          </CardTab>
          <CardTab
            $active={rightCard === "news"}
            onClick={() => setRightCard("news")}
          >
            News
          </CardTab>
          <CardTab
            $active={rightCard === "wiki"}
            onClick={() => setRightCard("wiki")}
          >
            Wiki
          </CardTab>
        </CardSwitch>
        <CardSlot $compact={isCompact}>
          {rightCard === "who" ? (
            <WhoCard
              onSendCommand={onCommandClick}
              onCommandPreview={onCommandPreview}
            />
          ) : rightCard === "news" ? (
            <NewsTickerCard
              onSendCommand={onCommandClick}
              onCommandPreview={onCommandPreview}
            />
          ) : rightCard === "wiki" ? (
            <WikiCard
              onSendCommand={onCommandClick}
              onCommandPreview={onCommandPreview}
            />
          ) : (
            /*
             * ⭐⭐ **The one focus slot is now a FEED.** N cards, each
             * held open by a server-side condition rather than by
             * recency, each naming which condition holds it. The
             * inspection card did not go away — it is the `inspect`
             * card's body, at the foot of the feed, still owning its
             * own breadcrumb and paint/clear policy.
             */
            <CardFeed
              onSendCommand={onCommandClick}
              onCommandPreview={onCommandPreview}
              compact={isCompact}
            />
          )}
        </CardSlot>
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
