/**
 * The one subscription protocol (navigation-server D1): `rev` is
 * contiguous per subscription, a path whose class is not a source is
 * refused WITHOUT being stood up, and a session's disconnect closes every
 * subscription of every source.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../lib/stuff/Idea';
import {
  SubscriptionSourceMixin,
  type Subscription,
} from '../../lib/subscription/SubscriptionSource';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { StuffApi } from '../../api/stuff';
import { SubscriptionApi } from '../../api/subscription';
import Interactive from '../idea/Interactive';
import type { Stuff } from '../../lib/stuff/Stuff';

/** A source that answers `{ n }` and remembers every handle it was given. */
class CountingSource extends SubscriptionSourceMixin(Idea) {
  open: Subscription[] = [];
  closed: string[] = [];
  pokes = 0;
  override openSubscription(sub: Subscription, params: unknown): unknown {
    if ((params as { refuse?: boolean } | undefined)?.refuse) {
      return { refused: true, reason: 'parse', detail: 'asked to refuse' };
    }
    this.open.push(sub);
    return { n: 0 };
  }
  override closeSubscription(sub: Subscription): void {
    this.closed.push(sub.id);
  }
  override pokeSubscriptions(_holder: Stuff): void {
    this.pokes += 1;
  }
}

/** An Idea that is NOT a source. */
class NotASource extends Idea {}

const SOURCE = '/test/idea/CountingSource';
const OTHER = '/test/idea/OtherSource';

type Env = { type: string; subscriptionId: string; rev?: number; reason?: string };

function session(envelopes: Env[]): Interactive {
  const s = StuffApi.createSync(
    () => new Interactive(`sock-${Math.random()}`, 'sess', { _id: 'u' } as never),
  ) as unknown as Interactive;
  vi.spyOn(s, 'sendEnvelope').mockImplementation((tpl: unknown) => {
    envelopes.push(tpl as Env);
  });
  return s;
}

describe('SubscriptionRegistry — the one protocol', () => {
  let source: CountingSource;
  let envelopes: Env[];

  beforeEach(() => {
    StuffApi.clearAll();
    envelopes = [];
    source = makeStuffAtPath(() => new CountingSource(), SOURCE) as unknown as CountingSource;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('the snapshot is rev 0 and every delta is the next rev, per subscription', () => {
    const s = session(envelopes);
    expect(s.subscribe('a', SOURCE)).toEqual({ n: 0 });
    expect(s.subscribe('b', SOURCE)).toEqual({ n: 0 });
    const [a, b] = source.open;
    a!.push([{ op: 'replace', key: 'x', fields: 1 }]);
    a!.push([]); // empty is a no-op, never a rev
    b!.push([{ op: 'replace', key: 'x', fields: 2 }]);
    a!.push([{ op: 'replace', key: 'x', fields: 3 }]);
    const revsOf = (id: string) => envelopes.filter((e) => e.subscriptionId === id).map((e) => e.rev);
    expect(revsOf('a')).toEqual([0, 1, 2]);
    expect(revsOf('b')).toEqual([0, 1]);
  });

  it('a silent open sends no result, and its first delta is rev 1', () => {
    const s = session(envelopes);
    s.subscribe('card', SOURCE, undefined, { silent: true });
    expect(envelopes).toEqual([]);
    source.open[0]!.push([{ op: 'add', key: 'y' }]);
    expect(envelopes).toMatchObject([{ type: 'subscription-delta', rev: 1 }]);
  });

  it('a duplicate id and a refusal answer an error and register nothing new', () => {
    const s = session(envelopes);
    s.subscribe('a', SOURCE);
    expect(s.subscribe('a', SOURCE)).toBeNull();
    expect(s.subscribe('r', SOURCE, { refuse: true })).toBeNull();
    expect(envelopes.filter((e) => e.type === 'subscription-error').map((e) => e.reason)).toEqual([
      'duplicate',
      'parse',
    ]);
    expect(s.hasSubscription('r')).toBe(false);
    expect(SubscriptionApi._countForTesting()).toBe(1);
  });

  it('a standing Stuff that is not a source is refused', () => {
    makeStuffAtPath(() => new NotASource(), OTHER);
    const s = session(envelopes);
    expect(s.subscribe('a', OTHER)).toBeNull();
    expect(envelopes).toMatchObject([{ type: 'subscription-error', reason: 'source' }]);
  });

  it('⭐ a row whose class is not a source is refused WITHOUT being stood up', async () => {
    vi.spyOn(StuffApi, 'classForRef').mockResolvedValue(NotASource as never);
    const stand = vi.spyOn(StuffApi, 'singleton');
    const s = session(envelopes);
    expect(await s.subscribe('a', '/test/idea/Unstood')).toBeNull();
    expect(stand).not.toHaveBeenCalled();
    expect(StuffApi.findByTemplatePath('/test/idea/Unstood')).toBeUndefined();
    expect(envelopes).toMatchObject([{ type: 'subscription-error', reason: 'source' }]);
  });

  it('fail sends an error and closes; end closes quietly; pushes after either are dropped', () => {
    const s = session(envelopes);
    s.subscribe('a', SOURCE);
    s.subscribe('b', SOURCE);
    const [a, b] = source.open;
    a!.fail('resolve', 'gone');
    b!.end();
    a!.push([{ op: 'add', key: 'z' }]);
    b!.push([{ op: 'add', key: 'z' }]);
    expect(envelopes.map((e) => e.type)).toEqual([
      'subscription-result',
      'subscription-result',
      'subscription-error',
    ]);
    expect(source.closed).toEqual(['a']);
    expect(SubscriptionApi._countForTesting()).toBe(0);
  });

  it('disconnect closes every subscription of every source on that session only', () => {
    const other = makeStuffAtPath(() => new CountingSource(), OTHER) as unknown as CountingSource;
    const s = session(envelopes);
    const t = session([]);
    s.subscribe('a', SOURCE);
    s.subscribe('b', OTHER);
    t.subscribe('a', SOURCE);
    s.teardownSubstrateState();
    expect(source.closed).toEqual(['a']);
    expect(other.closed).toEqual(['b']);
    expect(t.hasSubscription('a')).toBe(true);
    expect(SubscriptionApi._countForTesting()).toBe(1);
  });

  it('a poke reaches a standing source and never stands one up', () => {
    const holder = makeStuffAtPath(() => new NotASource(), '/test/idea/Holder');
    SubscriptionApi.poke(SOURCE, holder);
    SubscriptionApi.poke('/test/idea/NeverStood', holder);
    expect(source.pokes).toBe(1);
    expect(StuffApi.findByTemplatePath('/test/idea/NeverStood')).toBeUndefined();
  });
});
