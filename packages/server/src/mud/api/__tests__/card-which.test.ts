/**
 * ⭐ The `which` card (the which build, W4): a payload card a SOURCE keeps
 * current. Born a snapshot (unpinned); pinned, it subscribes to
 * `WhichSource` with the params the open carried; `which counter` after
 * `which` retargets the ONE card (owner); a change to the command stack
 * pushes the new answer under the key `answer`.
 */
import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CardApi } from '../card';
import { CommandApi } from '../command';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { SubscriptionApi } from '../subscription';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import WhichSource from '../../platform/idea/WhichSource';
import { makeHarness, makeContext } from './card-harness';
import { SUBSCRIPTION_SOURCES, type WhichAnswer } from '@saxonberg/types';

const answerOf = (command: string, verbs: string[]): WhichAnswer => ({
  ask: { mode: command === 'which' ? 'all' : 'thing', command },
  groups: [
    {
      key: 'lever|here|switch',
      source: { id: 'l1', handle: 'lever', name: 'the lever', place: 'here' },
      count: 1,
      ids: ['l1'],
      verbs: verbs.map((verb) => ({ verb, description: verb, state: 'enabled' as const, reach: 'beside' as const, view: verb })),
    },
  ],
});

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 5));

describe('the which card — a payload a source keeps current', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    SubscriptionApi._clearAllForTesting();
    CardApi._clearAllForTesting();
  });
  afterEach(() => vi.restoreAllMocks());

  it('born a snapshot; pinned it subscribes; re-asked it is ONE card; the stack moving pushes the answer', async () => {
    const h = await makeHarness();
    makeStuffAtPath(() => new WhichSource(), SUBSCRIPTION_SOURCES.which);
    let current = answerOf('which', ['switch']);
    vi.spyOn(CommandApi, 'which').mockImplementation(async () => ({ ok: true, facts: current }));
    const ctx = makeContext(h, { commandText: 'which', verbs: ['which'], opensCard: 'which' });

    const id = CardApi.open(ctx, 'which', { key: 'which', payload: { kind: 'which', answer: current }, params: {} });
    const opened = h.ofType('card-opened')[0]!;
    expect(opened.live).toBe(false);
    expect(typeof opened.takenAt).toBe('number');
    expect((opened.payload as { kind: string }).kind).toBe('which');

    // Pinned: live, on the which source.
    expect(h.interactive.setCardPinned('which', true)).toBe(true);
    await tick();
    expect(h.interactive.hasSubscription(id!)).toBe(true);

    // The stack moves: the source re-reads and pushes the whole answer.
    current = answerOf('which', ['switch', 'pull']);
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.which, h.avatar as never);
    await tick();
    const deltas = h.ofType('subscription-delta').filter((e) => e.subscriptionId === id);
    expect(deltas.length).toBe(1);
    const change = (deltas[0]!.changes as { key: string; fields: WhichAnswer }[])[0]!;
    expect(change.key).toBe('answer');
    expect(change.fields.groups[0]!.verbs.map((v) => v.verb)).toEqual(['switch', 'pull']);

    // ⭐ A field changing on the body wakes it too (a lamp lit, a purse filled).
    current = answerOf('which', ['switch', 'pull', 'shove']);
    SubscriptionApi.fireFieldChange(h.avatar, 'status', 'a', 'b');
    await vi.waitFor(() =>
      expect(h.ofType('subscription-delta').filter((e) => e.subscriptionId === id).length).toBe(2),
    );
    current = answerOf('which', ['switch', 'pull']);
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.which, h.avatar as never);
    await vi.waitFor(() =>
      expect(h.ofType('subscription-delta').filter((e) => e.subscriptionId === id).length).toBe(3),
    );

    // Nothing changed: nothing sent.
    SubscriptionApi.poke(SUBSCRIPTION_SOURCES.which, h.avatar as never);
    await tick();
    expect(h.ofType('subscription-delta').filter((e) => e.subscriptionId === id).length).toBe(3);

    // ⭐ R5: `which lever` retargets the one card that is up.
    const narrowed = answerOf('which #l1', ['switch']);
    const again = CardApi.open(ctx, 'which', { key: 'which', payload: { kind: 'which', answer: narrowed }, params: { thingId: 'l1' } });
    expect(again).toBe(id);
    expect(h.interactive.listCards().filter((c) => c.cardId === 'which').length).toBe(1);
    const touched = h.ofType('card-touched').at(-1)!;
    expect((touched.payload as { answer: WhichAnswer }).answer.ask.command).toBe('which #l1');
    expect(h.interactive.hasSubscription(id!)).toBe(true);

    // Unpinned: a snapshot again.
    expect(h.interactive.setCardPinned('which', false)).toBe(true);
    expect(h.interactive.hasSubscription(id!)).toBe(false);
  });

  it('an answer with no params (the ~ words) stays a snapshot even pinned', async () => {
    const h = await makeHarness();
    makeStuffAtPath(() => new WhichSource(), SUBSCRIPTION_SOURCES.which);
    const ctx = makeContext(h, { commandText: 'which ~', verbs: ['which'], opensCard: 'which' });
    const id = CardApi.open(ctx, 'which', { key: 'which', payload: { kind: 'which', answer: answerOf('which ~', []) } });
    h.interactive.setCardPinned('which', true);
    await tick();
    expect(h.interactive.hasSubscription(id!)).toBe(false);
  });
});
