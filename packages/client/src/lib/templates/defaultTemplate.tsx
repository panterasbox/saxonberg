/**
 * defaultTemplate — handles `system.*`, `sense.*`, and
 * every other topic family with no explicit template. Renders the
 * body MML inline with topic-cascade treatment from the stylesheet.
 *
 * The visual distinction for system frames (muted color, prefix
 * marker) comes from the topic-cascade selector for `system` — NOT
 * from a per-type layout. This is why the retired `<sys>` chrome tag
 * was removable: its styling moved to the topic cascade.
 */

import React from 'react';
import styled, { css } from 'styled-components';
import type { Template } from './TemplateRegistry';
import { renderTree } from './renderHelpers';
import { applyTreatment } from '../style/applyTreatment';

const Wrapper = styled.span<{
  $fg?: string;
  $bg?: string;
  $italic?: boolean;
  $weight?: string;
}>`
  ${(p) =>
    p.$fg &&
    css`
      color: ${p.$fg};
    `}
  ${(p) =>
    p.$bg &&
    css`
      background: ${p.$bg};
    `}
  ${(p) =>
    p.$italic &&
    css`
      font-style: italic;
    `}
  ${(p) =>
    p.$weight &&
    css`
      font-weight: ${p.$weight};
    `}
`;

export const defaultTemplate: Template = (ctx) => {
  const topicTreatment = ctx.stylesheet.topicTreatment(ctx.frame.topic);
  const { css: cssProps, prefix } = applyTreatment(topicTreatment);

  return (
    <Wrapper
      $fg={cssProps.color as string | undefined}
      $bg={cssProps.background as string | undefined}
      $italic={cssProps.fontStyle === 'italic'}
      $weight={cssProps.fontWeight as string | undefined}
    >
      {prefix}
      {renderTree(ctx.tree, {
        onCommandClick: ctx.onCommandClick,
        onCommandPreview: ctx.onCommandPreview,
        viewerStuffId: ctx.viewerStuffId,
      })}
    </Wrapper>
  );
};
