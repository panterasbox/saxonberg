/**
 * CmsSurface — the full-screen CMS takeover (its own browser tab).
 *
 * Rendered by `App.tsx` when `?surface=cms` is present and the session is
 * authenticated, bypassing the cockpit entirely. This surface opens NO
 * WebSocket — it is REST-only (see docs/subsystems/cms.md): the explorer + editor speak the
 * `/api/cms/*` routes, and the live effect of a save is observed in a
 * separate in-world game tab via its existing subscriptions.
 *
 * Layout: explorer (left) | editor (right). `cmsInit` mints the CSRF
 * token once on mount.
 */

import React, { useEffect } from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { CmsExplorer } from "./CmsExplorer";
import { CmsEditor } from "./CmsEditor";
import { tokens } from "../ui";

const Screen = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
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
