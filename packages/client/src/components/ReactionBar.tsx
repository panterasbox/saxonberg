/**
 * ReactionBar — the on-screen reaction treatment for one transcript
 * message, keyed by the message's `commandId`.
 *
 * Reads the live `reactions` store slice (fed by `reaction-delta`). Two
 * visual modes off the same data:
 *
 *  - **Always-on indicator** (below threshold): small tag-grouped
 *    chips with running counts — `😄 2  👏 1  nod 1`.
 *  - **Counter + train** (`aggregated`, at/above threshold): a rising
 *    total, the tag buckets, and the per-recipient familiar-biased
 *    sample (recognized reactors by name), with an Expand pull for the
 *    full set.
 *
 * Counts are authoritative absolutes — the store replaces, never sums;
 * this component just renders the current state and pulses on change.
 *
 * A tiny quick-react row (a few emoji) emits `react --msg <gutter#>
 * ;<verb>` for this row — the server resolves the gutter → commandId.
 *
 * See docs/subsystems/reactions.md.
 */

import { useEffect, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { useStore, type Frame } from "../store/index";
import { tokens } from "./ui";
import { expandReactors } from "../store/reactionActions";

/** Topics whose frames are reactable acts (mirrors REACTABLE_TOPICS). */
const REACTABLE_PREFIXES = [
  "world.speech.",
  "world.expression.emote",
  "world.chat.message",
];

function isReactableTopic(topic: string): boolean {
  return REACTABLE_PREFIXES.some((p) => topic.startsWith(p));
}

/** The quick-react palette — verb + glyph the affordance offers. */
const QUICK = [
  { verb: "smile", emoji: "😄" },
  { verb: "laugh", emoji: "😂" },
  { verb: "applaud", emoji: "👏" },
  { verb: "nod", emoji: "👍" },
  { verb: "frown", emoji: "🙁" },
];

const pulse = keyframes`
  0%   { transform: scale(1); }
  35%  { transform: scale(1.22); }
  100% { transform: scale(1); }
`;

// Inline trailing widget — flows after the message text on the SAME
// line (no dedicated row). Children space themselves with a leading
// margin so an empty bar (no chips + hover-only "+") adds zero footprint
// after the message.
const Bar = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  & > * {
    margin-left: 0.4em;
    vertical-align: middle;
  }
`;

const Chip = styled.button<{ $pulse: boolean; $mine: boolean }>`
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: ${tokens.space.xs};
  padding: 1px ${tokens.space.sm};
  border: 1px solid
    ${(p) => (p.$mine ? tokens.color.accent : tokens.color.borderMuted)};
  border-radius: 999px;
  background: ${(p) =>
    p.$mine ? tokens.color.primaryActive : tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  line-height: 1.4;
  font-size: ${tokens.font.small};
  cursor: pointer;
  &:hover {
    border-color: ${tokens.color.accent};
    background: ${tokens.color.actionBgHover};
  }
  ${(p) =>
    p.$pulse &&
    css`
      animation: ${pulse} 320ms ease-out;
    `}
`;

const Counter = styled.span<{ $pulse: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.space.xs};
  font-weight: 600;
  color: ${tokens.color.accent};
  ${(p) =>
    p.$pulse &&
    css`
      animation: ${pulse} 320ms ease-out;
    `}
`;

const Names = styled.span`
  color: ${tokens.color.fgMuted};
`;

const MiniButton = styled.button`
  appearance: none;
  border: 1px solid ${tokens.color.borderMuted};
  background: transparent;
  color: ${tokens.color.fgMuted};
  border-radius: 999px;
  padding: 0 ${tokens.space.sm};
  line-height: 1.5;
  cursor: pointer;
  font-size: ${tokens.font.small};
  &:hover {
    color: ${tokens.color.accentHover};
    border-color: ${tokens.color.borderEmphasis};
  }
`;

/**
 * The revealed state of the react "+" affordance. Shared so `FrameRow`'s
 * `:hover` rule and the focus/open states here stay in lockstep.
 */
export const REVEAL_REACTION_ADD = css`
  position: relative;
  width: auto;
  height: auto;
  overflow: visible;
  clip: auto;
  clip-path: none;
  white-space: nowrap;
`;

// Carries the `reaction-add` class. At rest it is **visually hidden but
// focusable** (clipped to 1px, kept in the layout-out-of-flow so it adds
// no inline footprint — NOT `display:none`, which would drop it from the
// tab order). It reveals on row hover (FrameRow's rule), on keyboard
// focus (`:focus-within` — so Tab reaches the "+"), or while the palette
// is open (`$open`, so moving the mouse to pick an emoji can't hide it).
const AddWrap = styled.span<{ $open: boolean }>`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  align-items: center;

  &:focus-within {
    ${REVEAL_REACTION_ADD}
  }
  ${(p) => p.$open && REVEAL_REACTION_ADD}
`;

const Palette = styled.div`
  position: absolute;
  bottom: 120%;
  left: 0;
  display: flex;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  z-index: 5;
`;

const PaletteBtn = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 15px;
  padding: 1px 2px;
  border-radius: ${tokens.radius.sm};
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

interface ReactionBarProps {
  frame: Frame;
  /** Same command-bus handlers every clickable in the client uses: the
   *  preview fills the command bar on hover, the click sends. */
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}

export function ReactionBar({
  frame,
  onCommandClick,
  onCommandPreview,
}: ReactionBarProps) {
  const commandId = frame.commandId;
  const act = useStore((s) =>
    commandId ? s.reactions[commandId] : undefined,
  );
  const moved = useStore((s) =>
    commandId ? s.reactionMoved[commandId] : undefined,
  );
  const expanded = useStore((s) =>
    commandId ? s.reactionExpansions[commandId] : undefined,
  );
  const [open, setOpen] = useState(false);

  // Pulse the counts briefly whenever the act moves.
  const [pulsing, setPulsing] = useState(false);
  const prevMoved = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (moved !== undefined && moved !== prevMoved.current) {
      prevMoved.current = moved;
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 340);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [moved]);

  // The bar attaches only to genuine reactable act lines: skip frames
  // with no commandId, skip a reaction's own line (`inReactionTo` set —
  // a reaction is never itself reactable), and skip non-act topics
  // (e.g. the command-echo line, which shares the act's commandId).
  if (
    !commandId ||
    frame.inReactionTo !== undefined ||
    !isReactableTopic(frame.topic)
  ) {
    return null;
  }

  const mine = act?.mine ?? [];
  const isMine = (verb: string) => mine.includes(verb);

  // The command a reaction affordance sends, routed through the global
  // command-bus handlers (preview-on-hover, send-on-click) like every
  // other clickable in the client — never a direct websocket send.
  // Reacting is add-only; an emote the viewer already reacted with
  // toggles OFF via `--remove` (the explicit un-react op).
  const cmd = (verb: string) =>
    `react ${isMine(verb) ? "--remove " : ""}--msg ${frame.frameId} ;${verb}`;
  const send = (verb: string) => {
    onCommandClick(cmd(verb));
    setOpen(false);
  };
  const preview = (verb: string | null) =>
    onCommandPreview(verb === null ? null : cmd(verb));

  const total = act?.total ?? 0;
  const buckets = act?.buckets ?? [];
  const sample = act?.sample ?? [];
  const aggregated = act?.aggregated ?? false;

  return (
    <Bar>
      {aggregated && (
        <Counter $pulse={pulsing} title="Reactions on this act">
          ✦ {total} reactions
        </Counter>
      )}

      {buckets.map((b) => (
        <Chip
          key={b.tag}
          $pulse={pulsing}
          $mine={isMine(b.emote)}
          title={
            isMine(b.emote)
              ? `${b.emote} ×${b.count} — you reacted; click to remove`
              : `${b.emote} ×${b.count} — click to react`
          }
          onClick={() => send(b.emote)}
          onMouseEnter={() => preview(b.emote)}
          onMouseLeave={() => preview(null)}
          onFocus={() => preview(b.emote)}
          onBlur={() => preview(null)}
        >
          {b.emoji ? b.emoji : b.emote} {b.count}
        </Chip>
      ))}

      {sample.length > 0 && (
        <Names>
          {sample.map((s) => s.reactorName).join(", ")}
          {aggregated && total > sample.length
            ? ` +${total - sample.length}`
            : ""}
        </Names>
      )}

      {aggregated && (
        <MiniButton
          onClick={() =>
            commandId &&
            expandReactors(commandId, `exp-${commandId}-${Date.now()}`)
          }
          title="Show everyone who reacted"
        >
          expand
        </MiniButton>
      )}

      {expanded && expanded.length > 0 && (
        <Names>[ {expanded.map((e) => e.reactorName).join(", ")} ]</Names>
      )}

      {isReactableTopic(frame.topic) && frame.frameId !== undefined && (
        <AddWrap className="reaction-add" $open={open}>
          <MiniButton onClick={() => setOpen((o) => !o)} title="React">
            ＋
          </MiniButton>
          {open && (
            <Palette>
              {QUICK.map((q) => (
                <PaletteBtn
                  key={q.verb}
                  onClick={() => send(q.verb)}
                  onMouseEnter={() => preview(q.verb)}
                  onMouseLeave={() => preview(null)}
                  onFocus={() => preview(q.verb)}
                  onBlur={() => preview(null)}
                  title={q.verb}
                >
                  {q.emoji}
                </PaletteBtn>
              ))}
            </Palette>
          )}
        </AddWrap>
      )}
    </Bar>
  );
}
