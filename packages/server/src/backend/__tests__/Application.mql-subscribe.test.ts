/**
 * Wave 5: Application.processUserMessage routes mql-subscribe /
 * mql-unsubscribe; handleUserDisconnect calls
 * MqlSubscriptionApi.cancelAllForInteractive before tearing down
 * the Interactive.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Application } from '../Application';
import { ConnectionManager } from '../ConnectionManager';
import { MqlSubscriptionApi } from '../../mud/api/mql-subscription';
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

function makeFakeInteractive(socketId: string): Interactive {
  let counter = 0;
  return {
    getSocketId: () => socketId,
    getHolder: () => null,
    nextFrameId: () => ++counter,
    teardownSubstrateState: () => {},
  } as unknown as Interactive;
}

describe('Application — MQL subscription routes', () => {
  let app: Application;

  beforeEach(() => {
    app = Application.get();
    app.initialize(makeFakeBackend());
    ConnectionManager.get();
  });

  it('mql-subscribe route reaches MqlSubscriptionApi.handleSubscribe', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(MqlSubscriptionApi, 'handleSubscribe')
      .mockImplementation(() => null);
    app.processUserMessage('sock-1', {
      type: 'mql-subscribe',
      payload: {
        type: 'mql-subscribe',
        subscriptionId: 's1',
        query: 'me',
        cardinality: 'one',
      },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        interactive,
        subscriptionId: 's1',
        query: 'me',
        cardinality: 'one',
      }),
    );
    spy.mockRestore();
  });

  it('mql-unsubscribe route reaches MqlSubscriptionApi.handleUnsubscribe', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(MqlSubscriptionApi, 'handleUnsubscribe')
      .mockImplementation(() => null);
    app.processUserMessage('sock-1', {
      type: 'mql-unsubscribe',
      payload: { type: 'mql-unsubscribe', subscriptionId: 's1' },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(interactive, 's1');
    spy.mockRestore();
  });

  it('malformed mql-subscribe payload silently drops', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(MqlSubscriptionApi, 'handleSubscribe')
      .mockImplementation(() => null);
    app.processUserMessage('sock-1', {
      type: 'mql-subscribe',
      payload: { subscriptionId: 's1' }, // missing query + cardinality
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('mql-subscribe forwards dependency flags to the substrate', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(MqlSubscriptionApi, 'handleSubscribe')
      .mockImplementation(() => null);
    app.processUserMessage('sock-1', {
      type: 'mql-subscribe',
      payload: {
        type: 'mql-subscribe',
        subscriptionId: 's1',
        query: '$focus',
        cardinality: 'many',
        fields: 'detail',
        focusDependent: true,
      },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        interactive,
        subscriptionId: 's1',
        query: '$focus',
        cardinality: 'many',
        focusDependent: true,
      }),
    );
    spy.mockRestore();
  });

  it('mql-query route reaches MqlSubscriptionApi.handleQuery', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(MqlSubscriptionApi, 'handleQuery')
      .mockImplementation(() => null);
    app.processUserMessage('sock-1', {
      type: 'mql-query',
      payload: {
        type: 'mql-query',
        queryId: 'q1',
        query: 'me',
        cardinality: 'one',
      },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        interactive,
        queryId: 'q1',
        query: 'me',
        cardinality: 'one',
      }),
    );
    spy.mockRestore();
  });

  it('malformed mql-query payload silently drops', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(MqlSubscriptionApi, 'handleQuery')
      .mockImplementation(() => null);
    app.processUserMessage('sock-1', {
      type: 'mql-query',
      payload: { queryId: 'q1' }, // missing query + cardinality
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handleUserDisconnect tears down substrate state BEFORE removing the Interactive', () => {
    // The teardown list (MQL/forum subs, reactions, prompts) lives on
    // Interactive.teardownSubstrateState; Application only triggers it
    // before removal. (The cancellations themselves are covered in
    // Interactive's own test.)
    const interactive = makeFakeInteractive('sock-x');
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

    app.handleUserDisconnect('sock-x');

    expect(teardownSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith('sock-x');
    // Ordering: teardown runs strictly before remove.
    const teardownOrder = teardownSpy.mock.invocationCallOrder[0]!;
    const removeOrder = removeSpy.mock.invocationCallOrder[0]!;
    expect(teardownOrder).toBeLessThan(removeOrder);

    getSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
