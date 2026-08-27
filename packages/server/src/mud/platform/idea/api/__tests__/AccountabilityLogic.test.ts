/**
 * AccountabilityLogic — the unified harm ledger read surface, exercised
 * end-to-end against a faked Mongo (the `ProvenanceLogic.test` pattern).
 *
 * The load-bearing assertion is **the pinned combat migration regression**:
 * the three canonical combat verdicts — a consented duel kill (no crime),
 * an imposed lethal kill (crime), a beast cull (no crime) — derive
 * byte-identically when read through `CombatApi.blameFor`, now that combat
 * delegates to `AccountabilityApi`. Plus the new `harm` producer path read
 * through `AccountabilityApi.blameFor`/`crimeFor`.
 *
 * Rows are seeded DIRECTLY (the derivation reader is what's under test); the
 * `AccountabilityApi.record` fire-and-forget writer is covered by the shape
 * of the row it builds in `AccountabilityLogic` (unit-derivation in
 * `lib/accountability/__tests__/AccountabilityEvent.test.ts`).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CombatApi } from '../../../../api/combat';
import { AccountabilityApi } from '../../../../api/accountability';
import AccountabilityEvent from '../../../../lib/accountability/AccountabilityEvent';
import type { AccountabilityFields } from '../../../../lib/accountability/AccountabilityEvent';
import { StuffApi } from '../../../../api/stuff';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

/** Seed one attribution row directly into the faked ledger. */
async function seed(
  fields: Partial<AccountabilityFields> & { realAt: number },
): Promise<void> {
  const ev = new AccountabilityEvent();
  ev.kind = fields.kind ?? 'death';
  ev.sessionId = fields.sessionId ?? 's1';
  ev.initiator = fields.initiator ?? '/platform/agent/Avatar/attacker';
  ev.opponent = fields.opponent ?? '/platform/agent/Avatar/attacker';
  ev.victim = fields.victim ?? '/platform/agent/Avatar/victim';
  ev.killer = fields.killer ?? '/platform/agent/Avatar/attacker';
  ev.lethality = fields.lethality ?? 'lethal';
  ev.stopCondition = fields.stopCondition ?? 'death';
  ev.consented = fields.consented ?? false;
  ev.sentient = fields.sentient ?? true;
  ev.realAt = fields.realAt;
  await ev.save();
}

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('CombatApi.blameFor delegation — the pinned migration regression', () => {
  it('a consented duel kill is NOT a crime (read through CombatApi)', async () => {
    await seed({
      kind: 'death',
      victim: '/platform/agent/Avatar/duelist',
      lethality: 'lethal',
      consented: true,
      sentient: true,
      realAt: 10,
    });
    const v = await CombatApi.blameFor('/platform/agent/Avatar/duelist');
    expect(v).not.toBeNull();
    expect(v!.crime).toBe(false);
  });

  it('an imposed lethal kill IS a crime (read through CombatApi)', async () => {
    await seed({
      kind: 'death',
      victim: '/platform/agent/Avatar/townsperson',
      lethality: 'lethal',
      consented: false,
      sentient: true,
      realAt: 10,
    });
    const v = await CombatApi.blameFor('/platform/agent/Avatar/townsperson');
    expect(v!.crime).toBe(true);
  });

  it('a beast cull is NOT a crime (read through CombatApi)', async () => {
    await seed({
      kind: 'death',
      victim: '/obj/wolf',
      lethality: 'lethal',
      consented: false,
      sentient: false,
      realAt: 10,
    });
    const v = await CombatApi.blameFor('/obj/wolf');
    expect(v!.crime).toBe(false);
  });

  it('null when the victim has no attributed death', async () => {
    expect(await CombatApi.blameFor('/platform/agent/Avatar/nobody')).toBeNull();
  });
});

describe('AccountabilityApi — the trap (harm) producer read', () => {
  it('a harm row on a non-consenting sentient derives a crime', async () => {
    await seed({
      kind: 'harm',
      victim: '/platform/agent/Avatar/passerby',
      killer: '/platform/agent/Avatar/trapper',
      lethality: 'non-lethal',
      consented: false,
      sentient: true,
      realAt: 5,
    });
    expect(await AccountabilityApi.crimeFor('/platform/agent/Avatar/passerby')).toBe(true);
    const v = await AccountabilityApi.blameFor('/platform/agent/Avatar/passerby');
    expect(v!.killer).toBe('/platform/agent/Avatar/trapper');
  });

  it('a harm row on a beast is not a crime', async () => {
    await seed({
      kind: 'harm',
      victim: '/obj/boar',
      consented: false,
      sentient: false,
      realAt: 5,
    });
    expect(await AccountabilityApi.crimeFor('/obj/boar')).toBe(false);
  });

  it('eventsForSession returns a session chain ordered by realAt', async () => {
    await seed({ kind: 'death', sessionId: 'sX', realAt: 20 });
    await seed({ kind: 'opened', sessionId: 'sX', realAt: 10 });
    const rows = await AccountabilityApi.eventsForSession('sX');
    expect(rows.map((r) => r.kind)).toEqual(['opened', 'death']);
  });
});
