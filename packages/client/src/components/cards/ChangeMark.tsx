/**
 * ChangeMark — WHY a live surface just changed (navigation-server review).
 *
 * ⭐⭐ A card or a navigator section that changes on its own is magic unless
 * it says what changed it. Every push names the command(s) whose work
 * produced it (`subscription-delta.causes`), and that is the same id the
 * command's own lines in scrollback carry — so the cause is a LINE the
 * player already has, with every tool they already know (scrollback,
 * `recall`). Nothing about the cause is invented here.
 *
 * What it does, and nothing permanent: when the surface changes it glows
 * briefly and shows a small mark for a few seconds. Hover the mark: what
 * changed it. Tap it: the line, and "show in scrollback" scrolls the
 * transcript to it.
 *
 * - The cause line found → that line (the act's own line first).
 * - A command, but no line of it ever reached you → *you didn't see what
 *   changed this* (a door unlocked from the other side). Honest, and the
 *   perception gate comes free: the line exists only if you perceived it.
 * - No command at all → *time passed* (the clock: the weather, the hour).
 */

import React from "react";
import styled, { keyframes } from "styled-components";
import { useStore } from "../../store/index";
import type { Frame } from "../../store/index";
import { tokens } from "../ui";

/** How long the glow lasts, and how long the mark stays to be asked. */
const GLOW_MS = 1500;
const MARK_MS = 12000;

const glow = keyframes`
  from { box-shadow: 0 0 0 2px ${tokens.color.accent}; }
  to { box-shadow: 0 0 0 0 transparent; }
`;

const Wrap = styled.div<{ $glowing: boolean }>`
  position: relative;
  border-radius: 4px;
  ${({ $glowing }) => ($glowing ? `animation: ${glow.getName()} ${GLOW_MS}ms ease-out;` : "")}
`;

const Mark = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: ${tokens.color.accent};
  cursor: pointer;
`;

const Pop = styled.div`
  position: absolute;
  top: 14px;
  right: 0;
  z-index: 10;
  max-width: 280px;
  padding: ${tokens.space.xs} ${tokens.space.sm};
  border: 1px solid ${tokens.color.border};
  border-radius: 4px;
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  font-size: 0.85em;
`;

const Show = styled.button`
  margin-top: ${tokens.space.xs};
  padding: 0;
  border: none;
  background: none;
  color: ${tokens.color.accent};
  cursor: pointer;
  text-decoration: underline;
`;

/** The line a change's causes name: the act's own line first, then any its work made. */
function causeLine(frames: readonly Frame[], causes: readonly string[]): Frame | null {
  if (causes.length === 0) return null;
  const wanted = new Set(causes);
  let descended: Frame | null = null;
  for (let i = frames.length - 1; i >= 0; i--) {
    const f = frames[i]!;
    if (f.commandId !== undefined && wanted.has(f.commandId)) return f;
    if (descended === null && f.causingCommandId !== undefined && wanted.has(f.causingCommandId)) descended = f;
  }
  return descended;
}

/** A line's words, without its markup. */
function plain(body: string): string {
  return body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/** What to say about a change. */
export function describeCause(frames: readonly Frame[], causes: readonly string[]): { text: string; line: Frame | null } {
  if (causes.length === 0) return { text: "Time passed.", line: null };
  const line = causeLine(frames, causes);
  if (line === null) return { text: "You didn't see what changed this.", line: null };
  return { text: `Changed by: ${plain(line.body)}`, line };
}

export interface ChangeMarkProps {
  /** `card:<instanceId>` or `nav:<section>` — see the change slice. */
  surface: string;
  children: React.ReactNode;
}

export function ChangeMark({ surface, children }: ChangeMarkProps): React.ReactElement {
  const change = useStore((s) => s.surfaceChanges[surface]);
  const frames = useStore((s) => s.frames);
  const [now, setNow] = React.useState(() => Date.now());
  const [open, setOpen] = React.useState(false);

  // Re-render as the glow and the mark run out.
  React.useEffect(() => {
    if (!change) return;
    setNow(Date.now());
    const glowEnd = setTimeout(() => setNow(Date.now()), GLOW_MS);
    const markEnd = setTimeout(() => {
      setNow(Date.now());
      setOpen(false);
    }, MARK_MS);
    return () => {
      clearTimeout(glowEnd);
      clearTimeout(markEnd);
    };
  }, [change]);

  const age = change ? now - change.at : Infinity;
  const glowing = age < GLOW_MS;
  const marked = age < MARK_MS;
  const said = change && marked ? describeCause(frames, change.causes) : null;

  const showInScrollback = (): void => {
    if (!said?.line) return;
    const row = document.querySelector(`[data-frame-id="${CSS.escape(said.line.id)}"]`);
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
    setOpen(false);
  };

  return (
    <Wrap $glowing={glowing} data-testid={`change-${surface}`} data-changed={marked ? "true" : undefined}>
      {children}
      {said ? (
        <Mark
          type="button"
          aria-label="what changed this"
          title={said.text}
          data-testid={`change-mark-${surface}`}
          onClick={() => setOpen((o) => !o)}
        />
      ) : null}
      {said && open ? (
        <Pop role="status" data-testid={`change-why-${surface}`}>
          {said.text}
          {said.line ? (
            <div>
              <Show type="button" onClick={showInScrollback}>
                show in scrollback
              </Show>
            </div>
          ) : null}
        </Pop>
      ) : null}
    </Wrap>
  );
}
