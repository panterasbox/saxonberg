/**
 * twitchTemplate — `world.twitch.message` frames (the Twitch relay).
 *
 * A distinct, OOC/meta treatment separate from in-world chat: a
 * Twitch-purple provenance chip, the sender's Twitch handle as the
 * default name (honest-to-origin), and the message text rendered as
 * plain (escaped) text — Twitch messages are untrusted input and never
 * pass through the MML renderer.
 *
 *   ┌──────────────────┬─────────────────────────────────┐
 *   │ ⊳ twitch #chan    │ viewer: some message text       │
 *   └──────────────────┴─────────────────────────────────┘
 *
 * For a linked player the handle carries a dotted underline and reveals
 * the MUD persona on hover (`title`) — the handle stays the default
 * shown name, the persona is *revealed*, never substituted. An `egress`
 * frame (the mirror of a local player's outbound post) shows the player
 * name with a `→` marker.
 *
 * The channel chip is clickable: it previews `twitch tune <login>` in
 * the command bar on hover and submits it on click (the global
 * clickable-previews-its-command rule).
 */

import React from "react";
import styled from "styled-components";
import type { Template } from "./TemplateRegistry";
import { renderTree } from "./renderHelpers";

const TWITCH_PURPLE = "#9146ff";

const Row = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
`;

const Chip = styled.button`
  flex: 0 0 auto;
  min-width: 8rem;
  text-align: left;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  color: ${TWITCH_PURPLE};
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

export const twitchTemplate: Template = (ctx) => {
  const t = ctx.frame.twitch;
  // Failsafe for a twitch-topic frame without structured fields: render
  // the body markup through the default path.
  if (!t) {
    return <div>{renderTree(ctx.tree, ctx)}</div>;
  }

  const marker = t.egress ? "⊳ twitch →" : "⊳ twitch";
  const tuneCmd = `twitch tune ${t.login}`;

  return (
    <Row>
      <Chip
        onClick={() => ctx.onCommandClick(tuneCmd)}
        onMouseEnter={() => ctx.onCommandPreview(tuneCmd)}
        onMouseLeave={() => ctx.onCommandPreview(null)}
        title={`Tune in to Twitch #${t.login}`}
      >
        {marker} #{t.login}
      </Chip>
      <Content>
        <Handle
          $linked={t.persona !== undefined}
          title={t.persona !== undefined ? `MUD: ${t.persona}` : undefined}
        >
          {t.handle}
        </Handle>
        {": "}
        {t.text}
      </Content>
    </Row>
  );
};
