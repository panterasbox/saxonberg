/**
 * Wave 3 (inspection-pane build): canonical subscription kinds.
 *
 * `MqlSubscriptionApi.registerKind(name, spec)` binds a name to a
 * subscription spec; `handleSubscribe({ kind })` overlays the spec
 * onto the request, ignoring any client-supplied
 * `query` / `cardinality` / `fields` / `detailKey` /
 * `focusDependent`. Unknown kind names → `parse` error.
 *
 * The integration assertion: `me.focus` (the canonical kind
 * `AppBootstrap` registers) re-resolves on `setFocus` because
 * the substrate expands `$focus` via `ShellApi.expandVariables`
 * fresh on every (re-)resolve, and the spec carries
 * `focusDependent: true` so the holder-level dependency entry
 * fires the dirty mark.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { MqlApi } from '../mql';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ContainmentApi } from '../containment';
import { Stuff } from '../../lib/stuff/Stuff';
import { EventRegistry } from '../../obj/EventRegistry';
import { Interactive } from '../../obj/Interactive';
import { Avatar } from '../../obj/Avatar';
import { ConnectionApi } from '../connection';
import { Thing } from '../../lib/stuff/Thing';
import { Location } from '../../lib/stuff/Location';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

interface CapturedEnvelope {
  type: string;
  [k: string]: unknown;
}

async function setup(): Promise<{
  interactive: Interactive;
  avatar: Avatar;
  location: Location;
  envelopes: CapturedEnvelope[];
}> {
  await bootRegistry();
  const location = await StuffApi.create(() => new Location());
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  ContainmentApi.move(avatar, location);
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);
  const envelopes: CapturedEnvelope[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as CapturedEnvelope);
  });
  return { interactive, avatar, location, envelopes };
}

describe('MqlSubscriptionApi — canonical kinds (Wave 3)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
    MqlSubscriptionApi._clearKindsForTesting();
  });

  it('registerKind stores the spec under the name', () => {
    MqlSubscriptionApi.registerKind('me.focus', {
      query: '$focus',
      cardinality: 'many',
      fields: 'detail',
      focusDependent: true,
    });
    const spec = MqlSubscriptionApi._getKindSpecForTesting('me.focus');
    expect(spec).toEqual({
      query: '$focus',
      cardinality: 'many',
      fields: 'detail',
      focusDependent: true,
    });
  });

  it('registerKind is idempotent (re-register overwrites)', () => {
    MqlSubscriptionApi.registerKind('demo', {
      query: 'me',
      cardinality: 'one',
    });
    MqlSubscriptionApi.registerKind('demo', {
      query: 'me',
      cardinality: 'many',
    });
    expect(
      MqlSubscriptionApi._getKindSpecForTesting('demo')!.cardinality,
    ).toBe('many');
  });

  it('unknown kind emits a parse-error envelope', async () => {
    const { interactive, envelopes } = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 'sx',
      kind: 'not.registered',
    });
    const err = envelopes.find((e) => e.type === 'mql-subscription-error');
    expect(err).toBeDefined();
    expect(err!.reason).toBe('parse');
    expect(typeof err!.detail).toBe('string');
    expect(err!.detail as string).toContain('not.registered');
    // No subscription was installed.
    expect(MqlSubscriptionApi._getRegistrySizeForTesting()).toBe(0);
  });

  it('kind spec overrides client-supplied query / cardinality / fields', async () => {
    const { interactive } = await setup();
    MqlSubscriptionApi.registerKind('me.focus', {
      query: '$focus',
      cardinality: 'many',
      fields: 'detail',
      focusDependent: true,
    });

    const spy = vi.spyOn(MqlApi, 'resolveMany');
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's1',
      kind: 'me.focus',
      // Client-supplied junk that should be ignored — the registered
      // spec wins.
      query: 'me',
      cardinality: 'one',
      fields: 'ref',
    });
    // resolveMany was called (not resolveOne), proving the spec's
    // `cardinality: 'many'` overlaid the client's `cardinality: 'one'`.
    expect(spy).toHaveBeenCalled();
    // And the expanded query was `$focus` → 'here' (the default focus),
    // not 'me'.
    const firstCall = spy.mock.calls[0]!;
    expect(firstCall[0]).toBe('here');
    spy.mockRestore();
  });

  it('me.focus subscription ships initial result based on current focus', async () => {
    const { interactive, envelopes } = await setup();
    MqlSubscriptionApi.registerKind('me.focus', {
      query: '$focus',
      cardinality: 'many',
      fields: 'detail',
      focusDependent: true,
    });

    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-focus',
      kind: 'me.focus',
    });

    const initial = envelopes.find(
      (e) => e.type === 'mql-subscription-result',
    );
    expect(initial).toBeDefined();
    // Default focus is 'here' → the avatar's containing Location.
    const result = (initial as unknown as { result: Array<{ stuffId: string }> })
      .result;
    expect(result.length).toBeGreaterThan(0);
  });

  it('setFocus triggers a delta within one setImmediate tick', async () => {
    const { interactive, avatar, envelopes } = await setup();
    MqlSubscriptionApi.registerKind('me.focus', {
      query: '$focus',
      cardinality: 'many',
      fields: 'detail',
      focusDependent: true,
    });

    // Drop a Thing somewhere so 'apple' won't resolve, but
    // setFocus + re-resolve happens regardless.
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-focus',
      kind: 'me.focus',
    });
    envelopes.length = 0;

    const spy = vi.spyOn(MqlApi, 'resolveMany');
    avatar.setFocus('apple');
    expect(spy).not.toHaveBeenCalled(); // setImmediate hasn't fired yet.
    await MqlSubscriptionApi._drainScheduledForTesting();
    expect(spy).toHaveBeenCalled();
    // The re-resolve expanded `$focus` to 'apple' (the new fragment).
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1]!;
    expect(lastCall[0]).toBe('apple');
    spy.mockRestore();
  });

  it('me.focus subscription round-trip: result records carry contents (W1 + W3 compose)', async () => {
    const { interactive, location, envelopes } = await setup();
    // Put a couple Things in the location so focus → here → contents
    // ships records with non-empty contents.
    const t1 = await StuffApi.create(() => {
      const t = new Thing();
      t.setShortDescription('a brass thermometer');
      return t;
    });
    const t2 = await StuffApi.create(() => {
      const t = new Thing();
      t.setShortDescription('an iron lantern');
      return t;
    });
    ContainmentApi.move(t1, location);
    ContainmentApi.move(t2, location);

    MqlSubscriptionApi.registerKind('me.focus', {
      query: '$focus',
      cardinality: 'many',
      fields: 'detail',
      focusDependent: true,
    });
    envelopes.length = 0;
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-focus',
      kind: 'me.focus',
    });

    const initial = envelopes.find(
      (e) => e.type === 'mql-subscription-result',
    );
    expect(initial).toBeDefined();
    type ResultRec = {
      stuffId: string;
      contents?: Array<Record<string, unknown>>;
    };
    const result = (initial as unknown as { result: ResultRec[] }).result;
    // `$focus` resolves to 'here' → the avatar's location.
    const locRec = result.find((r) => r.stuffId === location.stuffId);
    expect(locRec).toBeDefined();
    expect(locRec!.contents).toBeDefined();
    // Contents excludes the viewing avatar (self-filter) and
    // includes only Visible non-Adornment Stuff.
    expect(locRec!.contents!.length).toBeGreaterThanOrEqual(2);
  });

  it('raw subscribes still work when kind is absent', async () => {
    const { interactive, envelopes } = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-raw',
      query: 'me',
      cardinality: 'one',
      fields: ['displayName'],
    });
    const initial = envelopes.find(
      (e) => e.type === 'mql-subscription-result',
    );
    expect(initial).toBeDefined();
    expect(
      (initial as unknown as { result: Array<{ displayName: string }> })
        .result[0]!.displayName,
    ).toBe('Alice');
  });

  it('raw subscribe without query/cardinality emits a parse-error envelope', async () => {
    const { interactive, envelopes } = await setup();
    // Reaches the substrate directly without `kind`, missing query.
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-bad',
      cardinality: 'one',
      fields: ['displayName'],
    });
    const err = envelopes.find((e) => e.type === 'mql-subscription-error');
    expect(err).toBeDefined();
    expect(err!.reason).toBe('parse');
  });
});
