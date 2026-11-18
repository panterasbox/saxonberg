/**
 * Application.processUserMessage routes the one subscription wire
 * (`subscribe` / `unsubscribe`, navigation-server D1) and `mql-query`;
 * handleUserDisconnect tears substrate state down before removing the
 * Interactive.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Application } from '../Application';
import { ConnectionManager } from '../ConnectionManager';
import { SubscriptionApi } from '../../mud/api/subscription';
import { SUBSCRIPTION_SOURCES } from '@saxonberg/types';
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

  it('the subscribe route reaches interactive.subscribe with the source and params', () => {
    const interactive = makeFakeInteractive('sock-1');
    const spy = vi.fn(() => null);
    (interactive as never as Record<string, unknown>).subscribe = spy;
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const params = { query: '$focus', cardinality: 'many', fields: 'detail' };
    app.processUserMessage('sock-1', {
      type: 'subscribe',
      payload: {
        type: 'subscribe',
        subscriptionId: 's1',
        source: SUBSCRIPTION_SOURCES.mql,
        params,
      },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('s1', SUBSCRIPTION_SOURCES.mql, params);
  });

  it('⭐ subscription-pause / -resume routes reach the session verbs (crowded-rooms D5)', () => {
    const interactive = makeFakeInteractive('sock-1');
    const pause = vi.fn();
    const resume = vi.fn();
    (interactive as never as Record<string, unknown>).pauseSubscription = pause;
    (interactive as never as Record<string, unknown>).resumeSubscription = resume;
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(interactive);
    app.processUserMessage('sock-1', {
      type: 'subscription-pause',
      payload: { type: 'subscription-pause', subscriptionId: 'card-1' },
    });
    app.processUserMessage('sock-1', {
      type: 'subscription-resume',
      payload: { type: 'subscription-resume', subscriptionId: 'card-1' },
    });
    expect(pause).toHaveBeenCalledWith('card-1');
    expect(resume).toHaveBeenCalledWith('card-1');
  });

  it('the unsubscribe route reaches interactive.cancelSubscription', () => {
    const interactive = makeFakeInteractive('sock-1');
    const spy = vi.fn();
    (interactive as never as Record<string, unknown>).cancelSubscription = spy;
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    app.processUserMessage('sock-1', {
      type: 'unsubscribe',
      payload: { type: 'unsubscribe', subscriptionId: 's1' },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('s1');
  });

  it('a subscribe with no id silently drops', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi.fn(() => null);
    (interactive as never as Record<string, unknown>).subscribe = spy;
    app.processUserMessage('sock-1', {
      type: 'subscribe',
      payload: { source: SUBSCRIPTION_SOURCES.mql },
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('mql-query route reaches SubscriptionApi.handleQuery', () => {
    const interactive = makeFakeInteractive('sock-1');
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const spy = vi
      .spyOn(SubscriptionApi, 'handleQuery')
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
      .spyOn(SubscriptionApi, 'handleQuery')
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

  it('⚠ several tabs: the LAST connection\'s own close code decides sign-out vs drop', () => {
    const interactive = makeFakeInteractive('sock-tab');
    const setLeaveIntent = vi.fn();
    (interactive as unknown as { getHolder: () => unknown }).getHolder = () => ({ setLeaveIntent });
    (interactive as unknown as { teardownSubstrateState: () => void }).teardownSubstrateState = vi.fn();
    const getSpy = vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(interactive);
    const removeSpy = vi.spyOn(ConnectionManager.get(), 'removeInteractive').mockReturnValue(true);

    app.handleUserDisconnect('sock-tab', true);
    app.handleUserDisconnect('sock-tab', false);

    expect(setLeaveIntent.mock.calls.map((c) => c[0])).toEqual([true, false]);
    getSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
