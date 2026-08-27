/**
 * ⭐ Per-socket inbound sequencing — **two lanes**.
 *
 * A socket's messages process in arrival order, so a player's commands
 * cannot overtake each other. That is right for commands — and it
 * **deadlocked every interactive prompt**: a command that raises a
 * prompt does not settle until the prompt is answered, so putting the
 * ANSWER in that lane means `prompt-response` waits for the command,
 * which waits for `prompt-response`.
 *
 * The symptom was silent and total: the client sent a well-formed
 * frame, nothing errored, nothing logged, and `forum post` /
 * `wiki create` hung forever. Found by driving a browser and tapping
 * `WebSocket.prototype.send`.
 *
 * A reply is addressed by `promptId` rather than by position, so it
 * rides a **second lane**: never waiting on a command, still ordered
 * against other replies. Bypassing sequencing altogether would also
 * have fixed the deadlock, and would have let a reply interleave with
 * an unrelated queued command — the last test here is what keeps that
 * from creeping back.
 *
 * Driven through `Backend` deliberately: the transport is where a real
 * frame enters, and this asserts the whole path rather than the
 * sequencer in isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Backend } from '../../../../../backend/Backend';
import { Application } from '../../../../../backend/Application';
import { ConnectionManager } from '../../../../../backend/ConnectionManager';

/** Feed a raw frame in the way the socket's `message` event does. */
function deliver(backend: Backend, socketId: string, msg: unknown): void {
  (
    backend as unknown as {
      handleWebSocketMessage(id: string, data: Buffer): void;
    }
  ).handleWebSocketMessage(socketId, Buffer.from(JSON.stringify(msg)));
}

describe('ConnectionLogic — inbound sequencing lanes', () => {
  let backend: Backend;
  let seen: string[];
  let releaseCommand: (() => void) | null;

  beforeEach(() => {
    seen = [];
    releaseCommand = null;
    // Singleton by design; the suite drives the real instance and
    // only replaces the Application it dispatches into.
    backend = Backend.get();
    const app = Application.get();
    // A command that BLOCKS until released — the shape of any command
    // that raises a prompt and awaits the answer.
    vi.spyOn(app, 'processUserMessage').mockImplementation(
      async (_socketId: string, message: { type: string }) => {
        seen.push(message.type);
        if (message.type === 'command') {
          await new Promise<void>((res) => {
            releaseCommand = res;
          });
        }
      },
    );
    (backend as unknown as { application: Application }).application = app;
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      {} as never,
    );
  });

  it('⭐ a prompt-response is processed while a command is still awaiting', async () => {
    deliver(backend, 'sock-1', { type: 'command', payload: { text: 'wiki create x' } });
    await new Promise((r) => setTimeout(r, 10));
    expect(seen).toEqual(['command']);

    // The command has NOT settled — it is waiting for this very answer.
    deliver(backend, 'sock-1', {
      type: 'prompt-response',
      payload: { promptId: 'p1', response: 'the body' },
    });
    await new Promise((r) => setTimeout(r, 10));

    // Before the fix this was still `['command']` — forever.
    expect(seen).toEqual(['command', 'prompt-response']);
    releaseCommand?.();
  });

  it('a prompt-cancel is out-of-band too — the X must always work', async () => {
    deliver(backend, 'sock-1', { type: 'command', payload: { text: 'x' } });
    await new Promise((r) => setTimeout(r, 10));
    deliver(backend, 'sock-1', {
      type: 'prompt-cancel',
      payload: { promptId: 'p1' },
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(seen).toContain('prompt-cancel');
    releaseCommand?.();
  });

  it('⚠ everything else KEEPS its arrival-order guarantee', async () => {
    // The fix must not become "nothing is ordered". A second command
    // still waits for the first.
    deliver(backend, 'sock-1', { type: 'command', payload: { text: 'first' } });
    await new Promise((r) => setTimeout(r, 10));
    deliver(backend, 'sock-1', { type: 'ping', payload: {} });
    await new Promise((r) => setTimeout(r, 10));
    expect(seen).toEqual(['command']);

    releaseCommand?.();
    await new Promise((r) => setTimeout(r, 10));
    expect(seen).toEqual(['command', 'ping']);
  });

  it('⭐ replies keep their order AGAINST EACH OTHER', async () => {
    // The second lane is a lane, not a bypass. Two answers sent in
    // order must land in order — otherwise a stacked prompt could be
    // resolved by the wrong reply under load.
    let releaseFirst: (() => void) | null = null;
    const app = Application.get();
    vi.spyOn(app, 'processUserMessage').mockImplementation(
      async (_socketId: string, message: { type: string }) => {
        seen.push(message.type);
        if (seen.filter((s) => s === 'prompt-response').length === 1) {
          await new Promise<void>((res) => {
            releaseFirst = res;
          });
        }
      },
    );

    deliver(backend, 'sock-2', {
      type: 'prompt-response',
      payload: { promptId: 'p1', response: 'a' },
    });
    await new Promise((r) => setTimeout(r, 10));
    deliver(backend, 'sock-2', {
      type: 'prompt-cancel',
      payload: { promptId: 'p2' },
    });
    await new Promise((r) => setTimeout(r, 10));

    // The second reply waited for the first.
    expect(seen).toEqual(['prompt-response']);
    (releaseFirst as unknown as () => void)?.();
    await new Promise((r) => setTimeout(r, 10));
    expect(seen).toEqual(['prompt-response', 'prompt-cancel']);
  });

  it('⚠ a reply does NOT interleave with a queued command', async () => {
    // The reason for a second lane rather than a bypass: with a
    // bypass, this reply would run while `first` was still in flight.
    // Here `first` blocks its own lane and the reply runs — that is
    // the point — but the QUEUED second command still waits for it,
    // so nothing overtakes anything within a lane.
    deliver(backend, 'sock-3', { type: 'command', payload: { text: 'first' } });
    await new Promise((r) => setTimeout(r, 10));
    deliver(backend, 'sock-3', { type: 'command', payload: { text: 'second' } });
    deliver(backend, 'sock-3', {
      type: 'prompt-response',
      payload: { promptId: 'p1', response: 'x' },
    });
    await new Promise((r) => setTimeout(r, 10));

    expect(seen).toEqual(['command', 'prompt-response']);
    releaseCommand?.();
  });
});