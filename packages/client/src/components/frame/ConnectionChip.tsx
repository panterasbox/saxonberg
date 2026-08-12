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
 * ## The popover: one live row, two hatched
 *
 * The chip expands to three readings, and only one of them has a
 * source:
 *
 * | row | state | why |
 * |---|---|---|
 * | this connection | **live** | derivable from a connect timestamp |
 * | round trip | hatched | nothing measures it; needs a ping/pong |
 * | frames behind | hatched | nothing measures it; needs a sequence number |
 *
 * ⚠ Adding a ping/pong and a frame sequence is real protocol work with
 * its own failure modes, and it belongs in its own build rather than
 * smuggled into a chrome pass. The popover's own copy is what earns it
 * a place: a dropped socket in a MUD costs you whatever you were
 * mid-way through, and the honest version of that surface says which of
 * its three readings it can actually stand behind.
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

export const ConnectionChip: React.FC = () => {
  const link = useStore((s) => s.connection.link);
  const connectedAt = useStore((s) => s.connection.connectedAt);
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
            through. Two of these three readings have nothing measuring
            them yet, and say so.
          </Justification>
          <Figure variant="row" label="this connection" figure={duration} />
          <Figure
            variant="row"
            label="round trip"
            figure={{
              state: "unwired",
              reason: "nothing measures it — needs a ping/pong",
            }}
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
