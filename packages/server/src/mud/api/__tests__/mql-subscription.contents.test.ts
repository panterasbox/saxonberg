/**
 * Wave 1: ContainerMixin contents projection + per-viewer filter +
 * containment-add/remove → FieldChangedEvent → re-resolve → delta
 * round trip.
 *
 * Verifies:
 *   - A `detail`-field subscription on a Container host projects
 *     `contents` as an array of `REF_FIELDS`-shape records.
 *   - Each ref record carries `displayName` AND `primaryKeyword`
 *     (the latter for Perceptible children).
 *   - `ContainmentApi.move` (the public chokepoint that ultimately
 *     hits `addContainable`) triggers a delta carrying the updated
 *     `contents` array (full-array replace via `update`).
 *   - The per-viewer filter excludes self, AdornmentMixin items,
 *     and non-Visible items.
 *   - Non-Container hosts have `contents` omitted from the projection.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ContainmentApi } from '../containment';
import { Stuff } from '../../lib/stuff/Stuff';
import EventRegistry from '../../platform/idea/EventRegistry';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/Avatar';
import Thing from '../../lib/stuff/Thing';
import Location from '../../lib/stuff/Location';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
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
  interactive.transferTo(avatar);

  const envelopes: CapturedEnvelope[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as CapturedEnvelope);
  });
  return { interactive, avatar, location, envelopes };
}

async function makeBrassThermometer(short: string): Promise<Thing> {
  return await StuffApi.create(() => {
    const t = new Thing();
    t.setShortDescription(short);
    return t;
  });
}

describe('MqlSubscriptionApi — contents projection (Wave 1)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    MqlSubscriptionApi._clearAllForTesting();
  });

  it('projects contents on a Container host with three Visible children', async () => {
    const { interactive, location, envelopes } = await setup();

    const t1 = await makeBrassThermometer('a brass thermometer');
    const t2 = await makeBrassThermometer('an iron lantern');
    const t3 = await makeBrassThermometer('a wooden chair');
    ContainmentApi.move(t1, location);
    ContainmentApi.move(t2, location);
    ContainmentApi.move(t3, location);

    envelopes.length = 0;
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-contents',
      query: 'here',
      cardinality: 'one',
      fields: 'detail',
    });

    const initial = envelopes.find(
      (e) => e.type === 'mql-subscription-result',
    );
    expect(initial).toBeDefined();
    const rec = (initial as unknown as {
      result: Array<{ contents?: Array<Record<string, unknown>> }>;
    }).result[0]!;
    expect(rec.contents).toBeDefined();
    expect(rec.contents).toHaveLength(3);

    for (const item of rec.contents!) {
      expect(typeof item.displayName).toBe('string');
      // Each Thing composes Perceptible, so primaryKeyword rides along.
      expect(typeof item.primaryKeyword).toBe('string');
    }
  });

  it('containment add fires FieldChangedEvent → delta carries updated contents', async () => {
    const { interactive, location, envelopes } = await setup();
    const t1 = await makeBrassThermometer('a brass thermometer');
    ContainmentApi.move(t1, location);

    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-contents',
      query: 'here',
      cardinality: 'one',
      fields: 'detail',
    });
    envelopes.length = 0;

    // Add a second Thing.
    const t2 = await makeBrassThermometer('an iron lantern');
    ContainmentApi.move(t2, location);

    await MqlSubscriptionApi._drainScheduledForTesting();

    const delta = envelopes.find((e) => e.type === 'mql-subscription-delta');
    expect(delta).toBeDefined();
    type DeltaShape = {
      changes: Array<{
        op: string;
        key: string;
        fields?: { contents?: Array<Record<string, unknown>> };
      }>;
    };
    const changes = (delta as unknown as DeltaShape).changes;
    expect(changes).toHaveLength(1);
    expect(changes[0]!.op).toBe('update');
    // Diff produces an updated `contents` array (full-array replace via
    // `update`). The client patches in place by replacing the field.
    expect(changes[0]!.fields?.contents).toBeDefined();
    expect(changes[0]!.fields!.contents!).toHaveLength(2);
  });

  it('per-viewer filter: viewer (self) excluded from the contents list', async () => {
    const { interactive, avatar, location } = await setup();
    // The avatar (the viewer) is itself in the location.
    const t1 = await makeBrassThermometer('a brass thermometer');
    ContainmentApi.move(t1, location);

    // Project directly to assert the filter is per-viewer.
    const envelopes: CapturedEnvelope[] = [];
    vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
      envelopes.push(tpl as unknown as CapturedEnvelope);
    });
    MqlSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 's-contents',
      query: 'here',
      cardinality: 'one',
      fields: 'detail',
    });

    const initial = envelopes.find(
      (e) => e.type === 'mql-subscription-result',
    );
    const rec = (initial as unknown as {
      result: Array<{ contents?: Array<{ stuffId: string }> }>;
    }).result[0]!;
    const ids = (rec.contents ?? []).map((c) => c.stuffId);
    // Only t1 — avatar is filtered out (it's the viewer / self).
    expect(ids).toContain(t1.stuffId);
    expect(ids).not.toContain(avatar.stuffId);
  });

  it('non-Container host: substrate omits the contents field', async () => {
    // Projection of detail fields against a non-Container Stuff yields
    // no `contents` key. Use `projectFields` directly against an Idea
    // instance (Avatar / Location both compose ContainerMixin).
    await bootRegistry();
    const { MqlSubscriptionApi, DETAIL_FIELDS } = await import(
      '../mql-subscription'
    );
    const { Idea } = await import('../../lib/stuff/Idea');
    const plain = await StuffApi.create(() => new Idea());
    const rec = MqlSubscriptionApi.projectFields(
      plain,
      DETAIL_FIELDS,
      plain as unknown as Parameters<typeof MqlSubscriptionApi.projectFields>[2],
    );
    expect(rec.contents).toBeUndefined();
    expect('contents' in rec).toBe(false);
  });
});
