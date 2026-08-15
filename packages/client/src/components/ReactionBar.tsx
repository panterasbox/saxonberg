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

import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import type { ReactionBucket } from "@saxonberg/types";
import { useStore, type Frame } from "../store/index";
import { tokens } from "./ui";
import { expandReactors } from "../store/reactionActions";
import { EmotePicker } from "./social/EmotePicker";
import { composeReactCommand, quickRow } from "./social/reactCommand";

/**
 * Whether a frame is a reactable act.
 *
 * ⚠⚠ **The server answers this; the client no longer guesses.** There
 * used to be a `REACTABLE_PREFIXES` array here "mirroring"
 * `ReactionApi.REACTABLE_TOPICS`. It stopped mirroring it: the server
 * added `act.combat` (a hit landing is a beat the room cheers) and the
 * list here never learned, so combat frames offered no reaction and
 * nothing failed — a mirror that has drifted looks exactly like a mirror
 * that has not. The set now arrives on the connection payload.
 *
 * An empty set means the server has not told us yet, and the honest
 * response to that is to offer nothing rather than to assume.
 */
function isReactableTopic(
  topic: string,
  reactable: ReadonlySet<string>,
): boolean {
  return reactable.has(topic);
}

/**
 * Chip hover text: the names of who reacted when the bucket is small
 * enough that the server sent them, otherwise just the count — plus the
 * click affordance.
 */
function chipTitle(b: ReactionBucket, mine: boolean): string {
  const who =
    b.reactors && b.reactors.length > 0
      ? b.reactors.join(", ")
      : `${b.count} reacted`;
  return `${who} — ${mine ? "click to remove yours" : "click to react"}`;
}

// ⚠ The quick-react palette used to be a hardcoded array of six
// `{ verb, emoji }` pairs. It is now DERIVED from the server's catalogue
// (`quickRow`), because a hardcoded pairing drifts from the catalogue
// with nothing failing when it does — and the design conventions rule
// out hardcoding "including just for now". `noHardcodedEmoji.test.ts`
// guards this file against the array coming back.

// Pulse strength is the `social.react.intensity` setting: `off` plays
// nothing, the rest scale the bump. (`vivid` is the "train"ّ end.)
type Intensity = "off" | "subtle" | "normal" | "vivid";
const mkPulse = (peak: number) => keyframes`
  0%   { transform: scale(1); }
  35%  { transform: scale(${peak}); }
  100% { transform: scale(1); }
`;
const PULSES: Record<Exclude<Intensity, "off">, ReturnType<typeof mkPulse>> = {
  subtle: mkPulse(1.1),
  normal: mkPulse(1.22),
  vivid: mkPulse(1.45),
};
const pulseCss = (intensity: Intensity, on: boolean) =>
  on && intensity !== "off"
    ? css`
        animation: ${PULSES[intensity]} 320ms ease-out;
      `
    : null;

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

const Chip = styled.button<{
  $pulse: boolean;
  $mine: boolean;
  $intensity: Intensity;
}>`
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
  ${(p) => pulseCss(p.$intensity, p.$pulse)}
`;

const Counter = styled.span<{ $pulse: boolean; $intensity: Intensity }>`
  display: inline-flex;
  align-items: center;
  gap: ${tokens.space.xs};
  font-weight: 600;
  color: ${tokens.color.accent};
  ${(p) => pulseCss(p.$intensity, p.$pulse)}
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

/**
 * The full palette's shell.
 *
 * ⚠⚠ **It anchors to whichever side keeps it on screen.** The `＋` sits
 * at the END of the message text, so on a long line it is far right — and
 * a left-anchored 30rem panel then ran past the transcript's edge,
 * clipping its own header and its SEND control and giving the transcript
 * a horizontal scrollbar. Found by driving.
 *
 * ⭐ Neither side works alone: right-anchoring breaks the short-message
 * case, where the `＋` is near the left edge and the panel would hang off
 * that side instead. So the side is MEASURED at open — see
 * `useEdgeAware` — and this styled component only obeys it.
 */
const FullPalette = styled.div<{ $alignRight: boolean }>`
  position: absolute;
  bottom: 120%;
  ${(p) => (p.$alignRight ? "right: 0;" : "left: 0;")}
  width: 30rem;
  max-width: min(80vw, 30rem);
  z-index: 6;
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

/**
 * Which side the full palette should hang from so it stays inside its
 * scroll container.
 *
 * ⚠ Measured after paint, not guessed from a breakpoint: the deciding
 * fact is where the `＋` ended up, which depends on the length of the
 * message it trails — nothing static can know that.
 */
