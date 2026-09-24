/**
 * ⭐ The `nurses` brain (recovery D9) — the physician who practises. On a
 * cadence, on shift, she triages the room and dresses a wound from real
 * (finite) supply, or sits with the worst patient. Everything through the
 * same body primitives a player uses; deterministic, no roll.
 *
 * ⚠ Employment/shift are stubbed (a rostered on-shift NPC is a wire
 * concern); this drives the brain's own logic: triage, treat, consume.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as NursesBrain } from '../behavior/nurses';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { EngagedMixin } from '@saxonberg/server/mud/lib/activity/Engaged';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import Location from '@saxonberg/server/mud/lib/stuff/Location';
import Bandage from '@saxonberg/server/mud/platform/thing/Bandage';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';

/** An on-shift physician: Engaged + Advancing, shift stubbed. */
class Nurse extends AdvancementMixin(EngagedMixin(Creature)) {
  static override _mixinName: string = 'Nurse';
  public band: CompetenceBandName = 'proficient';
  public override async competenceBandFor(): Promise<CompetenceBandName> {
    return this.band;
  }
  public shiftState(): 'on-shift' | 'off-shift' {
    return 'on-shift';
  }
}

const ctxFor = (host: unknown): BrainContext =>
  ({
    host,
    config: {},
    state: {},
    trigger: { source: 'cadence', raw: '' },
  } as unknown as BrainContext);

function woundOn(c: Creature, type: Trauma['type'], severity: number): Trauma {
  const t: Trauma = {
    kind: 'trauma',
    type,
    site: 'body.arm.left',
    severity,
    bleeding: type === 'laceration',
  };
  c.afflict(t);
  return t;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._setNowProviderForTesting(() => 1_000_000);
  // Every Nurse reads as employed (the roster is a wire concern).
  vi.spyOn(MixinApi, 'isEmployed').mockReturnValue(true);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the nurses brain', () => {
  it('⭐⭐ dresses a wounded patient from the ward supply, and spends it', async () => {
    const room = makeStuff(() => new Location());
    const nurse = makeStuff(() => new Nurse());
    ContainmentApi.move(nurse, room);
    const patient = makeStuff(() => new Creature());
    ContainmentApi.move(patient, room);
    const wound = woundOn(patient, 'laceration', 2);
    const bandage = makeStuff(() => new Bandage());
    ContainmentApi.move(bandage, room);

    await NursesBrain.act(ctxFor(nurse));

    expect(wound.dressed).toBe(true); // she dressed it
    expect(StuffApi.findById(bandage.stuffId)).toBeFalsy(); // supply spent
  });

  it('⭐ treats the more urgent patient first (triage is deterministic)', async () => {
    const room = makeStuff(() => new Location());
    const nurse = makeStuff(() => new Nurse());
    ContainmentApi.move(nurse, room);
    const light = makeStuff(() => new Creature());
    const grave = makeStuff(() => new Creature());
    ContainmentApi.move(light, room);
    ContainmentApi.move(grave, room);
    const lightWound = woundOn(light, 'laceration', 1);
    const graveWound = woundOn(grave, 'laceration', 5);
    ContainmentApi.move(makeStuff(() => new Bandage()), room);

    await NursesBrain.act(ctxFor(nurse));

    // Only ONE act per beat, and it went to the worse wound.
    expect(graveWound.dressed).toBe(true);
    expect(lightWound.dressed).toBeFalsy();
  });

  it('⚠ off shift, she does nothing', async () => {
    const room = makeStuff(() => new Location());
    const nurse = makeStuff(() => new Nurse());
    (nurse as unknown as { shiftState: () => string }).shiftState = () => 'off-shift';
    ContainmentApi.move(nurse, room);
    const patient = makeStuff(() => new Creature());
    ContainmentApi.move(patient, room);
    const wound = woundOn(patient, 'laceration', 2);
    ContainmentApi.move(makeStuff(() => new Bandage()), room);

    await NursesBrain.act(ctxFor(nurse));
    expect(wound.dressed).toBeFalsy();
  });
});
