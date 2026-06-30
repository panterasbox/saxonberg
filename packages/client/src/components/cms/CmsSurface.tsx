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
import { tokens } from "../ui";

const Screen = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
`;

const ExplorerColumn = styled.div`
  flex: none;
  width: 320px;
  min-width: 200px;
  height: 100%;
`;

export const CmsSurface: React.FC = () => {
  const cmsInit = useStore((s) => s.cmsInit);

  useEffect(() => {
    void cmsInit();
  }, [cmsInit]);

  return (
    <Screen>
      <ExplorerColumn>
        <CmsExplorer />
      </ExplorerColumn>
      <CmsEditor />
    </Screen>
  );
};