function useEdgeAware(open: boolean): {
  ref: React.RefObject<HTMLDivElement>;
  alignRight: boolean;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    if (!open) {
      setAlignRight(false);
      return;
    }
    const el = ref.current;
    if (!el) return;
    // The nearest scrolling ancestor is the transcript; its right edge is
    // the boundary that matters, not the window's.
    const container =
      el.closest('[data-testid="terminal"]') ?? document.documentElement;
    const box = el.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    if (box.right > bounds.right) setAlignRight(true);
  }, [open]);

  return { ref, alignRight };
}

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
  const prefs = useStore((s) => s.reactionPrefs);
  const reactable = useStore((s) => s.reactableTopics);
  const catalogue = useStore((s) => s.emoteCatalogue);
  const selfAvatarId = useStore((s) => s.selfAvatarId);
  const [open, setOpen] = useState(false);
  // The full slot-aware palette, pulled from behind the quick row.
  const [full, setFull] = useState(false);
  const { ref: paletteRef, alignRight } = useEdgeAware(open && full);

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
    !isReactableTopic(frame.topic, reactable)
  ) {
    return null;
  }

  // `social.react.muteChannels` — no reaction widgets on chat lines.
  if (prefs.muteChannels && frame.topic.startsWith("speech.channel")) {
    return null;
  }

  const mine = act?.mine ?? [];
  const isMine = (verb: string) => mine.includes(verb);

  // The command a reaction affordance sends, routed through the global
  // command-bus handlers (preview-on-hover, send-on-click) like every
  // other clickable in the client — never a direct websocket send.
  // Reacting is add-only; an emote the viewer already reacted with
  // toggles OFF via `--remove` (the explicit un-react op).
  //
  // ⚠ A frame with no gutter number cannot be TARGETED — `--msg` needs
  // one. Its chips still render (the counts are true and worth seeing),
  // but they do not act: the old code interpolated the undefined
  // straight into the command and sent `--msg undefined`.
  const gutter = frame.frameId;
  const cmd = (verb: string): string | null =>
    gutter === undefined
      ? null
      : composeReactCommand({ frameId: gutter, verb, remove: isMine(verb) });
  const send = (verb: string) => {
    const c = cmd(verb);
    if (c === null) return;
    onCommandClick(c);
    setOpen(false);
    setFull(false);
  };
  const preview = (verb: string | null) =>
    onCommandPreview(verb === null ? null : cmd(verb));

  // The quick row is derived from the catalogue and ranked by what this
  // viewer actually reaches for; `mine` is a decent free signal until a
  // real recency list exists.
  const quick = quickRow(catalogue, mine);

  const total = act?.total ?? 0;
  const buckets = act?.buckets ?? [];
  const sample = act?.sample ?? [];
  const aggregated = act?.aggregated ?? false;
  // `subjectId` is the act author's stuffId, so this is "somebody
  // reacted to something I did" without the client guessing at it.
  const isSelfAct = act !== undefined && act.subjectId === selfAvatarId;

  return (
    <Bar>
      {aggregated && (
        /*
         * ⭐ Above the threshold the SERVER stops fanning out a prose
         * line per reaction (`suppressFanOut`), so this counter is the
         * only thing that tells you anything happened — and when the act
         * is your own, that is the thing you actually care about. The
         * two states are worded apart because "12 reactions" on a
         * stranger's line and "12 reactions to what you said" are
         * different pieces of news.
         *
         * ⚠ Both numbers are the server's `total`; nothing here sums.
         */
        <Counter
          $pulse={pulsing}
          $intensity={prefs.intensity}
          title={
            isSelfAct
              ? "Reactions to your act — the per-reaction lines are suppressed above the threshold"
              : "Reactions on this act"
          }
        >
          ✦ {total} {isSelfAct ? "reactions to yours" : "reactions"}
        </Counter>
      )}

      {buckets.map((b) => (
        <Chip
          key={b.tag}
          $pulse={pulsing}
          $intensity={prefs.intensity}
          $mine={isMine(b.emote)}
          title={chipTitle(b, isMine(b.emote))}
          onClick={() => send(b.emote)}
          onMouseEnter={() => preview(b.emote)}
          onMouseLeave={() => preview(null)}
          onFocus={() => preview(b.emote)}
          onBlur={() => preview(null)}
        >
          {b.emoji ?? b.emote} {b.count}
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

      {gutter !== undefined && quick.length > 0 && (
        <AddWrap className="reaction-add" $open={open}>
          <MiniButton
            onClick={() => {
              setOpen((o) => !o);
              setFull(false);
            }}
            title="React"
          >
            ＋
          </MiniButton>
          {open &&
            (full ? (
              /*
                The full palette. Same component the phone sheet renders,
                so an emote with grammar is reachable on both — the grid
                alone can only ever offer slotless verbs.
              */
              <FullPalette ref={paletteRef} $alignRight={alignRight}>
                <EmotePicker
                  frameId={gutter}
                  mine={mine}
                  onCommandClick={(c) => {
                    onCommandClick(c);
                    setOpen(false);
                    setFull(false);
                  }}
                  onCommandPreview={onCommandPreview}
                />
              </FullPalette>
            ) : (
              <Palette>
                {quick.map((q) => (
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
                <PaletteBtn
                  onClick={() => setFull(true)}
                  title="the full palette, with slots"
                >
                  all
                </PaletteBtn>
              </Palette>
            ))}
        </AddWrap>
      )}
    </Bar>
  );
}
