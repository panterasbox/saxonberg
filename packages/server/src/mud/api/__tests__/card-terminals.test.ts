/**
 * ⭐ A terminal is a card (client-surface D6): every mode entry ensures a
 * PRIMARY terminal, `cockpit terminal` retargets it or opens another
 * beside it, each terminal has its own bar, and the primary can be moved
 * but never closed or put in the tray.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CockpitTerminalController from '../../platform/idea/cmd/shell/CockpitTerminalController';
import { CardApi } from '../card';
import { StuffApi } from '../stuff';
import { EventApi } from '../event';
import { ShadowApi } from '../shadow';
import { MessageApi } from '../message';
import { MixinApi } from '../mixin';
import { MqlSubscriptionApi } from '../mql-subscription';
import { makeHarness, makeContext, type Harness } from './card-harness';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { CardPayload } from '@saxonberg/types';

beforeEach(() => {
  StuffApi.clearAll();
  ShadowApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  MqlSubscriptionApi._clearAllForTesting();
  CardApi._clearAllForTesting();
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    for (const k of ['topic', 'tags', 'toSelf']) b[k] = () => b;
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => vi.restoreAllMocks());

type TerminalPayload = Extract<CardPayload, { kind: 'terminal' }>;
const terminals = (h: Harness) =>
  h.interactive.listCards().filter((c) => c.cardId === 'terminal');
const payloadOf = (h: Harness, instanceId: string): TerminalPayload => {
  const opened = h.ofType('card-opened').find((e) => e.instanceId === instanceId);
  const touched = h.ofType('card-touched').filter((e) => e.instanceId === instanceId && e.payload);
  return ((touched[touched.length - 1]?.payload ?? opened?.payload) as TerminalPayload);
};

function run(h: Harness, model: Record<string, unknown>) {
  const ctx = makeContext(h, { commandText: 'cockpit terminal', verbs: ['cockpit'] });
  makeStuff(() => new CockpitTerminalController()).execute(model as never, ctx);
  return ctx.getNotes();
}

describe('the primary terminal', () => {
  it('⭐ a mode entry mints ONE primary terminal, and re-entry retargets it', async () => {
    const h = await makeHarness();
    h.interactive.applyCardArrangement([], {});
    h.interactive.applyCardArrangement([], { view: 'Chat' });
    const ts = terminals(h);
    expect(ts).toHaveLength(1);
    expect(ts[0]!.role).toBe('primary');
    expect(payloadOf(h, ts[0]!.instanceId).filter).toEqual({ view: 'Chat' });
    expect(payloadOf(h, ts[0]!.instanceId).primary).toBe(true);
  });

  it('a bare re-arrange of cards touches no terminal (B15)', async () => {
    const h = await makeHarness();
    h.interactive.applyCardArrangement([{ cardId: 'who' }]);
    expect(terminals(h)).toHaveLength(0);
  });

  it('⛔ the primary cannot be closed or minimized, and a rearrange never closes it', async () => {
    const h = await makeHarness();
    h.interactive.applyCardArrangement([], {});
    const id = terminals(h)[0]!.instanceId;
    expect(h.interactive.arrangeCard(id, 'close').refused).toBe('primary-terminal');
    expect(h.interactive.arrangeCard(id, 'minimize').refused).toBe('primary-terminal');
    h.interactive.applyCardArrangement([{ cardId: 'news' }]);
    expect(terminals(h).map((t) => t.instanceId)).toEqual([id]);
  });
});

describe('cockpit terminal', () => {
  it('⭐ retargets the primary to a channel, keeping its bar', async () => {
    const h = await makeHarness();
    h.interactive.applyCardArrangement([], {});
    const id = terminals(h)[0]!.instanceId;
    const bar = payloadOf(h, id).barId;
    expect(run(h, { target: '#general' })).toEqual([]);
    expect(terminals(h)).toHaveLength(1);
    expect(payloadOf(h, id).filter).toEqual({ channel: 'general' });
    expect(payloadOf(h, id).barId).toBe(bar);
  });

  it('⭐ --beside opens a SECOND terminal with its own bar (AC 5)', async () => {
    const h = await makeHarness();
    h.interactive.applyCardArrangement([], {});
    run(h, { target: '#general', beside: true });
    const ts = terminals(h);
    expect(ts).toHaveLength(2);
    const bars = ts.map((t) => payloadOf(h, t.instanceId).barId);
    expect(new Set(bars).size).toBe(2);
    expect(ts.filter((t) => t.role === 'primary')).toHaveLength(1);
  });

  it('`primary <card>` moves the role; the old primary may then close', async () => {
    const h = await makeHarness();
    h.interactive.applyCardArrangement([], {});
    const first = terminals(h)[0]!.instanceId;
    run(h, { target: '#general', beside: true });
    const second = terminals(h).find((t) => t.instanceId !== first)!.instanceId;
    expect(run(h, { target: 'primary', cardId: second })).toEqual([]);
    expect(terminals(h).find((t) => t.instanceId === second)!.role).toBe('primary');
    expect(h.interactive.arrangeCard(first, 'close').refused).toBeNull();
  });

  it('refuses by name: an unknown view, a missing target, a non-terminal primary', async () => {
    const h = await makeHarness();
    h.interactive.applyCardArrangement([{ cardId: 'who' }], {});
    vi.spyOn(MixinApi, 'isClientState').mockReturnValue(false);
    expect(run(h, { target: 'Nonesuch' })[0]).toMatchObject({ reason: 'unknown-view' });
    expect(run(h, {})[0]).toMatchObject({ reason: 'missing-arg' });
    expect(run(h, { target: 'primary', cardId: 'who' })[0]).toMatchObject({
      reason: 'not-a-terminal',
    });
  });

  it('`All` is always a view', async () => {
    const h = await makeHarness();
    h.interactive.applyCardArrangement([], { view: 'Chat' });
    run(h, { target: 'all' });
    expect(payloadOf(h, terminals(h)[0]!.instanceId).filter).toEqual({ view: 'All' });
  });
});
