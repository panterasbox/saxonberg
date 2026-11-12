/**
 * The `worn` wire field — the body half of the inspection card.
 *
 * ⚠ This is the WIRING test, and it exists because a component test
 * proves rendering and never wiring. Three separate things have to be
 * true for a worn garment to reach the card, and each of them fails
 * silently on its own:
 *
 *   1. `'worn'` is in `DETAIL_FIELDS` (otherwise the field is computed
 *      and dropped on the floor);
 *   2. a dressed host actually PROJECTS it;
 *   3. `contents` STOPS carrying the same garment — the two are a
 *      partition of one set, and without the subtraction the card would
 *      show a shirt twice and mean nothing by either.
 */

import '../../../test-bootstrap';
import { carry } from '../../lib/slot/__tests__/carrying-fixture';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MqlSubscriptionApi, DETAIL_FIELDS } from '../mql-subscription';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import { PerceptionApi } from '../perception';
import Avatar from '../../platform/agent/PrimaryAvatar';
import Species from '../../platform/idea/species/Species';
import BodyPlan from '../../platform/idea/species/BodyPlan';
import Good from '../../lib/stuff/Good';
import { WearableMixin } from '../../lib/slot/Wearable';
import { SlottableMixin } from '../../lib/slot/Slottable';
import { ContainableMixin } from '../../lib/spatial/Containable';
import type { Sensor } from '../../lib/message/Sensor';
import type { Stuff } from '../../lib/stuff/Stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../lib/security/__tests__/test-setup';

class TestGarment extends WearableMixin(
  SlottableMixin(ContainableMixin(Good)),
) {}

let uniq = 0;

async function dressedAvatar(): Promise<{
  avatar: Avatar;
  shirt: TestGarment;
  pocketed: Good;
  planPath: string;
}> {
  const suffix = `-${uniq++}`;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`worn-wire-biped${suffix}`);
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin' },
    // Hands (the flip, W7): what is carried and not worn is held.
    { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.hand.left' },
    { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.hand.right' },
  ]);
  plan.setBodyParts([
    { key: 'body', parent: null, tissues: [] },
    { key: 'body.hand.left', parent: 'body', tissues: [], serves: ['manipulation'] },
    { key: 'body.hand.right', parent: 'body', tissues: [], serves: ['manipulation'] },
  ]);
  const planPath = `/stuff/idea/species/BodyPlan/worn-wire${suffix}`;
  stampTemplatePathForTest(plan, planPath);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/worn-wire${suffix}`);

  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  avatar.setSpecies(species);

  const shirt = makeStuff(() => new TestGarment());
  shirt.setShortDescription('a plain shirt');
  shirt.setPrimaryKeyword('shirt');
  shirt.setSlotClaim(planPath, ['torso']);

  const pocketed = makeStuff(() => new Good());
  pocketed.setShortDescription('a folded letter');
  pocketed.setPrimaryKeyword('letter');

  carry(avatar, shirt);
  carry(avatar, pocketed);
  return { avatar, shirt, pocketed, planPath };
}

/** Out of the hand it is held in, onto the torso (the flip, W7: held is not worn). */
function putOn(avatar: Avatar, shirt: TestGarment): void {
  for (const h of ['hand:left', 'hand:right']) if (avatar.getOccupants(h).has(shirt)) avatar.vacate(h, shirt);
  avatar.occupyAll(shirt, ['torso']);
}

function project(host: Stuff, viewer: Stuff): Record<string, unknown> {
  return MqlSubscriptionApi.projectFields(
    host,
    DETAIL_FIELDS,
    viewer as Stuff & Sensor,
  ) as unknown as Record<string, unknown>;
}

function ids(rows: unknown): string[] {
  return ((rows ?? []) as Array<{ stuffId: string }>).map((r) => r.stuffId);
}

describe('the `worn` wire field', () => {
  afterEach(() => StuffApi.clearAll());

  it('is part of the detail field set', () => {
    // Leg 1: without this the projection is computed and discarded.
    expect(DETAIL_FIELDS).toContain('worn');
  });

  it('projects what is worn and keeps what is carried out of it', async () => {
    const { avatar, shirt, pocketed } = await dressedAvatar();
    putOn(avatar, shirt);

    const rec = project(avatar, avatar);
    expect(ids(rec.worn)).toEqual([shirt.stuffId]);
    // Leg 3 — the partition. Wearing something never removed it from
    // the wearer's contents, so the subtraction is what makes "worn vs
    // carried" mean anything at all.
    expect(ids(rec.contents)).toContain(pocketed.stuffId);
    expect(ids(rec.contents)).not.toContain(shirt.stuffId);
  });

  it('a carried-but-unworn garment is contents, not worn', async () => {
    const { avatar, shirt } = await dressedAvatar();
    const rec = project(avatar, avatar);
    expect(ids(rec.worn)).toEqual([]);
    expect(ids(rec.contents)).toContain(shirt.stuffId);
  });

  it('the two projections are disjoint over one host', async () => {
    const { avatar, shirt } = await dressedAvatar();
    putOn(avatar, shirt);
    const rec = project(avatar, avatar);
    const overlap = ids(rec.worn).filter((id) => ids(rec.contents).includes(id));
    expect(overlap).toEqual([]);
  });

  it('an unperceived worn item never enters the projection', async () => {
    const { avatar, shirt } = await dressedAvatar();
    putOn(avatar, shirt);
    // Honest fog on the wire, exactly as `contents` does it.
    // ⚠ Through the one filter since size-and-carrying W3 (D23).
    const spy = vi
      .spyOn(PerceptionApi, 'perceived')
      .mockImplementation((_viewer, list) => list.filter((x) => x.stuffId !== shirt.stuffId));
    try {
      expect(ids(project(avatar, avatar).worn)).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it('a host with no slots omits the field entirely', async () => {
    const plain = makeStuff(() => new Good());
    const rec = project(plain, plain);
    expect('worn' in rec).toBe(false);
  });
});
