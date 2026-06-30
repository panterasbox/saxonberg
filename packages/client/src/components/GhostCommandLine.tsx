/**
 * GhostCommandLine — the always-on command-preview strip.
 *
 * Clicking any affordance previews-then-sends a real command — the
 * on-ramp from point-and-click to the CLI. Under per-bar input mode the
 * preview can't live *in* a command bar (a moded bar would prepend its
 * prefix, so the preview would lie about what sends, and with multiple
 * bars there's no single bar to preview into). So it lives here: a fixed,
 * command-styled strip (mono, a `>` glyph) placed beside the primary
 * command bar, so the "this is a thing you could type" lesson survives.
 *
 * Display-only, store-backed: `ghostPreview` is the hovered affordance's
 * exact command; `ghostFlash` is a transient post-action message (`›
 * <ran>` on click, `copied: …` on copy) shown briefly then cleared.
 */

import React, { useEffect } from "react";
import styled from "styled-components";
import { useStore } from "../store/index";
import { tokens } from "./ui";

const Strip = styled.div<{ $flash: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} ${tokens.space.xl};
  background: ${tokens.color.surfaceSunken};
  border-top: 1px solid ${tokens.color.border};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${(p) => (p.$flash ? tokens.color.accent : tokens.color.fgMuted)};
  min-height: 1.6rem;
  user-select: none;
  transition: color 150ms;
`;

const Glyph = styled.span`
  color: ${tokens.color.fgMuted};
`;

const Hint = styled.span`
  color: ${tokens.color.fgMuted};
  opacity: 0.6;
  font-style: italic;
`;

export function GhostCommandLine(): JSX.Element {
  const ghostPreview = useStore((s) => s.ghostPreview);
  const ghostFlash = useStore((s) => s.ghostFlash);
  const flashGhost = useStore((s) => s.flashGhost);

  // Auto-clear a flash after a beat so the line returns to its idle /
  // preview state. The store holds the message; the timer lives here.
  useEffect(() => {
    if (!ghostFlash) return;
    const t = window.setTimeout(() => flashGhost(""), 900);
    return () => window.clearTimeout(t);
  }, [ghostFlash, flashGhost]);

  const text = ghostFlash || ghostPreview;
  const flashing = Boolean(ghostFlash);

  return (
    <Strip $flash={flashing} aria-live="polite">
      <Glyph aria-hidden="true">{flashing ? "" : ">"}</Glyph>
      {text ? (
        <span>{text}</span>
      ) : (
        <Hint>hover a highlighted word to preview its command</Hint>
      )}
    </Strip>
  );
}
