/**
 * chatTemplate — `world.chat.*` frames. Two-column layout:
 *
 *   ┌────────────┬────────────────────────────────────┐
 *   │ [Gossip]   │ Bobalu: some very long message     │
 *   │            │         that wraps under the name  │
 *   └────────────┴────────────────────────────────────┘
 *
 * The gutter column holds the `<chan>` chip; the content column
 * shows sender + `:` + `<msg>` with hanging indent so wrapped lines
 * align under the message body, not under the name.
 *
 * Acceptance criterion #1 — chat-topic frame paints the gutter chip
 * + hanging indent layout; flatten produces the failsafe linear
 * string.
 */

import React from 'react';
import styled from 'styled-components';
import type { Template } from './TemplateRegistry';
import { findFirstTag, findFirstTagAny, renderTree } from './renderHelpers';

const ChatRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
`;

const Gutter = styled.div<{ $color?: string }>`
  flex: 0 0 auto;
  min-width: 5rem;
  color: ${(p) => p.$color ?? '#c8b76a'};
  font-weight: 500;
`;

const Content = styled.div`
  flex: 1;
  white-space: pre-wrap;
  text-indent: -2rem;
  padding-left: 2rem;
`;

const Sender = styled.span`
  font-weight: 500;
`;

export const chatTemplate: Template = (ctx) => {
  const chan = findFirstTag(ctx.tree, 'chan');
  const sender = findFirstTagAny(ctx.tree, ['player', 'name', 'npc']);
  const msg = findFirstTag(ctx.tree, 'msg');

  // Channel chip color: overlay channel color trumps theme default;
  // theme default trumps the palette fallback in the styled prop.
  const channelId = chan?.attrs.id;
  const channelColor =
    channelId !== undefined
      ? ctx.stylesheet.channelColor(channelId)
      : null;

  // Plain mode for this channel short-circuits the styled render —
  // emit the failsafe linear form instead.
  if (channelId !== undefined && ctx.stylesheet.isPlain(channelId)) {
    return (
      <div>
        {chan && renderTree([chan], ctx)}
        {' '}
        {sender && renderTree([sender], ctx)}
        {sender ? ': ' : ''}
        {msg ? renderTree(msg.children, ctx) : null}
      </div>
    );
  }

  // Missing-region fallback: if any region is absent, render the
  // tree inline through the default renderer. Tolerates legacy /
  // hand-composed chat frames that don't carry the full shape.
  if (!chan || !sender || !msg) {
    return <div>{renderTree(ctx.tree, ctx)}</div>;
  }

  return (
    <ChatRow>
      <Gutter $color={channelColor ?? undefined}>
        {renderTree([chan], ctx)}
      </Gutter>
      <Content>
        <Sender>{renderTree([sender], ctx)}</Sender>
        {': '}
        {renderTree(msg.children, ctx)}
      </Content>
    </ChatRow>
  );
};
