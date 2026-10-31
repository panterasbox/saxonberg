/**
 * ModeStage — the stage every desktop mode composes (client-surface D9).
 *
 * ⭐⭐ **Four regions, one geometry, measured in rem**: the PANEL (a region
 * of cards, accordion; the explore panel holds the `here` card), the
 * TERMINAL COLUMN (the primary terminal at a 42rem text measure, with the
 * MEDIUM slot across its top), and the CARD AREA (a feed at one unit, a
 * workspace at more). A FULL card takes the stage; the terminal drops to
 * a strip at the column's x, and the other cards sit as chips beside it.
 *
 * The window decides how many units fit (`useWidthTier`); the panel
 * collapses first, because it costs two-thirds of a unit. Where each
 * card sits is the server's (`card-arranged`): the stage renders it.
 *
 * ⚠ The phone is its own design: `PhoneShell` (W6).
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../store/index";
import {
  ensureSeededViews,
  setActiveFacetFilter,
} from "../store/consoleActions";
import type { LayoutProps } from "./types";
import { tokens } from "../components/ui";
import { useWidthTier } from "../lib/style/useWidthTier";
import { TabStrip } from "../components/TabStrip";
import { FilterDrawer } from "../components/FilterDrawer";
import { Terminal } from "../components/Terminal";
import { CommandBar } from "../components/CommandBar";
import { PromptStrip } from "../components/PromptStrip";
import { CardArea } from "../components/cards/CardArea";
import { Card } from "../components/cards/Card";
import { CardBody } from "../components/cards/CardBodies";
import { RadialOverlay } from "../components/cards/RadialOverlay";
import { CARD_LABEL } from "../components/cards/useCardFeed";
import { TerminalCardBody } from "../components/cards/TerminalCardBody";
import type { CardState } from "../store/cardFeedSlice";
import type { ConsoleTab, ForumSubjectRecord, SubjectSurfaceName, WatchTarget } from "@saxonberg/types";
import { ALL_VIEW } from "@saxonberg/types";
import { setActiveTab } from "../store/consoleActions";
import { SubjectRail } from "../components/social/SubjectRail";
import { SubjectHeader } from "../components/social/SubjectHeader";
import { defaultSurface } from "../components/social/surfaces";
import { isForumSurface } from "../components/social/surfaces";
import { ForumView } from "../components/ForumView";
import { openForumBoard } from "../store/forumActions";
import { TunedRail } from "../components/social/TunedRail";
import { StreamEmbed } from "../components/embed/StreamEmbed";
import { StreamerDeck } from "../components/StreamerDeck";

const Stage = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
`;

const Panel = styled.aside`
  flex: none;
  width: ${tokens.width.panel}rem;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm};
  min-height: 0;
  overflow-y: auto;
  border-right: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
`;

const PanelHead = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const PanelToggle = styled.button`
  font: inherit;
  font-size: ${tokens.font.micro};
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
  cursor: pointer;
`;

/**
 * ⭐ The terminal column: ~44rem with padding; its text never runs past
 * 42rem, and the column never takes the leftover width as a gutter.
 */
const TerminalColumn = styled.div`
  flex: 0 1 ${tokens.width.measure}rem;
  max-width: ${tokens.width.measure}rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

/** Medium: a landscape card across the top of the terminal column (~16:9). */
const MediumSlot = styled.div`
  flex: none;
  max-height: ${(tokens.width.measure * 9) / 16}rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: ${tokens.space.sm};
  border-bottom: 1px solid ${tokens.color.border};
`;

const FullStage = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const FullCard = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: ${tokens.space.sm};
`;

const StripRow = styled.div`
  flex: none;
  display: flex;
  gap: ${tokens.space.sm};
  border-top: 1px solid ${tokens.color.border};
`;

const StripColumn = styled.div`
  flex: 0 1 ${tokens.width.measure}rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const StripChips = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.sm};
`;

const StripChip = styled.button`
  font: inherit;
  font-size: ${tokens.font.micro};
  padding: 0.1rem ${tokens.space.sm};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  cursor: pointer;
`;

const FilteredNotice = styled.div`
  flex: none;
  padding: ${tokens.space.sm} ${tokens.space.md};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const FilterLink = styled.button`
  font: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  color: ${tokens.color.fgEmphasis};
  text-decoration: underline;
`;

const ViewBar = styled.div`
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.xs} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

