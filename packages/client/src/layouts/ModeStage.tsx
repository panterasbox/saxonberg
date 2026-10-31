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
 * ⚠ The phone is its own design (W6); below the phone tier this renders
 * the shipped phone surface unchanged.
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
import type { CardState } from "../store/cardFeedSlice";
import { WorldLayout } from "./WorldLayout";

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

export const ModeStage: React.FC<LayoutProps> = (props) => {
  const { tier } = useWidthTier();
  if (tier === "phone") return <WorldLayout {...props} />;
  return <DesktopStage {...props} />;
};

const DesktopStage: React.FC<LayoutProps> = ({
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
  const cards = useStore((s) => s.cards);
  const setPanelOpen = useStore((s) => s.setModePanelOpen);
  const { open: panelOpen, units } = usePanelOpen();

  const live = Object.values(cards).filter(
    (c) => c.closed === undefined && c.cardId !== "terminal" && !c.minimized,
  );
  const full = live.find((c) => c.size === "full");
  const medium = live.find((c) => c.size === "medium");
  // The explore panel holds the room card (the `here` role).
  const here = live.find((c) => c.role === "here" && c.size !== "medium" && c.size !== "full");
  const exclude = React.useMemo(() => {
    const ids = new Set<string>();
    if (panelOpen && here) ids.add(here.instanceId);
    return ids;
  }, [panelOpen, here]);

  const renderCard = (card: CardState, cut = false): React.ReactElement => (
    <Card
      key={card.instanceId}
      card={card}
      cut={cut}
      onSendCommand={onCommandClick}
      onCommandPreview={onCommandPreview}
    >
      <CardBody card={card} onSendCommand={onCommandClick} onCommandPreview={onCommandPreview} />
    </Card>
  );

  const terminalBits = (strip: boolean): React.ReactElement => (
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
      {panelOpen && here ? (
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
          {renderCard(here)}
        </Panel>
      ) : null}
      {full ? (
        <FullStage data-testid="full-stage">
          <FullCard>{renderCard(full)}</FullCard>
          <StripRow>
            <StripColumn>{terminalBits(true)}</StripColumn>
            <StripChips data-testid="stage-chips">
              {live
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
            {medium ? <MediumSlot data-testid="medium-slot">{renderCard(medium, true)}</MediumSlot> : null}
            {terminalBits(false)}
          </TerminalColumn>
          <CardArea
            units={units}
            exclude={exclude}
            onSendCommand={onCommandClick}
            onCommandPreview={onCommandPreview}
            resultDisplay={resultDisplay}
          />
        </>
      )}
      <RadialOverlay onSendCommand={onCommandClick} onCommandPreview={onCommandPreview} />
    </Stage>
  );
};
