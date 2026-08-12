/**
 * `DroppedRow` — what is true when the link is not up.
 *
 * ## ⭐ It claims the ENTIRE first row
 *
 * On a phone you are usually not looking. A dropped socket in a MUD
 * costs you whatever you were mid-way through, so the bar must not
 * understate it — and the fixed facts are exactly what a dead link
 * makes meaningless anyway. Seal, connection chip and identity yield.
 *
 * ## ⭐⭐ It says what is true, which is not what the art says
 *
 * The reference art's dropped panel is the most persuasive in the set
 * and the one that most overpromises: *"2 commands held · retry in 4 s"*
 * with a footer listing the commands it kept. **No such queue exists.**
 * `WebSocketClient.send()` logs an error and drops the message. Building
 * one is an offline queue with ordering, expiry and replay-safety
 * questions — *is `north` still the right command forty seconds later?*
 * — which is a real feature deserving its own requirements, not a chrome
 * build's side effect.
 *
 * So this row reports the inversion:
 *
 * | reported | source |
 * |---|---|
 * | reconnecting or dropped | `connection.link` |
 * | the retry countdown | `connection.retryAt`, live |
 * | a manual retry | the existing `reconnectNow` path |
 * | how long since the last frame | frame timestamps |
 * | ⭐ **that commands sent now will not arrive** | the truth |
 *
 * ⭐ **That last row is the inversion worth making.** The art comforts —
 * *we kept your commands*. The truth is bleaker and strictly more
 * actionable: **they are dropped**. Telling a player their input is
 * going nowhere lets them stop typing; a fabricated count of things
 * allegedly saved lets them keep typing into a void and believe it is
 * being kept. It is also the sentence that makes the queue's absence
 * VISIBLE rather than silently wrong — and when the queue is built,
 * this is the row it replaces.
 *
 * ⚠ A test asserts no "held" count is rendered, by regex. The absence
 * of a promise has to be guarded or it comes back as a placeholder.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import { Figure, tokens, type FigureState } from "../ui";
import { formatDuration } from "./ConnectionChip";

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.sm} ${tokens.space.md};
  min-height: 44px;
  background: ${tokens.color.surfaceAlt};
  border-bottom: 1px solid ${tokens.color.danger};
`;

const TopLine = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  min-width: 0;
`;

const State = styled.span`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.danger};
  flex: none;
`;

/**
 * ⚠ The honest replacement for a fabricated "N held". Not styled as a
 * warning ornament — it is the most useful fact on the row.
 */
const Warning = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fg};
  min-width: 0;
`;

const Figures = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  flex-wrap: wrap;
  min-width: 0;
`;

const Retry = styled.button`
  flex: none;
  min-height: 44px;
  padding: 0 ${tokens.space.md};
  background: ${tokens.color.primary};
  border: none;
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.onField};
  font: inherit;
  font-size: ${tokens.font.small};
  cursor: pointer;
`;

/** `4s` / `12s`. Rounded UP, so it never reads 0s while still waiting. */
export function formatCountdown(msRemaining: number): string {
  return `${Math.max(0, Math.ceil(msRemaining / 1000))}s`;
}

export const DroppedRow: React.FC = () => {
  const link = useStore((s) => s.connection.link);
  const retryAt = useStore((s) => s.connection.retryAt);
  const frames = useStore((s) => s.frames);
  const [now, setNow] = React.useState(() => Date.now());

  /*
   * ⚠ A 1 Hz tick, and it is bounded to this component's lifetime —
   * which is bounded to the link being down. The countdown is the one
   * figure here that MUST move: a static "retry in 4s" that stayed at 4
   * would be a worse lie than not showing it, since it looks live.
   */
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const countdown: FigureState =
    retryAt === undefined
      ? // ⚠ `empty` with a reason, not a fabricated 0. Once the machine
        // has given up there is no NEXT attempt to count down to, and a
        // ticking clock against a link that will never retry on its own
        // would be the most misleading figure on the screen.
        {
          state: "empty",
          reason:
            link === "dropped"
              ? "no further attempt — retry is yours to make"
              : "no attempt scheduled",
        }
      : { state: "live", value: formatCountdown(retryAt - now) };

  const last = frames[frames.length - 1];
  const sinceLastFrame: FigureState =
    last === undefined
      ? { state: "empty", reason: "no frame has arrived this session" }
      : { state: "live", value: formatDuration(now - last.timestamp) };

  return (
    <Row role="status" data-testid="dropped-row">
      <TopLine>
        <State data-testid="dropped-state">
          {link === "dropped" ? "Disconnected" : "Reconnecting"}
        </State>
        {/*
         * ⭐ The sentence the art replaced with a comforting fiction.
         * There is no queue; anything typed now is discarded, and
         * saying so is strictly more useful than a count of things
         * allegedly saved.
         */}
        <Warning data-testid="dropped-truth">
          Commands sent now will not arrive.
        </Warning>
      </TopLine>
      <Figures>
        <Figure variant="row" label="retry in" figure={countdown} />
        <Figure variant="row" label="last frame" figure={sinceLastFrame} />
        <Retry
          type="button"
          data-testid="dropped-retry"
          // ⚠ The EXISTING manual path — resets the backoff and
          // reconnects from scratch. Not a second reconnect
          // implementation living in the chrome.
          onClick={() => websocketClient.reconnectNow()}
        >
          Retry now
        </Retry>
      </Figures>
    </Row>
  );
};
