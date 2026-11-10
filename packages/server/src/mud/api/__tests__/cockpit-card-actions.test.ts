/**
 * `client-card <action>` (client-surface D8): each shape-and-place action
 * goes through the registry, echoes on `shell.control` tagged
 * `control:card`, and refuses by name. One controller per nested stanza
 * since controller-liquidity W7b; an unknown action is the view's refusal
 * (asserted in `cockpit-verb.test.ts`).
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ClientCardPinController from '../../platform/idea/cmd/shell/ClientCardPinController';
import ClientCardUnpinController from '../../platform/idea/cmd/shell/ClientCardUnpinController';
import ClientCardArrangeController from '../../platform/idea/cmd/shell/ClientCardArrangeController';
import ClientCardMoveController from '../../platform/idea/cmd/shell/ClientCardMoveController';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MessageApi } from '../message';
import { MqlSubscriptionApi } from '../mql-subscription';
import { makeHarness, makeContext, type Harness } from './card-harness';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

let tags: string[][] = [];
let said: string[] = [];

beforeEach(() => {
  StuffApi.clearAll();
  ShadowApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  MqlSubscriptionApi._clearAllForTesting();
  CardApi._clearAllForTesting();
  tags = [];
  said = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.tags = (t: string[]) => {
      tags.push(t);
      return b;
    };
    b.toSelf = (body: unknown) => {
      said.push(String(body));
      return b;
    };
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => vi.restoreAllMocks());

/** The stanza's controller for an action word, as the view names it. */
function controllerFor(action: string) {
  switch (action) {
    case 'pin':
      return makeStuff(() => new ClientCardPinController());
    case 'unpin':
    case 'dismiss':
      return makeStuff(() => new ClientCardUnpinController());
    case 'move':
      return makeStuff(() => new ClientCardMoveController());
    default:
      return makeStuff(() => new ClientCardArrangeController());
  }
}

function run(h: Harness, model: Record<string, unknown>) {
  const ctx = makeContext(h, { commandText: 'client-card', verbs: ['cockpit'] });
  const { action, ...rest } = model as { action: string };
  controllerFor(action).execute({ ...rest, subcommand: action } as never, ctx);
  return ctx.getNotes();
}

function openWho(h: Harness): string {
  return CardApi.open(
    makeContext(h, { commandText: 'who', verbs: ['who'], opensCard: 'who' }),
    'who',
  )!;
}

describe('client-card — shape and place', () => {
  it('grow, move and minimize land, each echoed on control:card', async () => {
    const h = await makeHarness();
    openWho(h);
    expect(run(h, { action: 'grow', cardId: 'who' })).toEqual([]);
    expect(run(h, { action: 'move', cardId: 'who', col: 1, row: 0 })).toEqual([]);
    expect(run(h, { action: 'minimize', cardId: 'who' })).toEqual([]);
    const who = h.interactive.listCards()[0]!;
    // The tray takes a card back to its plain size (one ladder).
    expect(who).toMatchObject({ size: 'unit', placed: { col: 1, row: 0 }, minimized: true });
    expect(tags.every((t) => t.includes('control:card'))).toBe(true);
  });

  it('⭐ the echo names a card by its header title, not the ref it was addressed by', async () => {
    const h = await makeHarness();
    CardApi.open(
      makeContext(h, { commandText: 'look #abc', verbs: ['look'], opensCard: 'who' }),
      'who',
      { key: 'look #abc', title: 'the house tablet' },
    );
    run(h, { action: 'minimize', cardId: 'look #abc' });
    expect(said.join('\n')).toContain('card “the house tablet” in the tray');
    expect(said.join('\n')).not.toContain('#abc');
  });

  it('⭐ one ladder: shrink from unit lands in the tray, and grow brings it back at unit', async () => {
    const h = await makeHarness();
    openWho(h);
    run(h, { action: 'grow', cardId: 'who' });
    run(h, { action: 'grow', cardId: 'who' });
    expect(h.interactive.listCards()[0]!.size).toBe('full');
    run(h, { action: 'shrink', cardId: 'who' });
    run(h, { action: 'shrink', cardId: 'who' });
    expect(h.interactive.listCards()[0]).toMatchObject({ size: 'unit', minimized: false });
    run(h, { action: 'shrink', cardId: 'who' });
    expect(h.interactive.listCards()[0]).toMatchObject({ size: 'unit', minimized: true });
    expect(said.join('\n')).toContain('in the tray');
    run(h, { action: 'grow', cardId: 'who' });
    expect(h.interactive.listCards()[0]).toMatchObject({ size: 'unit', minimized: false });
  });

  it('a card minimized from full comes back at unit, not full', async () => {
    const h = await makeHarness();
    openWho(h);
    run(h, { action: 'maximize', cardId: 'who' });
    run(h, { action: 'minimize', cardId: 'who' });
    run(h, { action: 'restore', cardId: 'who' });
    expect(h.interactive.listCards()[0]).toMatchObject({ size: 'unit', minimized: false });
  });

  it('⭐ maximize is the swap: the incumbent full card goes back to its own size', async () => {
    const h = await makeHarness();
    const a = openWho(h);
    run(h, { action: 'maximize', cardId: 'who' });
    const b = CardApi.open(
      makeContext(h, { commandText: 'look #b', verbs: ['look'], opensCard: 'who' }),
      'who',
      { key: 'look #b' },
    )!;
    run(h, { action: 'maximize', cardId: 'look #b' });
    const byId = new Map(h.interactive.listCards().map((c) => [c.instanceId, c]));
    expect(byId.get(b)!.size).toBe('full');
    expect(byId.get(a)!.size).toBe('unit');
  });

  it('`unpin` is `dismiss` by its other name', async () => {
    const h = await makeHarness();
    openWho(h);
    run(h, { action: 'pin', cardId: 'who' });
    run(h, { action: 'unpin', cardId: 'who' });
    expect(h.interactive.listCards()[0]!.pinned).toBe(false);
  });

  it('refuses by name — a bad move position, an unknown card', async () => {
    const h = await makeHarness();
    openWho(h);
    // The view requires both numbers; handed none, the registry refuses.
    expect(run(h, { action: 'move', cardId: 'who' })[0]).toMatchObject({ reason: 'bad-position' });
    expect(run(h, { action: 'move', cardId: 'who', col: -1, row: 0 })[0]).toMatchObject({
      reason: 'bad-position',
    });
    expect(run(h, { action: 'grow', cardId: 'nope' })[0]).toMatchObject({ reason: 'unknown-card' });
  });
});
