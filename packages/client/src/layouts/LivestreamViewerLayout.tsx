/**
 * LivestreamViewerLayout — watch a broadcast inside the cockpit.
 *
 * The shared `LivestreamPanes` (compressed game terminal + chat rail +
 * always-on command bar) with the video embed as the focal pane. The
 * broadcast sources come from the server (`broadcastSources`, welcome
 * snapshot + live push).
 */

import React from "react";
import { useStore } from "../store/index";
import type { LayoutProps } from "./types";
import { LivestreamPanes } from "./LivestreamPanes";
import { StreamEmbed } from "../components/embed/StreamEmbed";

export const LivestreamViewerLayout: React.FC<LayoutProps> = (props) => {
  const sources = useStore((s) => s.broadcastSources);
  return <LivestreamPanes {...props} focal={<StreamEmbed sources={sources} />} />;
};
