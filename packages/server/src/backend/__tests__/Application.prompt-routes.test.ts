/**
 * Wave 3: Application.processUserMessage routes prompt-response /
 * prompt-cancel to PromptApi. handleUserDisconnect calls
 * PromptApi.cancelAll BETWEEN MqlSubscriptionApi.cancelAllForInteractive
 * and ConnectionManager.removeInteractive.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Application } from '../Application';
import { ConnectionManager } from '../ConnectionManager';
import { PromptApi } from '../../mud/api/prompt';
import { MqlSubscriptionApi } from '../../mud/api/mql-subscription';
import type { IBackend } from '../IBackend';
import type Interactive from '../../mud/obj/Interactive';

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
    async handleAuthenticationSuccess() {},
  };
}

function makeFakeInteractive(socketId: string): Interactive {
  let counter = 0;
  return {
    getSocketId: () => socketId,
    getHolder: () => null,
    nextFrameId: () => ++counter,
  } as unknown as Interactive;
}

describe('Application — prompt routes', () => {
  let app: Application;

  beforeEach(() => {
    app = Application.get();
    app.initialize(makeFakeBackend());
    ConnectionManager.get();
  });

  it('prompt-response routes to PromptApi.handleResponse', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(PromptApi, 'handleResponse')
      .mockImplementation(() => {});
    app.processUserMessage('sock-1', {
      type: 'prompt-response',
      payload: { promptId: 'p1', response: 'foo' },
    });
    expect(spy).toHaveBeenCalledWith(interactive, {
      promptId: 'p1',
      response: 'foo',
    });
    spy.mockRestore();
  });

  it('prompt-cancel routes to PromptApi.handleCancel', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(PromptApi, 'handleCancel')
      .mockImplementation(() => {});
    app.processUserMessage('sock-1', {
      type: 'prompt-cancel',
      payload: { promptId: 'p1' },
    });
    expect(spy).toHaveBeenCalledWith(interactive, { promptId: 'p1' });
    spy.mockRestore();
  });

  it('malformed prompt-response payload drops silently', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(PromptApi, 'handleResponse')
      .mockImplementation(() => {});
    app.processUserMessage('sock-1', {
      type: 'prompt-response',
      payload: { promptId: 'p1' }, // missing response
    });
    app.processUserMessage('sock-1', {
      type: 'prompt-response',
      payload: { response: 'foo' }, // missing promptId
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('malformed prompt-cancel payload drops silently', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(PromptApi, 'handleCancel')
      .mockImplementation(() => {});
    app.processUserMessage('sock-1', {
      type: 'prompt-cancel',
      payload: {}, // missing promptId
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handleUserDisconnect cancels MQL then prompts then removes', () => {
    const interactive = makeFakeInteractive('sock-d');
    const getSpy = vi
      .spyOn(ConnectionManager.get(), 'getInteractive')
      .mockReturnValue(interactive);
    const mqlSpy = vi
      .spyOn(MqlSubscriptionApi, 'cancelAllForInteractive')
      .mockImplementation(() => {});
    const promptSpy = vi
      .spyOn(PromptApi, 'cancelAll')
      .mockImplementation(() => 0);
    const removeSpy = vi
      .spyOn(ConnectionManager.get(), 'removeInteractive')
      .mockReturnValue(true);

    app.handleUserDisconnect('sock-d');

    expect(mqlSpy).toHaveBeenCalledWith(interactive);
    expect(promptSpy).toHaveBeenCalledWith(interactive, 'host-disconnected');
    expect(removeSpy).toHaveBeenCalledWith('sock-d');

    // Order: MQL → Prompt → remove.
    const mqlOrder = mqlSpy.mock.invocationCallOrder[0]!;
    const promptOrder = promptSpy.mock.invocationCallOrder[0]!;
    const removeOrder = removeSpy.mock.invocationCallOrder[0]!;
    expect(mqlOrder).toBeLessThan(promptOrder);
    expect(promptOrder).toBeLessThan(removeOrder);

    getSpy.mockRestore();
    mqlSpy.mockRestore();
    promptSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
