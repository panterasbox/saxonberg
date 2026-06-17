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
import { reactToGutter, expandReactors } from "../store/reactionActions";

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

const Bar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
  margin: ${tokens.space.xs} 0 ${tokens.space.sm} 2.4rem;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const Chip = styled.span<{ $pulse: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.space.xs};
  padding: 1px ${tokens.space.sm};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: 999px;
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  line-height: 1.4;
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

const AddWrap = styled.span`
  position: relative;
  display: inline-flex;
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

export function ReactionBar({ frame }: { frame: Frame }) {
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

  const react = (verb: string) => {
    if (frame.frameId !== undefined) reactToGutter(frame.frameId, `;${verb}`);
    setOpen(false);
  };

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
        <Chip key={b.tag} $pulse={pulsing} title={`${b.emote} ×${b.count}`}>
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
        <AddWrap>
          <MiniButton onClick={() => setOpen((o) => !o)} title="React">
            ＋
          </MiniButton>
          {open && (
            <Palette>
              {QUICK.map((q) => (
                <PaletteBtn
                  key={q.verb}
                  onClick={() => react(q.verb)}
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
