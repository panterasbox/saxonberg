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
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MqlSubscriptionApi, DETAIL_FIELDS } from '../mql-subscription';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import { PerceptionApi } from '../perception';
import Avatar from '../../platform/agent/Avatar';
import Species from '../../platform/idea/species/Species';
import BodyPlan from '../../platform/idea/species/BodyPlan';
import Thing from '../../lib/stuff/Thing';
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
  SlottableMixin(ContainableMixin(Thing)),
) {}

let uniq = 0;

async function dressedAvatar(): Promise<{
  avatar: Avatar;
  shirt: TestGarment;
  pocketed: Thing;
  planPath: string;
}> {
  const suffix = `-${uniq++}`;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`worn-wire-biped${suffix}`);
  plan.setSlots([{ name: 'torso', accepts: 'WearableMixin' }]);
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

  const pocketed = makeStuff(() => new Thing());
  pocketed.setShortDescription('a folded letter');
  pocketed.setPrimaryKeyword('letter');

  ContainmentApi.move(shirt, avatar);
  ContainmentApi.move(pocketed, avatar);
  return { avatar, shirt, pocketed, planPath };
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
    avatar.occupyAll(shirt, ['torso']);

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
    avatar.occupyAll(shirt, ['torso']);
    const rec = project(avatar, avatar);
    const overlap = ids(rec.worn).filter((id) => ids(rec.contents).includes(id));
    expect(overlap).toEqual([]);
  });

  it('an unperceived worn item never enters the projection', async () => {
    const { avatar, shirt } = await dressedAvatar();
    avatar.occupyAll(shirt, ['torso']);
    // Honest fog on the wire, exactly as `contents` does it.
    const spy = vi
      .spyOn(PerceptionApi, 'perceives')
      .mockImplementation((_viewer, target) => target.stuffId !== shirt.stuffId);
    try {
      expect(ids(project(avatar, avatar).worn)).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it('a host with no slots omits the field entirely', async () => {
    const plain = makeStuff(() => new Thing());
    const rec = project(plain, plain);
    expect('worn' in rec).toBe(false);
  });
});