const ViewChip = styled.button<{ $on: boolean }>`
  font: inherit;
  font-size: ${tokens.font.small};
  padding: 0 ${tokens.space.sm};
  border: 1px solid ${(p) => (p.$on ? tokens.color.accent : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.sm};
  background: ${(p) => (p.$on ? tokens.color.surfaceAlt : "transparent")};
  color: ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.fgMuted)};
  cursor: pointer;
`;

const ViewEdit = styled.button`
  font: inherit;
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
  cursor: pointer;
`;

function titleOf(card: CardState): string {
  return (
    (card.records[0]?.displayName as string | undefined) ||
    card.title ||
    CARD_LABEL[card.cardId] ||
    "a card"
  );
}

function quoteRef(key: string): string {
  if (!/\s|"/.test(key)) return key;
  return `"${key.replace(/(["\\])/g, "\\$1")}"`;
}

/** Whether the panel is up, given what the player wants and what fits. */
export function usePanelOpen(): { open: boolean; units: number } {
  const want = useStore((s) => s.modePanelOpen);
  const { units } = useWidthTier();
  // ⭐ The panel collapses first: it stays only when a unit still fits
  // beside it.
  const open = want && units.withPanel >= 1;
  return { open, units: open ? units.withPanel : units.withoutPanel };
}

/**
 * ⭐ What a mode puts on the stage (client-surface D9): which region the
 * panel holds, what sits over the terminal column when no medium card
 * does, and the shipped phone surface (its own design, W6).
 */
export interface StageConfig {
  panel: "here" | "subjects" | "tuned" | null;
  focal: "video" | "deck" | "subject" | null;
}

const CONFIG = {
  explore: { panel: "here", focal: null },
  chat: { panel: "subjects", focal: "subject" },
  watchViewer: { panel: "tuned", focal: "video" },
  watchStreamer: { panel: "tuned", focal: "deck" },
  build: { panel: null, focal: null },
} satisfies Record<string, StageConfig>;

/** The phone renders `PhoneShell` (App); every stage here is a desktop's. */
function stageFor(config: StageConfig): React.FC<LayoutProps> {
  const Staged: React.FC<LayoutProps> = (props) => <DesktopStage {...props} config={config} />;
  return Staged;
}

export const ExploreStage = stageFor(CONFIG.explore);
export const ChatStage = stageFor(CONFIG.chat);
export const WatchViewerStage = stageFor(CONFIG.watchViewer);
export const WatchStreamerStage = stageFor(CONFIG.watchStreamer);
export const BuildStage = stageFor(CONFIG.build);
/** The explore stage — the default. */
export const ModeStage = ExploreStage;

const DesktopStage: React.FC<LayoutProps & { config: StageConfig }> = ({
  config,
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandSend,
  onCommandPreview,
  resultDisplay,
}) => {
  const [viewEditorOpen, setViewEditorOpen] = React.useState(false);
  const tabsLoaded = useStore((s) => Array.isArray(s.clientState["console.tabs"]));
  React.useEffect(() => {
    if (tabsLoaded) ensureSeededViews();
  }, [tabsLoaded]);
  const allFrames = useStore((s) => s.frames);
  const activeTabName = useStore(
    (s) => (s.clientState["console.activeTab"] as string | undefined) ?? "All",
  );
  const tabs = useStore(
    (s) => (s.clientState["console.tabs"] as ConsoleTab[] | undefined) ?? [],
  );
  const cards = useStore((s) => s.cards);
  const setPanelOpen = useStore((s) => s.setModePanelOpen);
  const { open: panelWanted, units } = usePanelOpen();

  const live = Object.values(cards).filter((c) => c.closed === undefined && !c.minimized);
  // ⭐ The PRIMARY terminal is the terminal column's resident (D6); the
  // other terminals are ordinary cards in the area.
  const primary = live.find((c) => c.cardId === "terminal" && c.role === "primary");
  const placeable = live.filter((c) => c !== primary);
  const full = placeable.find((c) => c.size === "full");
  const medium = placeable.find((c) => c.size === "medium");
  const here =
    config.panel === "here"
      ? placeable.find((c) => c.role === "here" && c.size !== "medium" && c.size !== "full")
      : undefined;
  const panelOpen = panelWanted && config.panel !== null && (config.panel !== "here" || here !== undefined);
  const exclude = React.useMemo(() => {
    const ids = new Set<string>();
    if (panelOpen && here) ids.add(here.instanceId);
    if (primary) ids.add(primary.instanceId);
    return ids;
  }, [panelOpen, here, primary]);

  // ⭐ The primary's view is the console's active view, so the view
  // editor edits what the terminal shows.
  const primaryView =
    primary?.payload?.kind === "terminal" ? primary.payload.filter.view : undefined;
  React.useEffect(() => {
    if (primaryView && primaryView !== activeTabName) setActiveTab(primaryView);
  }, [primaryView, activeTabName]);

  const renderBody = (card: CardState, cut = false): React.ReactElement =>
    card.cardId === "terminal" ? (
      <TerminalCardBody
        card={card}
        onSendCommand={onSendCommand}
        onSendPromptResponse={onSendPromptResponse}
        onCancelPrompt={onCancelPrompt}
        onCommandClick={onCommandClick}
        onCommandPreview={onCommandPreview}
        onCommandSend={onCommandSend}
        resultDisplay={resultDisplay}
      />
    ) : (
      <CardBody
        card={card}
        cut={cut}
        onSendCommand={onCommandClick}
        onCommandPreview={onCommandPreview}
      />
    );

  const renderCard = (card: CardState, cut = false): React.ReactElement => (
    <Card
      key={card.instanceId}
      card={card}
      cut={cut}
      onSendCommand={onCommandClick}
      onCommandPreview={onCommandPreview}
    >
      {renderBody(card, cut)}
    </Card>
  );

  /** The view chooser — the tab strip's views are the primary's filters. */
  const viewChooser = primary ? (
    <ViewBar data-testid="view-chooser">
      {[ALL_VIEW, ...tabs.map((t) => t.name).filter((n) => n !== ALL_VIEW)].map((name) => {
        const shown = primary.payload?.kind === "terminal" ? primary.payload.filter : {};
        const on = !shown.channel && (shown.view ?? ALL_VIEW) === name;
        const cmd = `cockpit terminal ${quoteRef(name)}`;
        return (
          <ViewChip
            key={name}
            type="button"
            $on={on}
            data-testid={`view-${name}`}
            aria-pressed={on}
            onClick={() => onCommandClick(cmd)}
            onMouseEnter={() => onCommandPreview(cmd)}
            onMouseLeave={() => onCommandPreview(null)}
          >
            {name}
          </ViewChip>
        );
      })}
      {primary.payload?.kind === "terminal" && primary.payload.filter.channel ? (
        <ViewChip type="button" $on data-testid="view-channel">
          #{primary.payload.filter.channel}
        </ViewChip>
      ) : null}
      <ViewEdit type="button" aria-label="edit this view" onClick={() => setViewEditorOpen((v) => !v)}>
        ⋯
      </ViewEdit>
    </ViewBar>
  ) : null;

  const terminalBits = (strip: boolean): React.ReactElement =>
    primary ? (
      <>
        {!strip ? viewChooser : null}
        {!strip && viewEditorOpen ? <FilterDrawer onClose={() => setViewEditorOpen(false)} /> : null}
        <TerminalCardBody
          card={primary}
          strip={strip}
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
          onCommandSend={onCommandSend}
          resultDisplay={resultDisplay}
        />
      </>
    ) : (
      // Before the server has minted a primary terminal (or with no
      // server that does), the console's active view drives the column.
      <>
        {!strip ? (
          <TabStrip presetsOnly onToggleDrawer={() => setViewEditorOpen((v) => !v)} />
        ) : null}
        <Terminal
          frames={frames}
          strip={strip}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
          onCommandSend={onCommandSend}
        />
        {!strip && frames.length === 0 && allFrames.length > 0 ? (
          <FilteredNotice data-testid="all-filtered-notice">
            {allFrames.length} in the buffer, all hidden by <strong>{activeTabName}</strong>.{" "}
            <FilterLink aria-label="clear this view's filter" onClick={() => setActiveFacetFilter({})}>
              clear it
            </FilterLink>
          </FilteredNotice>
        ) : null}
        {!strip && viewEditorOpen ? <FilterDrawer onClose={() => setViewEditorOpen(false)} /> : null}
        <PromptStrip
          onCancelPrompt={onCancelPrompt}
          onSendCommand={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
        <CommandBar
          barId="world"
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
        />
      </>
    );

  return (
    <Stage data-testid="mode-stage" data-panel-open={panelOpen ? "true" : "false"}>
      {panelOpen ? (
        <Panel data-testid="mode-panel">
          <PanelHead>
            <PanelToggle
              type="button"
              aria-label="collapse the panel"
              data-testid="panel-collapse"
              onClick={() => setPanelOpen(false)}
            >
              ‹ collapse
            </PanelToggle>
          </PanelHead>
          {config.panel === "here" && here ? renderCard(here) : null}
          {config.panel === "subjects" ? (
            <SubjectPanel onCommandClick={onCommandClick} onCommandPreview={onCommandPreview} />
          ) : null}
          {config.panel === "tuned" ? (
            <TunedRail onSendCommand={onCommandClick} onCommandPreview={onCommandPreview} />
          ) : null}
        </Panel>
      ) : null}
      {full ? (
        <FullStage data-testid="full-stage">
          <FullCard>{renderCard(full)}</FullCard>
          <StripRow>
            <StripColumn>{terminalBits(true)}</StripColumn>
            <StripChips data-testid="stage-chips">
              {placeable
                .filter((c) => c !== full)
                .map((c) => {
                  const cmd = `cockpit card grow ${quoteRef(c.key)}`;
                  return (
                    <StripChip
                      key={c.instanceId}
                      type="button"
                      onClick={() => onCommandClick(cmd)}
                      onMouseEnter={() => onCommandPreview(cmd)}
                      onMouseLeave={() => onCommandPreview(null)}
                    >
                      {titleOf(c)}
                    </StripChip>
                  );
                })}
            </StripChips>
          </StripRow>
        </FullStage>
      ) : (
        <>
          <TerminalColumn data-testid="terminal-column">
            {medium ? (
              <MediumSlot data-testid="medium-slot">{renderCard(medium, true)}</MediumSlot>
            ) : config.focal ? (
              <MediumSlot data-testid="focal-slot">
                <Focal kind={config.focal} onCommandClick={onCommandClick} onCommandPreview={onCommandPreview} />
              </MediumSlot>
            ) : null}
            {terminalBits(false)}
          </TerminalColumn>
          <CardArea
            units={units}
            exclude={exclude}
            onSendCommand={onCommandClick}
            onCommandPreview={onCommandPreview}
            resultDisplay={resultDisplay}
            renderBody={renderBody}
          />
        </>
      )}
      <RadialOverlay onSendCommand={onCommandClick} onCommandPreview={onCommandPreview} />
    </Stage>
  );
};

/**
 * ⭐ The chat panel: the subjects (channels and boards). Picking a chat
 * subject points the PRIMARY terminal at it (`cockpit terminal
 * #<handle>`); a forum subject opens its board over the terminal column.
 * The highlight is what the primary shows.
 */
function SubjectPanel({
  onCommandClick,
  onCommandPreview,
}: {
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}): React.ReactElement {
  const selected = useStore((s) => s.stageSubject);
  const setSelected = useStore((s) => s.setStageSubject);
  return (
    <SubjectRail
      selectedId={selected?.subject.id ?? null}
      onSelect={(subject) => {
        const surface = defaultSurface(subject);
        setSelected({ subject, surface });
        if (surface && isForumSurface(surface)) {
          openForumBoard(subject.handle, subject.surfaceRefs[surface] ?? null);
          return;
        }
        const cmd = `cockpit terminal #${subject.handle}`;
        onCommandPreview(cmd);
        onCommandClick(cmd);
      }}
    />
  );
}

/** What sits over the terminal column when no medium card does. */
function Focal({
  kind,
  onCommandClick,
  onCommandPreview,
}: {
  kind: NonNullable<StageConfig["focal"]>;
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}): React.ReactElement | null {
  const target = useStore(
    (s) => (s.clientState["cockpit.watch"] as WatchTarget | null) ?? null,
  );
  const selected = useStore((s) => s.stageSubject);
  if (kind === "video") return <StreamEmbed target={target} />;
  if (kind === "deck") return <StreamerDeck onCommandPreview={onCommandPreview} />;
  // A forum subject's board, over the terminal (chat).
  if (!selected || !selected.surface || !isForumSurface(selected.surface)) return null;
  return (
    <>
      <SubjectHeader
        subject={selected.subject}
        activeSurface={selected.surface}
        onSelectSurface={() => undefined}
        onSendCommand={onCommandClick}
        onCommandPreview={onCommandPreview}
      />
      <ForumView
        onSendCommand={onCommandClick}
        onCommandPreview={onCommandPreview}
        organizer={selected.surface === "ordered-forum" ? "ordered" : "open"}
      />
    </>
  );
}

export type StageSubject = { subject: ForumSubjectRecord; surface: SubjectSurfaceName | null };
