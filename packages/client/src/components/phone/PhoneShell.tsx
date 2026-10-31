/**
 * PhoneShell — the phone (client-surface W6): chat first.
 *
 * ⭐ Phones are one unit wide, so the classes collapse to three: LINE
 * (chips), UNIT (a card inline, cut) and STAGE (a card as a sheet, the
 * terminal keeping a strip). *Interleave what is causally related, switch
 * what is independent.*
 *
 * - **Chat is the default** when no mode is stored — a client rule, since
 *   only the client knows it is on a phone. One terminal, filtered to the
 *   chat view or the channel; swipe right for the channels (and the tray),
 *   left for who is here; mode tabs along the bottom, hidden while typing.
 * - **No button bar in chat**: a target chip in the bar ("say ▾"), a
 *   suggestion strip while typing (@names, emotes, #channels), a reply
 *   chip, and a long press on a line for react · reply · tell · look,
 *   each showing its command.
 * - **Explore gets a button bar**: the exits first, the top things this
 *   place affords, "⋯" for the rest, with the placed-card chips above.
 * - **Watch**: the video above the game terminal; stream chat a swipe away.
 * - Cards appear INLINE under the terminal; a tap opens one as a sheet.
 * - There is no status bar; the tray lives in the left drawer.
 */

import React from "react";
import styled from "styled-components";
import type { CockpitMode, ConsoleTab, WatchTarget } from "@saxonberg/types";
import { useStore } from "../../store/index";
import type { Frame } from "../../store/index";
import type { CardState } from "../../store/cardFeedSlice";
import { visibleCards } from "../../store/cardFeedSlice";
import { activeCardKinds } from "../../store/cardViewActions";
import { framesFor } from "../../store/frameFilter";
import type { LayoutProps } from "../../layouts/types";
import { tokens } from "../ui";
import { Terminal } from "../Terminal";
import { CommandBar } from "../CommandBar";
import { PromptStrip } from "../PromptStrip";
import { Card } from "../cards/Card";
import { CardBody } from "../cards/CardBodies";
import { InlineCard, PinnedChipRow } from "../cards/MobilePlaySurface";
import { RadialOverlay } from "../cards/RadialOverlay";
import { useTerminalFrames } from "../cards/TerminalCardBody";
import { EmoteSheet } from "../social/EmoteSheet";
import { SubjectRail } from "../social/SubjectRail";
import { StreamEmbed } from "../embed/StreamEmbed";
import { ModeTabs } from "./ModeTabs";
import { PhoneDrawer } from "./PhoneDrawer";
import { LinePressMenu } from "./LinePressMenu";
import { ButtonBar } from "./ButtonBar";
import { CardSheet } from "./CardSheet";
import { TargetChip } from "./TargetChip";

const Root = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  max-width: 100vw;
  overflow-x: hidden;
`;

const DrawerButtons = styled.div`
  flex: none;
  display: flex;
  justify-content: space-between;
  padding: 0 ${tokens.space.sm};
`;

const DrawerButton = styled.button`
  font: inherit;
  font-size: ${tokens.font.small};
  min-height: 36px;
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
`;

const InlineStack = styled.div`
  flex: none;
  max-height: 40vh;
  overflow-y: auto;
  padding: 0 ${tokens.space.md};
`;

const Video = styled.div`
  flex: none;
  aspect-ratio: 16 / 9;
  max-height: 35vh;
  background: ${tokens.color.surfaceSunken};
`;

const ReplyChip = styled.div`
  flex: none;
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} ${tokens.space.md};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const TrayItem = styled.button`
  display: block;
  width: 100%;
  font: inherit;
  text-align: left;
  min-height: 44px;
  margin-top: ${tokens.space.xs};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
`;

const DrawerLabel = styled.div`
  margin-top: ${tokens.space.md};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.sectionLabel};
`;

/** A horizontal swipe of at least this many px opens a drawer. */
const SWIPE_PX = 60;

export interface PhoneShellProps extends LayoutProps {
  /** The stored mode, or null when the player never chose one. */
  storedMode: CockpitMode | null;
}

