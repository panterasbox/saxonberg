/**
 * Ping handler — app-level latency probe.
 *
 * The browser's WebSocket ping/pong is opaque from JS, so the
 * cockpit needs its own ping to measure RTT.
 *
 * ⭐ The reply carries **both clocks**, and that is the whole fix:
 *
 *   - `timestamp` — the SERVER's, unchanged, because
 *     `Application.test.ts` pins it and nothing gains from moving it.
 *   - `clientTimestamp` — the client's own send stamp, echoed back
 *     verbatim.
 *
 * ⚠ The original reply carried only the server's clock, which cannot
 * measure a round trip: subtracting it from `Date.now()` measures the
 * two machines' **clock skew** plus half a trip, not the trip. The
 * client could instead remember its own send time in a private slot —
 * but that breaks the moment two pings are ever in flight, and it puts
 * a correctness-critical fact in the one place that cannot observe
 * whether the reply it got belongs to the ping it sent. Echoing the
 * stamp makes each pong **self-describing**, so the pairing is carried
 * by the protocol rather than reconstructed beside it.
 *
 * The stamp is echoed, never trusted: it is the client's own number
 * coming home, used only to subtract from the client's own clock.
 * Nothing server-side reads it.
 *
 * No `echo` handler — vestigial debug; dropped during the
 * inbound/ refactor. Use `curl` if you need a raw transport
 * test.
 */

import type { InboundHandler } from './index';

export const handlePing: InboundHandler = (ctx, message) => {
  const sent = (message.payload as { timestamp?: unknown } | undefined)
    ?.timestamp;
  ctx.backend.sendMessageToSocket(ctx.socketId, {
    type: 'pong',
    payload: {
      timestamp: Date.now(),
      // Absent rather than null when the ping carried no stamp — the
      // client's own "no round trip to report" branch is the honest
      // handling, and a `0` here would defeat it.
      ...(typeof sent === 'number' ? { clientTimestamp: sent } : {}),
    },
  });
};
