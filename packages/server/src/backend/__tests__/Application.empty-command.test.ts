/**
 * Wave 5: empty-command short-circuit. An empty command line
 * (text: '') routes to a dispatch-response carrying only a
 * prompt-refresh Note — no controller dispatch, no controller
 * side-effects, no parser. MUD-style "press Enter for a fresh
 * prompt."
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Application } from '../Application';
import { ConnectionManager } from '../ConnectionManager';
import Avatar from '../../mud/obj/Avatar';
import type { IBackend } from '../IBackend';
import type Interactive from '../../mud/obj/Interactive';
import type { Envelope, EnvelopeTemplate } from '@saxonberg/types';

interface FakeBackend extends IBackend {
  sent: Array<{ socketId: string; message: unknown }>;
  envelopes: Array<{ socketId: string; envelope: unknown }>;
}

function makeFakeBackend(): FakeBackend {
  const sent: FakeBackend['sent'] = [];
  const envelopes: FakeBackend['envelopes'] = [];
  return {
    sent,
    envelopes,
    sendMessageToSocket(socketId, message) {
      sent.push({ socketId, message });
    },
    sendEnvelopeToSocket(socketId, envelope) {
      envelopes.push({ socketId, envelope });
    },
    async handleProviderAuth() {},
  };
}

function makeFakeAvatar(): Avatar {
  // Construct a fake Avatar that satisfies the inbound handler's
  // capability + template-path checks (`isCommandGiver` via the
  // prototype chain, `isAvatarStuff` via the `/obj/Avatar/` prefix)
  // and implements the methods Application reads.
  const a = Object.create(Avatar.prototype) as Avatar;
  // executeCommand should NOT be called on empty input — the
  // short-circuit must skip it. Spy to confirm.
  Object.assign(a, {
    getTemplatePath: () => `${Avatar.TEMPLATE_PATH_PREFIX}test`,
    executeCommand: vi.fn().mockResolvedValue(undefined),
    getContainer: () => ({}), // non-null
    getInteractives: () => new Set(),
  });
  return a;
}

function makeFakeInteractive(socketId: string, holder: unknown): Interactive {
  let counter = 0;
  return {
    getSocketId: () => socketId,
    getHolder: () => holder,
    nextFrameId: () => ++counter,
  } as unknown as Interactive;
}

describe('Application — empty command short-circuit', () => {
  let app: Application;
  let backend: FakeBackend;

  beforeEach(() => {
    app = Application.get();
    backend = makeFakeBackend();
    app.initialize(backend);
    ConnectionManager.get();
  });

  it('empty command text emits a refresh-only dispatch-response', async () => {
    const avatar = makeFakeAvatar();
    const interactive = makeFakeInteractive('sock-1', avatar);
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );

    // Promise to wait for: send empty command.
    app.processUserMessage('sock-1', {
      type: 'command',
      payload: { text: '' },
    });

    // No executeCommand call.
    expect((avatar.executeCommand as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(
      0,
    );

    // One envelope shipped, carrying only the prompt-refresh Note.
    expect(backend.envelopes).toHaveLength(1);
    const env = backend.envelopes[0]!.envelope as Envelope;
    expect(env.type).toBe('dispatch-response');
    expect((env as { outcome: { status: string } }).outcome.status).toBe('ok');
    const notes = (env as { outcome: { notes: unknown[] } }).outcome.notes;
    expect(notes).toHaveLength(1);
    expect((notes[0] as { kind: string }).kind).toBe('prompt-refresh');
  });

  it('whitespace-only command also short-circuits', async () => {
    const avatar = makeFakeAvatar();
    const interactive = makeFakeInteractive('sock-1', avatar);
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );

    app.processUserMessage('sock-1', {
      type: 'command',
      payload: { text: '   ' },
    });

    expect((avatar.executeCommand as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(
      0,
    );
    expect(backend.envelopes).toHaveLength(1);
  });

  it('non-empty command still dispatches normally', async () => {
    const avatar = makeFakeAvatar();
    const interactive = makeFakeInteractive('sock-1', avatar);
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );

    app.processUserMessage('sock-1', {
      type: 'command',
      payload: { text: 'look' },
    });

    expect(
      (avatar.executeCommand as unknown as { mock: { calls: unknown[] } }).mock
        .calls.length,
    ).toBeGreaterThan(0);
  });

  // Touch the EnvelopeTemplate import so the linter is happy.
  void ({} as EnvelopeTemplate);
});
