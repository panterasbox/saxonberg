/**
 * StreamerLayout — the broadcaster's view: the livestream-viewer layout
 * minus the video embed.
 *
 * Reuses `LivestreamPanes` with the focal pane replaced by a labeled
 * "stream stats — coming soon" placeholder (the actual engagement-stats
 * content is refine-later). Everything else — the compressed game
 * terminal, the chat rail, the always-on command bar — is identical to
 * the viewer.
 */

import React from "react";
import styled from "styled-components";
import type { LayoutProps } from "./types";
import { LivestreamPanes } from "./LivestreamPanes";
import { tokens } from "./primitives";

const StatsPlaceholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: ${tokens.color.surfaceMuted};
  border-bottom: 1px solid ${tokens.color.border};
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
`;

export const StreamerLayout: React.FC<LayoutProps> = (props) => {
  return (
    <LivestreamPanes
      {...props}
      focal={<StatsPlaceholder>stream stats — coming soon</StatsPlaceholder>}
    />
  );
};