export function PhoneShell(props: PhoneShellProps): React.ReactElement {
  const {
    frames,
    onSendCommand,
    onSendPromptResponse,
    onCancelPrompt,
    onCommandClick,
    onCommandPreview,
    onCommandSend,
    resultDisplay = "card",
    storedMode,
  } = props;
  // ⭐ Chat first: the phone's default when nothing is stored.
  const mode: CockpitMode = storedMode ?? "chat";
  const cards = useStore((s) => s.cards);
  const tabs = useStore((s) => (s.clientState["console.tabs"] as ConsoleTab[] | undefined) ?? []);
  const describe = useStore((s) => s.getTopicDescriptor);
  const watchTarget = useStore((s) => (s.clientState["cockpit.watch"] as WatchTarget | null) ?? null);
  const kinds = activeCardKinds();
  const [drawer, setDrawer] = React.useState<"left" | "right" | null>(null);
  const [typing, setTyping] = React.useState(false);
  const [lineMenu, setLineMenu] = React.useState<Frame | null>(null);
  const [reactTo, setReactTo] = React.useState<Frame | null>(null);
  const [seed, setSeed] = React.useState<{ text: string; nonce: number } | undefined>();
  const [sheet, setSheet] = React.useState<string | null>(null);
  const touchX = React.useRef<number | null>(null);

  const live = Object.values(cards).filter((c) => !c.closed);
  const primary = live.find((c) => c.cardId === "terminal" && c.role === "primary");
  const primaryPayload = primary?.payload?.kind === "terminal" ? primary.payload : undefined;
  const terminalFrames = useTerminalFrames(primaryPayload, resultDisplay);
  // The chat default with no server mode: the chat view, client-side.
  const chatDefault = React.useMemo(
    () =>
      framesFor(useStore.getState().frames, { view: "Chat" }, {
        tabs,
        describe,
        resultDisplay,
        cards,
        kinds,
        alwaysAggregate: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frames, tabs, describe, resultDisplay, cards, kinds],
  );
  const shown: Frame[] =
    storedMode === null ? chatDefault : primaryPayload ? terminalFrames : frames;
  const barId = primaryPayload?.barId ?? "phone";
  const channel = primaryPayload?.filter.channel;

  const inline = React.useMemo(
    () =>
      visibleCards(cards, { resultDisplay, kinds }).sort((a, b) => a.openedAt - b.openedAt),
    [cards, resultDisplay, kinds],
  );
  const sheetCard = sheet ? cards[sheet] : undefined;
  const here = live.find((c) => c.role === "here");
  const tray = live.filter((c) => c.minimized);

  // Suggestions while typing: @names, #channels, :emotes.
  const roster = useStore((s) => s.roster);
  const emotes = useStore((s) => s.emoteCatalogue);
  // #channels: the ones you have actually heard on, from the frames.
  const allFrames = useStore((s) => s.frames);
  const channels = React.useMemo(
    () => [...new Set(allFrames.map((f) => f.channelName).filter((c): c is string => !!c))],
    [allFrames],
  );
  const suggest = React.useCallback(
    (draft: string): readonly string[] => {
      const word = draft.split(/\s+/).pop() ?? "";
      if (word.startsWith("@")) {
        return Object.values(roster)
          .map((r) => `@${r.handle.toLowerCase()}`)
          .filter((n) => n.length > 1 && n.startsWith(word.toLowerCase()))
          .slice(0, 6);
      }
      if (word.startsWith("#")) {
        return channels
          .map((c) => `#${c}`)
          .filter((h) => h.startsWith(word.toLowerCase()))
          .slice(0, 6);
      }
      if (word.startsWith(":") && word.length > 1) {
        return [...emotes.keys()].filter((v) => v.startsWith(word.slice(1))).slice(0, 6);
      }
      return [];
    },
    [roster, channels, emotes],
  );

  const renderCard = (card: CardState): React.ReactElement => (
    <Card card={card} onSendCommand={onCommandClick} onCommandPreview={onCommandPreview}>
      <CardBody card={card} onSendCommand={onCommandClick} onCommandPreview={onCommandPreview} />
    </Card>
  );

  const bar = (
    <>
      {seed ? (
        <ReplyChip data-testid="reply-chip">
          replying — <code>{seed.text.trim()}</code>
          <DrawerButton type="button" aria-label="cancel the reply" onClick={() => setSeed({ text: "", nonce: Date.now() })}>
            ✕
          </DrawerButton>
        </ReplyChip>
      ) : null}
      <PromptStrip
        compact
        barId={barId}
        onCancelPrompt={onCancelPrompt}
        onSendCommand={onCommandClick}
        onCommandPreview={onCommandPreview}
      />
      <CommandBar
        barId={barId}
        onSendCommand={onSendCommand}
        onSendPromptResponse={onSendPromptResponse}
        onCancelPrompt={onCancelPrompt}
        {...(seed ? { seed } : {})}
        suggest={suggest}
        onFocusChange={setTyping}
        autoFocus={false}
        leading={mode === "chat" ? (
          <TargetChip barId={barId} {...(channel ? { channel } : {})} onSendCommand={onSendCommand} />
        ) : undefined}
      />
    </>
  );

  return (
    <Root
      data-testid="phone-shell"
      data-phone-mode={mode}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (start === null || end === undefined) return;
        const dx = end - start;
        // Swipe right opens the channels; swipe left, who is here.
        if (dx > SWIPE_PX) setDrawer("left");
        else if (dx < -SWIPE_PX) setDrawer("right");
      }}
    >
      <DrawerButtons>
        <DrawerButton type="button" data-testid="open-channels" onClick={() => setDrawer("left")}>
          ‹ channels
        </DrawerButton>
        <DrawerButton type="button" data-testid="open-here" onClick={() => setDrawer("right")}>
          who&rsquo;s here ›
        </DrawerButton>
      </DrawerButtons>
      {mode === "watch" ? (
        <Video data-testid="phone-video">
          <StreamEmbed target={watchTarget} />
        </Video>
      ) : null}
      <Terminal
        frames={shown}
        onCommandClick={onCommandClick}
        onCommandPreview={onCommandPreview}
        onCommandSend={onCommandSend}
        onLineMenu={setLineMenu}
      />
      {inline.length > 0 ? (
        <InlineStack data-testid="inline-card-stack">
          {inline.map((card) => (
            <div
              key={card.instanceId}
              onClick={(e) => {
                // A tap on the card (not on one of its controls) opens
                // it at stage.
                if ((e.target as HTMLElement).closest("button")) return;
                setSheet(card.instanceId);
              }}
            >
              <InlineCard card={card} onSendCommand={onCommandClick} onCommandPreview={onCommandPreview} />
            </div>
          ))}
        </InlineStack>
      ) : null}
      {mode === "explore" ? (
        <>
          <PinnedChipRow onSendCommand={onCommandClick} />
          <ButtonBar onCommandClick={onCommandClick} />
        </>
      ) : null}
      {bar}
      {!typing ? <ModeTabs mode={mode} onCommandClick={onCommandClick} /> : null}

      {drawer === "left" ? (
        <PhoneDrawer side="left" label="channels" onClose={() => setDrawer(null)}>
          <SubjectRail
            selectedId={null}
            onSelect={(subject) => {
              setDrawer(null);
              onCommandClick(`cockpit terminal #${subject.handle}`);
            }}
          />
          {tray.length > 0 ? (
            <>
              <DrawerLabel>Tray</DrawerLabel>
              {tray.map((c) => (
                <TrayItem
                  key={c.instanceId}
                  type="button"
                  data-testid="tray-card"
                  onClick={() => onCommandClick(`cockpit card restore ${c.key}`)}
                >
                  {c.title ?? c.cardId} <code>cockpit card restore {c.key}</code>
                </TrayItem>
              ))}
            </>
          ) : null}
        </PhoneDrawer>
      ) : null}
      {drawer === "right" ? (
        <PhoneDrawer side="right" label="who's here" onClose={() => setDrawer(null)}>
          {here ? renderCard(here) : <DrawerLabel>Nobody looked around yet — type look.</DrawerLabel>}
        </PhoneDrawer>
      ) : null}

      {sheetCard ? (
        <CardSheet
          card={sheetCard}
          onClose={() => setSheet(null)}
          renderCard={renderCard}
          strip={
            <>
              <Terminal
                frames={shown}
                strip
                onCommandClick={onCommandClick}
                onCommandPreview={onCommandPreview}
              />
              {bar}
            </>
          }
        />
      ) : null}

      {lineMenu ? (
        <LinePressMenu
          frame={lineMenu}
          onClose={() => setLineMenu(null)}
          onSend={onCommandClick}
          onSeed={(text) => setSeed({ text, nonce: Date.now() })}
          onReact={setReactTo}
        />
      ) : null}
      {reactTo && reactTo.frameId !== undefined ? (
        <EmoteSheet
          frameId={reactTo.frameId}
          mine={[]}
          onSend={onCommandSend ?? onCommandClick}
          onClose={() => setReactTo(null)}
        />
      ) : null}
      <RadialOverlay onSendCommand={onCommandClick} onCommandPreview={onCommandPreview} />
    </Root>
  );
}
