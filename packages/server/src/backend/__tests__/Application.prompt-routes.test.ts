/**
 * Wave 3: Application.processUserMessage routes prompt-response /
 * prompt-cancel to the Interactive's own prompt surface.
 * handleUserDisconnect tears down substrate state BETWEEN lookup
 * and ConnectionManager.removeInteractive.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Application } from '../Application';
import { ConnectionManager } from '../ConnectionManager';
import type { IBackend } from '../IBackend';
import type Interactive from '../../mud/platform/idea/Interactive';

interface FakeBackend extends IBackend {
  sent: Array<{ socketId: string; message: unknown }>;
}

function makeFakeBackend(): FakeBackend {
  const sent: FakeBackend['sent'] = [];
  return {
    sent,
    sendMessageToSocket(socketId, message) {
      sent.push({ socketId, message });
    },
    sendEnvelopeToSocket() {},
    async handleProviderAuth() {},
  };
}

type FakeInteractive = Interactive & {
  handlePromptResponse: ReturnType<typeof vi.fn>;
  handlePromptCancel: ReturnType<typeof vi.fn>;
};

function makeFakeInteractive(socketId: string): FakeInteractive {
  let counter = 0;
  return {
    getSocketId: () => socketId,
    getHolder: () => null,
    nextFrameId: () => ++counter,
    teardownSubstrateState: () => {},
    handlePromptResponse: vi.fn(),
    handlePromptCancel: vi.fn(),
  } as unknown as FakeInteractive;
}

describe('Application — prompt routes', () => {
  let app: Application;

  beforeEach(() => {
    app = Application.get();
    app.initialize(makeFakeBackend());
    ConnectionManager.get();
  });

  it('prompt-response routes to interactive.handlePromptResponse', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = interactive.handlePromptResponse;
    app.processUserMessage('sock-1', {
      type: 'prompt-response',
      payload: { promptId: 'p1', response: 'foo' },
    });
    expect(spy).toHaveBeenCalledWith({
      promptId: 'p1',
      response: 'foo',
    });
  });

  it('prompt-cancel routes to interactive.handlePromptCancel', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = interactive.handlePromptCancel;
    app.processUserMessage('sock-1', {
      type: 'prompt-cancel',
      payload: { promptId: 'p1' },
    });
    expect(spy).toHaveBeenCalledWith({ promptId: 'p1' });
  });

  it('malformed prompt-response payload drops silently', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = interactive.handlePromptResponse;
    app.processUserMessage('sock-1', {
      type: 'prompt-response',
      payload: { promptId: 'p1' }, // missing response
    });
    app.processUserMessage('sock-1', {
      type: 'prompt-response',
      payload: { response: 'foo' }, // missing promptId
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('malformed prompt-cancel payload drops silently', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = interactive.handlePromptCancel;
    app.processUserMessage('sock-1', {
      type: 'prompt-cancel',
      payload: {}, // missing promptId
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('handleUserDisconnect tears down substrate state then removes', () => {
    // Teardown (incl. the MQL→…→prompt cancellation order) lives on
    // Interactive.teardownSubstrateState; Application triggers it before
    // removal. The cancellation order is asserted in Interactive's test.
    const interactive = makeFakeInteractive('sock-d');
    const teardownSpy = vi.fn();
    (
      interactive as unknown as { teardownSubstrateState: () => void }
    ).teardownSubstrateState = teardownSpy;
    const getSpy = vi
      .spyOn(ConnectionManager.get(), 'getInteractive')
      .mockReturnValue(interactive);
    const removeSpy = vi
      .spyOn(ConnectionManager.get(), 'removeInteractive')
      .mockReturnValue(true);

    app.handleUserDisconnect('sock-d');

    expect(teardownSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith('sock-d');

    // Order: teardown → remove.
    const teardownOrder = teardownSpy.mock.invocationCallOrder[0]!;
    const removeOrder = removeSpy.mock.invocationCallOrder[0]!;
    expect(teardownOrder).toBeLessThan(removeOrder);

    getSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
