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
import { TabStrip } from "../components/TabStrip";
import { Terminal } from "../components/Terminal";
import { FilterDrawer } from "../components/FilterDrawer";
import { CommandBar } from "../components/CommandBar";
import { InspectionPane } from "../components/InspectionPane";
import { WhoPane } from "../components/WhoPane";
import { NewsTickerPane } from "../components/NewsTickerPane";

/**
 * The view-sensitive right column — a small pane switch above the active
 * cockpit pane (Inspection | Who's Online). Sizes to the pane child (each
 * declares its own fixed width); `PaneSlot` is `flex: 1` so the pane's
 * `height: 100%` resolves against the space below the switch.
 */
const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
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

const PaneSlot = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
`;

const PaneTab = styled.button<{ $active: boolean }>`
  background: ${(p) => (p.$active ? "rgba(255,255,255,0.14)" : "transparent")};
  border: 1px solid rgba(255, 255, 255, 0.14);
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
  const rightPane = useStore((s) => s.rightPane);
  const setRightPane = useStore((s) => s.setRightPane);

  return (
    <Cockpit>
      <LeftColumn>
        <TabStrip onToggleDrawer={() => setDrawerOpen((v) => !v)} />
        <Terminal
          frames={frames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
        {drawerOpen && <FilterDrawer onClose={() => setDrawerOpen(false)} />}
        <CommandBar
          barId="world"
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
        />
      </LeftColumn>
      <RightColumn>
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
        </PaneSwitch>
        <PaneSlot>
          {rightPane === "who" ? (
            <WhoPane
              onSendCommand={onSendCommand}
              onCommandPreview={onCommandPreview}
            />
          ) : rightPane === "news" ? (
            <NewsTickerPane
              onSendCommand={onSendCommand}
              onCommandPreview={onCommandPreview}
            />
          ) : (
            <InspectionPane
              onSendCommand={onSendCommand}
              onCommandPreview={onCommandPreview}
            />
          )}
        </PaneSlot>
      </RightColumn>
    </Cockpit>
  );
};
