/**
 * THE ROUND-TRIP ACCEPTANCE TEST (docs/subsystems/sandbox.md): enter
 * through the real door → author (PASS persists) + play (STAMP rows
 * visible in-circle, invisible to field reads) + play-money (the
 * banking overlay moves; the field cache never does) → exit → field
 * state unchanged on every material ledger, authored truth intact,
 * epistemic records wire-marked.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SandboxApi } from '../../../../api/sandbox';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { EventApi } from '../../../../api/event';
import { ConnectionApi } from '../../../../api/connection';
import { ContainmentApi } from '../../../../api/containment';
import { PersistApi } from '../../../../api/persist';
import { Stuff } from '../../../stuff/Stuff';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../../../api/execution-context';
import {
  PersistenceManager,
  Collections,
} from '../../../../../backend/PersistenceManager';
import EventRegistry from '../../../../obj/EventRegistry';
import Interactive from '../../../../obj/Interactive';
import Avatar from '../../../../obj/Avatar';
import CartesianLocation from '../../../location/CartesianLocation';
import SandboxCrossing from '../../../../obj/sandbox/SandboxCrossing';
import SandboxCrossingExit from '../../SandboxCrossingExit';
import type { Containable } from '../../../spatial/Containable';
import type { Container } from '../../../spatial/Container';
import type { Mobile } from '../../../spatial/Mobile';

const PLAYER = 'roundtripper';
const SCOPE = `/home/${PLAYER}`;

interface FakeRow {
  circleScope?: string;
  [k: string]: unknown;
}

function installFakeStore(pm: PersistenceManager): Map<string, FakeRow[]> {
  const store = new Map<string, FakeRow[]>();
  const rowsFor = (name: string): FakeRow[] => {
    let rows = store.get(name);
    if (!rows) {
      rows = [];
      store.set(name, rows);
    }
    return rows;
  };
  const matches = (row: FakeRow, filter: Record<string, unknown>): boolean => {
    for (const [k, v] of Object.entries(filter)) {
      if (k === '$or') {
        if (
          !(v as Record<string, unknown>[]).some((b) => matches(row, b))
        ) {
          return false;
        }
        continue;
      }
      if (v !== null && typeof v === 'object' && '$exists' in (v as object)) {
        if ((k in row) !== (v as { $exists: boolean }).$exists) return false;
        continue;
      }
      if (row[k] !== v) return false;
    }
    return true;
  };
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'getCollection').mockImplementation((name: string) => {
    const fake = {
      insertOne: async (doc: FakeRow) => {
        rowsFor(name).push(doc);
        return { insertedId: { toString: () => 'id' } };
      },
      updateOne: async () => ({}),
      deleteMany: async (filter: Record<string, unknown>) => {
        const rows = rowsFor(name);
        const keep = rows.filter((r) => !matches(r, filter));
        store.set(name, keep);
        return { deletedCount: rows.length - keep.length };
      },
      deleteOne: async () => ({}),
      find: (filter: Record<string, unknown>) => {
        const result = rowsFor(name).filter((r) => matches(r, filter));
        const cursor = {
          sort: () => cursor,
          limit: () => cursor,
          toArray: async () =>
            result.map((r) => ({ ...r, _id: { toString: () => 'id' } })),
        };
        return cursor;
      },
      findOne: async () => null,
    };
    return fake as unknown as ReturnType<PersistenceManager['getCollection']>;
  });
  return store;
}

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

describe('sandbox-escape: the round-trip criterion', () => {
  let pm: PersistenceManager;
  let store: Map<string, FakeRow[]>;

  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    ExecutionContextApi._clearForTesting();
    pm = PersistenceManager.get();
    store = installFakeStore(pm);
    pm.setScopeResolver(() => {
      const s = ExecutionContextApi.getCircleScope();
      return s === OMNI_SCOPE ? null : s;
    });
    await bootRegistry();
  });

  afterEach(async () => {
    if (SandboxApi.sessionForScope(SCOPE)) {
      await SandboxApi.closeSession(SCOPE);
    }
    pm.setScopeResolver(() => null);
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('enter → author + play + transact → exit → field unchanged, edits kept', async () => {
    // Baseline field truth on every material ledger.
    store.set(Collections.BankLedger, [{ kind: 'mint', amount: 1000 }]);
    store.set(Collections.Transcripts, [{ owner: 'someone', check: 'x' }]);

    // The player and the door.
    const room = await StuffApi.create(() => new CartesianLocation());
    const avatar = await StuffApi.create(() => new Avatar(), {
      playerId: PLAYER,
    });
    Stuff._stampTemplatePath(avatar, Avatar.getTemplatePath(PLAYER));
    ContainmentApi.move(
      avatar as unknown as Stuff & Containable,
      room as unknown as Stuff & Container
    );
    const interactive = await StuffApi.create(
      () => new Interactive('sock-rt', 'sess-rt', { _id: 'u1' } as never)
    );
    ConnectionApi.transfer(interactive, avatar);
    const wardrobe = await StuffApi.create(() => new SandboxCrossing());
    ContainmentApi.move(
      wardrobe as unknown as Stuff & Containable,
      room as unknown as Stuff & Container
    );
    const passage = (
      room as unknown as { getExit(d: string): SandboxCrossingExit }
    ).getExit('crossing');

    // ENTER through the door.
    await (avatar as unknown as Mobile).traverse(passage, 'walk');
    const wireBody = SandboxApi.activeBodyFor(PLAYER)!;
    expect(wireBody).toBeTruthy();

    // IN-CIRCLE: author (PASS), play (STAMP), remember (PASS-marked).
    await ExecutionContextApi.runRootGuarded(
      null,
      'in-circle',
      async () => {
        // author a template under the circle namespace — the deliberate save
        await PersistApi.save(Collections.Domain, {
          path: `${SCOPE}/workshop`,
          class: '/obj/location/Room',
        });
        // fight + transact — material ledger rows
        await PersistApi.save(Collections.BankLedger, {
          kind: 'transfer',
          amount: 50,
        });
        await PersistApi.save(Collections.Transcripts, {
          owner: Avatar.getTemplatePath(PLAYER),
          check: 'attack',
        });
        // meet someone — epistemic ledger row
        await PersistApi.save(Collections.Chronicles, {
          owner: Avatar.getTemplatePath(PLAYER),
          deed: 'built a workshop',
        });

        // standing and money VISIBLY work in-circle (global ∪ own-scope)
        const ledger = await PersistApi.find(Collections.BankLedger, {});
        expect(ledger).toHaveLength(2);
        const transcripts = await PersistApi.find(Collections.Transcripts, {});
        expect(transcripts).toHaveLength(2);
      },
      'rethrow',
      { circleScope: SCOPE }
    );

    // Field reads exclude the scoped rows while the session lives.
    expect(await PersistApi.find(Collections.BankLedger, {})).toHaveLength(1);
    expect(await PersistApi.find(Collections.Transcripts, {})).toHaveLength(1);

    // EXIT through the in-circle passage.
    await ExecutionContextApi.runRoot(
      null,
      'system',
      () => {
        const entry = SandboxApi.entryRoomForScope(SCOPE)!;
        const out = (
          entry as unknown as { getExit(d: string): SandboxCrossingExit }
        ).getExit('out');
        return (wireBody as unknown as Mobile).traverse(out, 'walk');
      },
      { circleScope: OMNI_SCOPE }
    );

    // Field state unchanged on every material ledger…
    expect(store.get(Collections.BankLedger)).toEqual([
      { kind: 'mint', amount: 1000 },
    ]);
    expect(store.get(Collections.Transcripts)).toEqual([
      { owner: 'someone', check: 'x' },
    ]);
    // …the authored edit persists (the deliberate save is the product)…
    expect(store.get(Collections.Domain)).toEqual([
      { path: `${SCOPE}/workshop`, class: '/obj/location/Room' },
    ]);
    // …and the epistemic record exists, wire-marked.
    //
    // Asserted by shape rather than as the whole array: a crossing runs
    // the ordinary arrival ceremony, so the engine's own chronicle
    // writes (the `first-arrival` deed) land here too. That is the
    // policy working — chronicles are STAMP, so anything written from
    // inside carries the scope and discards with it — and the test's
    // claim is "every chronicle row is wire-marked", not "the circle
    // wrote exactly one row".
    const chronicles = store.get(Collections.Chronicles) ?? [];
    expect(
      chronicles.every(
        (row) => (row as { circleScope?: string }).circleScope === SCOPE
      )
    ).toBe(true);
    expect(chronicles).toContainEqual(
      expect.objectContaining({
        owner: Avatar.getTemplatePath(PLAYER),
        deed: 'built a workshop',
        circleScope: SCOPE,
      })
    );
  });
});
