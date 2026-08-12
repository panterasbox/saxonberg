/**
 * relayTemplate — relay chat frames (`speech.relay`, the unified stream-chat relay).
 *
 * A distinct, OOC/meta treatment separate from in-world chat: a
 * per-platform provenance chip (Twitch-purple / YouTube-red), the sender's
 * external handle as the default name (honest-to-origin), and the message
 * text rendered as plain (escaped) text — relay messages are untrusted
 * input and never pass through the MML renderer.
 *
 *   ┌──────────────────┬─────────────────────────────────┐
 *   │ ⊳ twitch #chan    │ viewer: some message text       │
 *   └──────────────────┴─────────────────────────────────┘
 *
 * For a linked player (Twitch only this cycle) the handle carries a dotted
 * underline and reveals the MUD persona on hover (`title`) — the handle
 * stays the default shown name, the persona is *revealed*, never
 * substituted. An `egress` frame (the mirror of a local player's outbound
 * post) shows the player name with a `→` marker.
 *
 * The channel chip is clickable: it previews `tune <handle> --<service>` in
 * the command bar on hover and submits it on click (the global
 * clickable-previews-its-command rule).
 */

import React from "react";
import styled from "styled-components";
import type { Template } from "./TemplateRegistry";
import { renderTree } from "./renderHelpers";

const SERVICE_COLOR: Record<string, string> = {
  twitch: "#9146ff",
  youtube: "#ff0000",
  kick: "#53fc18",
};

const Row = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
`;

const Chip = styled.button<{ $color: string }>`
  flex: 0 0 auto;
  min-width: 8rem;
  text-align: left;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  color: ${(p) => p.$color};
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;

const Content = styled.div`
  flex: 1;
  white-space: pre-wrap;
  text-indent: -2rem;
  padding-left: 2rem;
`;

const Handle = styled.span<{ $linked?: boolean }>`
  font-weight: 500;
  ${(p) =>
    p.$linked
      ? "text-decoration: underline dotted; text-underline-offset: 2px;"
      : ""}
`;

export const relayTemplate: Template = (ctx) => {
  const t = ctx.frame.relay;
  // Failsafe for a relay-topic frame without structured fields: render the
  // body markup through the default path.
  if (!t) {
    return <div>{renderTree(ctx.tree, ctx)}</div>;
  }

  const color = SERVICE_COLOR[t.service] ?? SERVICE_COLOR.twitch!;
  const marker = t.egress ? `⊳ ${t.service} →` : `⊳ ${t.service}`;
  const tuneCmd = `tune ${t.channelHandle} --${t.service}`;

  return (
    <Row>
      <Chip
        $color={color}
        onClick={() => ctx.onCommandClick(tuneCmd)}
        onMouseEnter={() => ctx.onCommandPreview(tuneCmd)}
        onMouseLeave={() => ctx.onCommandPreview(null)}
        title={`Follow ${t.service} #${t.channelHandle}`}
      >
        {marker} #{t.channelHandle}
      </Chip>
      <Content>
        <Handle
          $linked={t.persona !== undefined}
          title={t.persona !== undefined ? `MUD: ${t.persona}` : undefined}
        >
          {t.speaker}
        </Handle>
        {": "}
        {t.text}
      </Content>
    </Row>
  );
};
