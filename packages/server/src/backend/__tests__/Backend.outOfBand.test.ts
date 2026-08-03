/**
 * ⭐ Prompt replies must NOT queue behind the command awaiting them.
 *
 * `handleWebSocketMessage` serializes each socket's inbound messages by
 * chaining every handler onto the previous one, so they process in
 * arrival order. That is right for commands — and it **deadlocked every
 * interactive prompt**: a command that raises a prompt does not settle
 * until the prompt is answered, so chaining the ANSWER behind it means
 * `prompt-response` waits for the command, which waits for
 * `prompt-response`.
 *
 * The symptom was silent and total: the client sent a well-formed
 * frame, nothing errored, nothing logged, and `forum post` /
 * `wiki create` hung forever. Found by driving a browser and tapping
 * `WebSocket.prototype.send`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Backend } from '../Backend';
import { Application } from '../Application';
import { ConnectionManager } from '../ConnectionManager';

/** Feed a raw frame in the way the socket's `message` event does. */
function deliver(backend: Backend, socketId: string, msg: unknown): void {
  (
    backend as unknown as {
      handleWebSocketMessage(id: string, data: Buffer): void;
    }
  ).handleWebSocketMessage(socketId, Buffer.from(JSON.stringify(msg)));
}

describe('Backend — out-of-band inbound messages', () => {
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
});
