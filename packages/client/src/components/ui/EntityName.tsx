/**
 * `<EntityName>` — clickable styled name carrying a Stuff identity
 * handle.
 *
 * Per the message-rendering slate (and the inspection-pane
 * reconciliation), the `stuff-id` attribute carries DOUBLE DUTY:
 * (1) interactivity — the click target resolution layer maps
 *     `stuffId` (via the client stuff registry's `primaryKeyword`)
 *     to the command this affordance sends; the parent component
 *     supplies the resolved command via `onClick` so the
 *     mapping logic lives in one place;
 * (2) styling — a future theme stylesheet selects on
 *     `[data-stuff-id]` against the viewer's social-graph bucket
 *     (friend / foe / self) to colour the name. The component
 *     emits the attribute today; bucket selectors land when the
 *     social-graph subsystem does.
 *
 * One attribute, two duties — that's the slate's economy. There
 * is NO `<color>` MML tag and no per-tag color attribute; coloring
 * is a stylesheet rule keyed off semantic markup.
 *
 * The component renders a real `<button>` so keyboard activation
 * and the screen-reader's interactive announcement come for free.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "./tokens";

const NameButton = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.accent};
  cursor: pointer;
  padding: 0;
  font: inherit;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;

  &:hover {
    color: ${tokens.color.accentHover};
    text-decoration-style: solid;
  }
`;

interface EntityNameProps {
  /**
   * The thing's stable identity handle. Drives BOTH the
   * interactivity layer (parent resolves command via the client
   * stuff registry) and the styling layer (future
   * `[data-stuff-id]` bucket selectors). Optional: a label-only
   * affordance renders without a bucket selector hit and routes
   * through the parent's label fallback.
   */
  stuffId?: string;
  /**
   * Visible display name. The flatten of the affordance — what a
   * screen reader announces, what a plain-text log captures.
   */
  label: string;
  /**
   * Browser tooltip text — typically previews the command this
   * affordance will send (`Click to send: look brass thermometer`).
   */
  title?: string;
  /**
   * Click handler. The parent component owns command resolution
   * (registry lookup, keyword fallback, etc.) and emits the
   * resolved verb through `onSendCommand` — keep this surface
   * about clicking, not command-shape.
   */
  onClick: () => void;
}

export function EntityName({
  stuffId,
  label,
  title,
  onClick,
}: EntityNameProps): React.ReactElement {
  return (
    <NameButton data-stuff-id={stuffId} title={title} onClick={onClick}>
      {label}
    </NameButton>
  );
}
