/**
 * WorldLayout — the classic terminal cockpit (the default layout).
 *
 * The single-terminal arrangement: a tabbed-filter strip + the scrollback
 * Terminal + its command bar in the primary column, with the inspection
 * pane as the side rail (the "Single + fixed rail" canonical split). This
 * is the pre-layout-registry cockpit lifted verbatim, so `world` is
 * behavior-identical to before the refactor.
 */

import React, { useState } from "react";
import type { LayoutProps } from "./types";
import { Cockpit, LeftColumn } from "./primitives";
import { TabStrip } from "../components/TabStrip";
import { Terminal } from "../components/Terminal";
import { FilterDrawer } from "../components/FilterDrawer";
import { CommandBar } from "../components/CommandBar";
import { InspectionPane } from "../components/InspectionPane";

export const WorldLayout: React.FC<LayoutProps> = ({
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandPreview,
  baseValue,
  onBaseChange,
  flashing,
  previewing,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          baseValue={baseValue}
          onBaseChange={onBaseChange}
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
          flashing={flashing}
          previewing={previewing}
        />
      </LeftColumn>
      <InspectionPane
        onSendCommand={onSendCommand}
        onCommandPreview={onCommandPreview}
      />
    </Cockpit>
  );
};
