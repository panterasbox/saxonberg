/**
 * Ping handler — app-level latency probe.
 *
 * The browser's WebSocket ping/pong is opaque from JS, so the
 * cockpit needs its own ping to measure RTT. Server replies with
 * a `pong` carrying a server-side timestamp; client subtracts to
 * derive latency.
 *
 * No `echo` handler — vestigial debug; dropped during the
 * inbound/ refactor. Use `curl` if you need a raw transport
 * test.
 */

import type { InboundHandler } from './index';

export const handlePing: InboundHandler = (ctx) => {
  ctx.backend.sendMessageToSocket(ctx.socketId, {
    type: 'pong',
    payload: { timestamp: Date.now() },
  });
};
