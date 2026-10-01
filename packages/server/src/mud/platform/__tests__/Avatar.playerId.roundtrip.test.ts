/**
 * ⭐⭐ One `playerId`, proved THROUGH THE STORE.
 *
 * The requirement is not *the getter agrees* — it is that the one field
 * survives a capture → `holder_snapshots` → materialize round trip, and
 * that all three bodies in the family answer under the same identity.
 *
 * Before this build the field existed three times under three names
 * (`playerId`, `shadePlayerId`, `wirePlayerId`), each vessel overrode
 * `getPlayerId()` to undo its own copy, and each overrode
 * `getIdentityPath()` to rebuild the same string. The copies existed for
 * one real reason — a clone's `dataOverlay` lands in hydration Phase 1,
 * before `postRegister` — and declaring the base field persistent gets
 * that ordering without the copies.
 *
 * ⚠ The consequence this pins: the record body's snapshot now CARRIES
 * `playerId`, which it did not before. It is redundant with the identity
 * path's tail, so the test asserts they agree rather than trusting one.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Avatar from '../agent/Avatar';
import Shade from '../agent/Shade';
import WireBody from '../agent/sandbox/WireBody';
import Species from '../idea/species/Species';
import BodyPlan from '../idea/species/BodyPlan';
import PersistentHydrator from '../idea/persistence/PersistentHydrator';
import { Document } from '../../lib/persistence/Document';
import { PersistableApi } from '../../api/persistable';
import { PlayerApi } from '../../api/player';
import { StuffApi } from '../../api/stuff';
import { ParcelApi } from '../../api/parcel';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

let snapshots: Record<string, unknown>[] = [];
let seq = 0;

/** The in-memory `holder_snapshots` store (the spine suite's harness). */
function installStore(): void {
  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return [];
    return snapshots.filter((d) =>
      Object.entries(query).every(([k, v]) => d[k] === v),
    );
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== 'holder_snapshots') return 'id';
    const i = snapshots.findIndex(
      (d) => d.scope === doc.scope && d.owner === doc.owner,
    );
    if (i >= 0) {
      snapshots[i] = { ...doc, _id: snapshots[i]!._id };
      return snapshots[i]!._id as string;
    }
    const _id = String(snapshots.length + 1);
    snapshots.push({ ...doc, _id });
    return _id;
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);
}

function species(): Species {
  seq += 1;
  const plan = makeStuff(() => new BodyPlan());
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/pid-${seq}`);
  plan.setSlots([{ name: 'cranial', accepts: 'SlottableMixin' }]);
  const s = makeStuff(() => new Species());
  stampTemplatePathForTest(s, `/stuff/idea/species/animalia/pid-${seq}`);
  s.setBodyPlan(plan);
  return s;
}

describe('⭐⭐ one playerId, one identity thread', () => {
  beforeEach(() => {
    snapshots = [];
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    installStore();
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({
      kind: 'group',
      name: 'lounge',
    });
    makeStuffAtPath(
      () => new PersistentHydrator(),
      PersistentHydrator.templatePath,
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('survives capture → holder_snapshots → materialize onto a fresh shell', async () => {
    const key = Avatar.getTemplatePath('pid-rt-1');
    const body = makeStuff(() => new Avatar());
    stampTemplatePathForTest(body, key);
    body.setPlayerId('pid-rt-1');
    body.setSpecies(species());

    await PersistableApi.capture(body, key);

    // ⭐ Through the STORE, not the instance: the field must be in the
    // document, or a fresh shell has nothing to read.
    expect(JSON.stringify(snapshots)).toContain('"playerId":"pid-rt-1"');

    StuffApi.unregister(body);

    const reborn = makeStuff(() => new Avatar());
    stampTemplatePathForTest(reborn, key);
    reborn.setSpecies(species());
    await PersistableApi.materialize(reborn, key);

    expect(reborn.getPlayerId()).toBe('pid-rt-1');
    expect(reborn.getIdentityPath()).toBe(key);
  });

  it('⭐ the stored playerId and the identity path agree — the redundancy is checked, not trusted', async () => {
    const key = Avatar.getTemplatePath('pid-rt-2');
    const body = makeStuff(() => new Avatar());
    stampTemplatePathForTest(body, key);
    body.setPlayerId('pid-rt-2');
    body.setSpecies(species());
    await PersistableApi.capture(body, key);

    const tail = (body.getIdentityPath() ?? '').split('/').pop();
    expect(tail).toBe(body.getPlayerId());
  });

  it('a shade answers under the player, from the one field', async () => {
    const sh = makeStuff(() => new Shade());
    sh.playerId = 'pid-rt-3';
    sh.setSpecies(species());
    await sh.postRegister();

    expect(sh.getPlayerId()).toBe('pid-rt-3');
    expect(sh.getIdentityPath()).toBe(Avatar.getTemplatePath('pid-rt-3'));
  });

  it('a circle body answers under the player, from the one field', async () => {
    const wb = makeStuff(() => new WireBody());
    wb.playerId = 'pid-rt-4';
    wb.setSpecies(species());
    await wb.postRegister();

    expect(wb.getPlayerId()).toBe('pid-rt-4');
    expect(wb.getIdentityPath()).toBe(Avatar.getTemplatePath('pid-rt-4'));
  });

  it('⚠ neither vessel claims the registry slot — the parked body keeps it', async () => {
    const sh = makeStuff(() => new Shade());
    sh.playerId = 'pid-rt-5';
    sh.setSpecies(species());
    await sh.postRegister();
    // The death choreography registers the shade LATER, deliberately,
    // after the drained body has been unregistered.
    expect(PlayerApi.findAvatarByPlayerId('pid-rt-5')).toBeUndefined();
  });

  it('a guest (no playerId) falls through to its minted path, as before', () => {
    const guest = makeStuff(() => new Avatar());
    stampTemplatePathForTest(guest, '/platform/agent/Avatar/guest-xyz');
    expect(guest.getPlayerId()).toBe('');
    expect(guest.getIdentityPath()).toBe('/platform/agent/Avatar/guest-xyz');
  });
});
