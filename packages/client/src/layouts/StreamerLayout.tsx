/**
 * StreamerLayout — the broadcaster's control deck.
 *
 * Not the viewer-minus-video: a streamer doesn't watch their own embed,
 * they DRIVE the broadcast. So the focal pane is the `StreamerDeck`
 * (grouped command shortcuts + a live readout — see StreamerDeck), the
 * compressed game terminal stays beneath it (never-blind), and the chat
 * rail is widened (`railWide`) because chat is the streamer's lifeline
 * while live. The deck's contents are a scaffold under design review;
 * the spatial shape is the part that's settled.
 */

import React from "react";
import type { LayoutProps } from "./types";
import { LivestreamPanes } from "./LivestreamPanes";
import { StreamerDeck } from "../components/StreamerDeck";

export const StreamerLayout: React.FC<LayoutProps> = (props) => {
  return (
    <LivestreamPanes
      {...props}
      railWide
      focal={<StreamerDeck onCommandPreview={props.onCommandPreview} />}
    />
  );
};
