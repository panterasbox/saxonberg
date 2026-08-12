/**
 * `ConnectionChip` — the top bar's always-visible connection surface,
 * and the popover behind it.
 *
 * ## ⚠ Composed, not grown
 *
 * `ConnectionIndicator` is **not touched**. It is silent when healthy —
 * a behaviour its own test pins by asserting the component renders
 * `null` — so it could never become an always-visible chip. Instead the
 * chip owns the healthy state and **delegates** the unhealthy one:
 *
 *     link === 'connected' ? <a dot and 'connected'> : <ConnectionIndicator />
 *
 * Three things follow, by construction rather than by care. The
 * indicator's test passes unmodified. There is exactly ONE rendering of
 * "Reconnecting…" / "Disconnected" in the tree, so the two surfaces
 * cannot disagree. And no dot is drawn twice — the chip's own dot
 * renders only in the connected branch, and the indicator brings its
 * own in the other.
 *
 * The rest of the reconnect machine — `ConnectionState`,
 * `setDisconnected`, the link vocabulary, backoff, `ReconnectBanner` —
 * is untouched. This build's work on it is presentation only; if one of
 * its tests needs to change, that is the signal that behaviour moved
 * where only presentation should have.
 *
 * ## The popover: two live rows, one hatched
 *
 * The chip expands to three readings, and two of them now have a
 * source:
 *
 * | row | state | why |
 * |---|---|---|
 * | this connection | **live** | derivable from a connect timestamp |
 * | round trip | **live** | measured by the heartbeat |
 * | frames behind | hatched | needs a server sequence number |
 *
 * ⭐⭐ **Round trip was hatched here, and its stated reason — that
 * nothing measured it and a ping/pong would have to be written — was
 * WRONG.** The protocol existed end to end the whole time:
 * `websocketClient.sendPing()` sent a client timestamp and
 * `backend/inbound/ping.ts` replied. What was missing was only that
 * nothing *called* one and nothing *handled* the other. So the hatch
 * was sending the next builder to write something already written —
 * precisely the failure the three-category hatch doctrine exists to
 * prevent: **a reason that sends you looking in the wrong place is
 * worse than no reason at all**, because it is confidently actionable
 * and wrong.
 *
 * The wrong claim is deleted rather than edited around, and this
 * comment deliberately paraphrases it rather than reproducing it:
 * `__tests__/roundTripReason.test.ts` greps the client source for the
 * exact string and fails if it survives anywhere, so quoting it here
 * would defeat the guard that keeps it gone.
 *
 * ⚠ Frames-behind stays hatched, and its reason is now the *only*
 * unmeasured claim here: there is no server sequence number, which is
 * genuinely missing rather than merely uncalled.
 *
 * The popover's own copy is what earns it a place: a dropped socket in
 * a MUD costs you whatever you were mid-way through, and the honest
 * version of that surface says which of its readings it can stand
 * behind.
 *
 * ⭐ The duration row says **"this connection"**, not "session". A
 * successful reconnect issues a fresh `connection-established`, so the
 * timestamp resets — and rather than paper over that with a fake
 * continuous session clock, the label names what is actually measured.
 */

import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { Figure, tokens, type FigureState } from "../ui";
import { ConnectionIndicator } from "./ConnectionIndicator";

const Wrap = styled.div`
  position: relative;
  flex: none;
`;

const ChipButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgDim};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  padding: 0.15rem ${tokens.space.sm};
  cursor: pointer;

  &:hover {
    border-color: ${tokens.color.border};
  }
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${tokens.color.accent};
  flex: none;
`;

const Popover = styled.div`
  position: absolute;
  top: calc(100% + ${tokens.space.xs});
  left: 0;
  z-index: 20;
  min-width: 22rem;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  box-shadow: 0 2px 8px ${tokens.color.shadow};
  padding: ${tokens.space.md};
`;

const Justification = styled.p`
  margin: 0 0 ${tokens.space.xs};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  line-height: 1.4;
`;

/**
 * `2h 14m` / `14m` / `9s`. Deliberately coarse: this is a reassurance
 * reading, not a stopwatch, and a ticking seconds field would demand a
 * 1 Hz re-render for no information.
 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}

/**
 * The round-trip reading, shared by the popover and the mobile bar so
 * the two surfaces cannot drift into disagreeing about the same
 * measurement.
 *
 * ⚠ `empty` with a reason before the first pong lands — **never `0`**.
 * A zero-millisecond round trip is not a thing that happens, so
 * printing one would be a fabricated figure claiming a perfect link.
 */
export function roundTripFigure(roundTripMs: number | undefined): FigureState {
  return roundTripMs === undefined
    ? { state: "empty", reason: "no round trip completed yet" }
    : { state: "live", value: `${roundTripMs} ms` };
}

export const ConnectionChip: React.FC = () => {
  const link = useStore((s) => s.connection.link);
  const connectedAt = useStore((s) => s.connection.connectedAt);
  const roundTripMs = useStore((s) => s.connection.roundTripMs);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const wrapRef = useRef<HTMLDivElement>(null);

  // ⚠ The tick lives inside the popover's open state — never a global
  // 1 Hz re-render of the whole bar for a figure nobody is looking at.
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [open]);

  // Click-away close. A popover that only closes by re-clicking its own
  // trigger is the one that ends up stuck open over the shelf.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const duration: FigureState =
    connectedAt === undefined
      ? // ⚠ `empty`, not a fabricated `0m`. Before the first connection
        // — and after a drop — there is no duration to report, and a
        // zero would be a claim the client cannot make.
        { state: "empty", reason: "no connection to measure" }
      : { state: "live", value: formatDuration(now - connectedAt) };

  return (
    <Wrap ref={wrapRef}>
      <ChipButton
        type="button"
        aria-label="Connection status"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {link === "connected" ? (
          <>
            <Dot aria-hidden="true" />
            <span>connected</span>
          </>
        ) : (
          // ⚠ Delegated — the ONE place the unhealthy vocabulary lives.
          <ConnectionIndicator />
        )}
      </ChipButton>
      {open ? (
        <Popover role="dialog" aria-label="Connection detail" data-testid="connection-popover">
          <Justification>
            A dropped socket in a MUD costs you whatever you were mid-way
            through. One of these three readings has nothing measuring it
            yet, and says so.
          </Justification>
          <Figure variant="row" label="this connection" figure={duration} />
          <Figure
            variant="row"
            label="round trip"
            figure={roundTripFigure(roundTripMs)}
          />
          <Figure
            variant="row"
            label="frames behind"
            figure={{
              state: "unwired",
              reason: "nothing measures it — needs a server sequence number",
            }}
          />
        </Popover>
      ) : null}
    </Wrap>
  );
};
