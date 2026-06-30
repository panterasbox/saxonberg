/**
 * BuilderLayout — the CMS, re-homed into an in-session cockpit layout.
 *
 * A Monitor split (the composition grammar): the CMS explorer + Monaco
 * editor is the dominant work surface, with a glance terminal + command
 * bar as a narrow rail so live play stays legible and typeable while you
 * author (never-blind). The WebSocket session is live the whole time —
 * this is the standalone `?surface=cms` takeover retired into the layout
 * registry. The `CmsApi`/`CmsLogic` REST surface is reused unchanged;
 * `cmsInit` runs on `CmsSurface` mount.
 */

import React from "react";
import type { LayoutProps } from "./types";
import { Cockpit, SideColumn } from "./primitives";
import { CmsSurface } from "../components/cms/CmsSurface";
import { Terminal } from "../components/Terminal";
import { CommandBar } from "../components/CommandBar";

export const BuilderLayout: React.FC<LayoutProps> = ({
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandPreview,
}) => {
  return (
    <Cockpit>
      <CmsSurface />
      <SideColumn $wide>
        <Terminal
          frames={frames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
        <CommandBar
          barId="builder"
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
        />
      </SideColumn>
    </Cockpit>
  );
};
