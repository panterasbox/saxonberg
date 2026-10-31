/**
 * LivestreamViewerLayout — watch a broadcast inside the cockpit.
 *
 * The shared `LivestreamPanels` (compressed game terminal + chat rail +
 * always-on command bar) with the video embed as the focal card. The
 * embed target is the viewer's own server-authoritative `cockpit.watch`
 * clientState (set by the `watch` verb, mirrored from the server), read
 * straight off `clientState` — the same shape the cockpit uses for
 * `cockpit.inputModes`.
 */

import React from "react";
import { useStore } from "../store/index";
import type { WatchTarget } from "@saxonberg/types";
import type { LayoutProps } from "./types";
import { LivestreamPanels } from "./LivestreamPanels";
import { StreamEmbed } from "../components/embed/StreamEmbed";

export const LivestreamViewerLayout: React.FC<LayoutProps> = (props) => {
  const target = useStore(
    (s) => (s.clientState["cockpit.watch"] as WatchTarget | null) ?? null,
  );
  return (
    <LivestreamPanels {...props} focal={<StreamEmbed target={target} />} />
  );
};
