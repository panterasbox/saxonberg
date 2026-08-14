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
import { useStore } from "../../store/index";

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
   * The command this affordance will send when clicked. When
   * provided together with `onPreview`, mousing onto the
   * affordance fires `onPreview(command)` so the parent can
   * mirror it into the cockpit's command bar (matching the
   * terminal-scroll behavior). Mousing off fires
   * `onPreview(null)`.
   */
  command?: string;
  /**
   * Hover-preview channel. The parent updates the command bar
   * with the previewed command on enter, restores on leave.
   * Omit to disable hover-preview entirely (the click still
   * works).
   */
  onPreview?: (command: string | null) => void;
  /**
   * Click handler. The parent component owns command resolution
   * (registry lookup, keyword fallback, etc.) and emits the
   * resolved verb through `onSendCommand` — keep this surface
   * about clicking, not command-shape.
   */
  onClick: () => void;
}

/**
 * ⭐ **Every named thing opens its radial from the same gesture.**
 *
 * Wired here rather than at ~40 call sites, and that is the whole
 * reason it is here: a menu you can reach on a room's exits but not on
 * a pane's contents list is a menu the player cannot rely on, and
 * "which surfaces support it" is exactly the kind of inconsistency the
 * no-exceptions command-sheet policy was written against.
 *
 * ⚠ Reads the store directly instead of taking a prop. The alternative
 * is threading one more optional callback through every consumer, where
 * the failure mode is a surface that silently forgets it — an absent
 * prop is invisible, a missing gesture is a bug report.
 *
 * ⚠ Long-press is the phone's form of the same gesture and is bound at
 * `pointerdown`, not `click`: a tap must still SEND the command, so the
 * two cannot share an event.
 */
const LONG_PRESS_MS = 450;

export function EntityName({
  stuffId,
  label,
  title,
  command,
  onPreview,
  onClick,
}: EntityNameProps): React.ReactElement {
  const previewEnabled = !!(onPreview && command);
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const openRadial = React.useCallback(() => {
    if (!stuffId) return;
    useStore.getState().openRadial({ stuffId, displayName: label });
  }, [stuffId, label]);

  const cancelPress = React.useCallback(() => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  React.useEffect(() => cancelPress, [cancelPress]);

  return (
    <NameButton
      data-stuff-id={stuffId}
      title={title}
      onClick={onClick}
      // Right-click on a pointer device, long-press on a touch one.
      // Both are "tell me about this" rather than "do the default
      // thing", which is what keeps the primary click sending the
      // command it previews.
      onContextMenu={
        stuffId
          ? (e) => {
              e.preventDefault();
              openRadial();
            }
          : undefined
      }
      onPointerDown={
        stuffId
          ? () => {
              cancelPress();
              pressTimer.current = setTimeout(openRadial, LONG_PRESS_MS);
            }
          : undefined
      }
      onPointerUp={stuffId ? cancelPress : undefined}
      onPointerLeave={stuffId ? cancelPress : undefined}
      onMouseEnter={
        previewEnabled ? () => onPreview!(command!) : undefined
      }
      onMouseLeave={
        previewEnabled ? () => onPreview!(null) : undefined
      }
    >
      {label}
    </NameButton>
  );
}
