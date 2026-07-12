/**
 * CmsSurface — the content-authoring surface (explorer + Monaco editor).
 *
 * Mounted inside the `builder` cockpit layout (the WebSocket session
 * stays live alongside it). REST-only itself: the explorer + editor speak
 * the `/api/cms/*` routes (see docs/subsystems/cms.md); the live effect of
 * a save is observed via the in-world subscriptions in the same session.
 * `cmsInit` mints the CSRF token once on mount.
 *
 * Layout: explorer (left) | editor (right). Fills its content slot
 * (`flex:1; min-height:0`) rather than the whole viewport, so the
 * always-on cockpit chrome stays visible above it.
 */

import React, { useEffect } from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { CmsExplorer } from "./CmsExplorer";
import { CmsEditor } from "./CmsEditor";
import { StudioPanel } from "./studio/StudioPanel";
import { CmsDiagnosticsPane } from "./CmsDiagnosticsPane";
import { tokens } from "../ui";

const Root = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
`;

const ModeBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.xs} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
`;

const ModeTab = styled.button<{ $active: boolean }>`
  background: ${(p) => (p.$active ? tokens.color.surfaceAlt : "transparent")};
  border: 1px solid
    ${(p) => (p.$active ? tokens.color.borderEmphasis : "transparent")};
  border-radius: ${tokens.radius.md};
  color: ${(p) => (p.$active ? tokens.color.fg : tokens.color.fgMuted)};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.md};
  cursor: pointer;

  &:hover {
    color: ${tokens.color.fg};
  }
`;

const Screen = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const ExplorerColumn = styled.div`
  flex: none;
  width: 320px;
  min-width: 200px;
  height: 100%;
`;

export const CmsSurface: React.FC = () => {
  const cmsInit = useStore((s) => s.cmsInit);
  const cmsOpen = useStore((s) => s.cmsOpen);
  // Files (explorer + editor) vs Kinds (the content-first Studio surface: the
  // blueprint catalogue + template + class-composer view router).
  const [mode, setMode] = React.useState<"files" | "kinds" | "diagnostics">(
    "files",
  );

  useEffect(() => {
    void cmsInit();
  }, [cmsInit]);

  // The Studio's template-create success offers "open in Files": switch tabs
  // and open the freshly-written content template in the Files editor.
  const openInFiles = React.useCallback(
    (path: string) => {
      setMode("files");
      void cmsOpen("content", path);
    },
    [cmsOpen],
  );

  return (
    <Root>
      <ModeBar role="tablist" aria-label="CMS surface mode">
        <ModeTab
          type="button"
          role="tab"
          aria-selected={mode === "files"}
          $active={mode === "files"}
          title="Browse + edit content, source, and documents"
          onClick={() => setMode("files")}
        >
          Files
        </ModeTab>
        <ModeTab
          type="button"
          role="tab"
          aria-selected={mode === "kinds"}
          $active={mode === "kinds"}
          title="Browse the blueprint catalogue, instantiate templates, and author new kinds"
          onClick={() => setMode("kinds")}
        >
          Kinds
        </ModeTab>
        <ModeTab
          type="button"
          role="tab"
          aria-selected={mode === "diagnostics"}
          $active={mode === "diagnostics"}
          title="Compile / runtime errors in the content you authored"
          onClick={() => setMode("diagnostics")}
        >
          Diagnostics
        </ModeTab>
      </ModeBar>
      {mode === "files" ? (
        <Screen>
          <ExplorerColumn>
            <CmsExplorer />
          </ExplorerColumn>
          <CmsEditor />
        </Screen>
      ) : mode === "kinds" ? (
        <StudioPanel onOpenInFiles={openInFiles} />
      ) : (
        <CmsDiagnosticsPane />
      )}
    </Root>
  );
};
