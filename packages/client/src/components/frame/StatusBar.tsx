/**
 * `StatusBar` — the global footer, and the surface that makes *the
 * command line is never silent* true rather than aspirational.
 *
 * `CONVENTIONS.md` #5, and § 3.5's axiom: **every click sends a command,
 * and the interface shows which.** Hovering an affordance prints the
 * verbatim command it would send, browser-style, in the bar along the
 * bottom of the window. Clicking sends exactly that string — not a
 * paraphrase of it, and not a moded variant.
 *
 * ## ⚠ There is exactly ONE of these
 *
 * This replaces `GhostCommandLine`, which had two render sites. Two
 * surfaces showing what a click would send is worse than none, because
 * they can disagree — and a disagreement here discredits the axiom
 * itself. The two sites (`App` in-world, `CharGenStage`) are mutually
 * exclusive phases: `App()` is a switch with an early return per phase,
 * so char-gen and in-world can never both be mounted. Char-gen keeps a
 * preview surface, and must: it renders affordances that send commands,
 * and the axiom does not switch off during intake.
 *
 * The structural version of "exactly one" is asserted in
 * `__tests__/StatusBar.test.tsx` by scanning `src/` — exactly one module
 * reads `ghostPreview` — rather than by anyone remembering it.
 *
 * ## The two regions, and what is deliberately not in the right one
 *
 * The art gives the bar a `flex:1` preview region and a `flex:none`
 * right region reading `here:forge · 1,240 frames`.
 *
 * ⭐ **Those two figures are not rendered, at rest or ever.** Nothing
 * measures a frame count, and `here:` would be a location readout with
 * no subscription behind it. Painting them would be the exact violation
 * this build exists to demonstrate against — in the one surface whose
 * whole job is to advertise that the interface tells the truth about
 * what it will do. So the right region carries `click to send` while
 * previewing and nothing at rest.
 *
 * Display-only and store-backed, as before: `ghostPreview` is the
 * hovered affordance's exact command, `ghostFlash` a transient
 * post-action message (`› <ran>` on click, `copied: …` on copy) shown
 * briefly and then cleared.
 */

import React, { useEffect } from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.xs} ${tokens.space.xl};
  background: ${tokens.color.surfaceSunken};
  border-top: 1px solid ${tokens.color.border};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  min-height: 1.6rem;
  user-select: none;
`;

/**
 * The preview region. Ellipsizes rather than wrapping: the bar is one
 * line by construction, and a command long enough to wrap would push
 * the content above it around every time the pointer moved.
 */
const Preview = styled.div<{ $flash: boolean }>`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${(p) => (p.$flash ? tokens.color.accent : tokens.color.fgMuted)};
  transition: color 150ms;
`;

const Glyph = styled.span`
  color: ${tokens.color.fgMuted};
  flex: none;
`;

const Command = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Hint = styled.span`
  color: ${tokens.color.fgMuted};
  opacity: 0.6;
  font-style: italic;
`;

/**
 * The right region. Carries the browser's own idiom — a status bar says
 * what the thing under the pointer will DO — and nothing at rest.
 */
const Action = styled.div`
  flex: none;
  color: ${tokens.color.fgDim};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
`;

export function StatusBar(): JSX.Element {
  const ghostPreview = useStore((s) => s.ghostPreview);
  const ghostFlash = useStore((s) => s.ghostFlash);
  const flashGhost = useStore((s) => s.flashGhost);

  // Auto-clear a flash after a beat so the bar returns to its idle /
  // preview state. The store holds the message; the timer lives here.
  useEffect(() => {
    if (!ghostFlash) return;
    const t = window.setTimeout(() => flashGhost(""), 900);
    return () => window.clearTimeout(t);
  }, [ghostFlash, flashGhost]);

  const text = ghostFlash || ghostPreview;
  const flashing = Boolean(ghostFlash);
  // `click to send` is a promise about the pointer's current target, so
  // it shows only while a preview is up — never during a flash, when
  // the command has already gone.
  const previewing = Boolean(ghostPreview) && !flashing;

  return (
    <Bar aria-live="polite" data-testid="status-bar">
      <Preview $flash={flashing} data-testid="ghost-line">
        <Glyph aria-hidden="true">{flashing ? "" : ">"}</Glyph>
        {text ? (
          <Command>{text}</Command>
        ) : (
          <Hint>hover a highlighted word to preview its command</Hint>
        )}
      </Preview>
      <Action data-testid="status-bar-action">
        {previewing ? "click to send" : ""}
      </Action>
    </Bar>
  );
}
