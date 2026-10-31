/**
 * `cockpit card <action>` (client-surface D8): each shape-and-place action
 * goes through the registry, echoes on `shell.control` tagged
 * `control:card`, and refuses by name.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CockpitCardController from '../../platform/idea/cmd/shell/CockpitCardController';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MessageApi } from '../message';
import { MqlSubscriptionApi } from '../mql-subscription';
import { makeHarness, makeContext, type Harness } from './card-harness';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

let tags: string[][] = [];

beforeEach(() => {
  StuffApi.clearAll();
  ShadowApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  MqlSubscriptionApi._clearAllForTesting();
  CardApi._clearAllForTesting();
  tags = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.tags = (t: string[]) => {
      tags.push(t);
      return b;
    };
    b.toSelf = () => b;
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => vi.restoreAllMocks());

function run(h: Harness, model: Record<string, unknown>) {
  const ctx = makeContext(h, { commandText: 'cockpit card', verbs: ['cockpit'] });
  makeStuff(() => new CockpitCardController()).execute(model as never, ctx);
  return ctx.getNotes();
}

function openWho(h: Harness): string {
  return CardApi.open(
    makeContext(h, { commandText: 'who', verbs: ['who'], opensCard: 'who' }),
    'who',
  )!;
}

describe('cockpit card — shape and place', () => {
  it('grow, move and minimize land, each echoed on control:card', async () => {
    const h = await makeHarness();
    openWho(h);
    expect(run(h, { action: 'grow', cardId: 'who' })).toEqual([]);
    expect(run(h, { action: 'move', cardId: 'who', col: 1, row: 0 })).toEqual([]);
    expect(run(h, { action: 'minimize', cardId: 'who' })).toEqual([]);
    const who = h.interactive.listCards()[0]!;
    expect(who).toMatchObject({ size: 'medium', placed: { col: 1, row: 0 }, minimized: true });
    expect(tags.every((t) => t.includes('control:card'))).toBe(true);
  });

  it('`unpin` is `dismiss` by its other name', async () => {
    const h = await makeHarness();
    openWho(h);
    run(h, { action: 'pin', cardId: 'who' });
    run(h, { action: 'unpin', cardId: 'who' });
    expect(h.interactive.listCards()[0]!.pinned).toBe(false);
  });

  it('refuses by name — a missing move position, a bad one, an unknown card', async () => {
    const h = await makeHarness();
    openWho(h);
    expect(run(h, { action: 'move', cardId: 'who' })[0]).toMatchObject({ reason: 'missing-arg' });
    expect(run(h, { action: 'move', cardId: 'who', col: -1, row: 0 })[0]).toMatchObject({
      reason: 'bad-position',
    });
    expect(run(h, { action: 'grow', cardId: 'nope' })[0]).toMatchObject({ reason: 'unknown-card' });
    expect(run(h, { action: 'fling', cardId: 'who' })[0]).toMatchObject({
      reason: 'unknown-card-action',
    });
  });
});
