/**
 * ⭐ The trade's instruments — `set` (a splint) and `operate` (a surgeon's
 * kit). Both apply a wound's treatment through the ONE body primitive
 * (`Vitals.applyTreatment`); the tool affords the verb, and how well it
 * goes is the medic's competence. `operate` is the gated one: a lying
 * patient and a competent hand, or it is refused by name.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SetController from '../idea/cmd/medical/SetController';
import OperateController from '../idea/cmd/medical/OperateController';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import { Postures } from '@saxonberg/server/mud/lib/slot/Postured';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';

class Medic extends AdvancementMixin(Creature) {
  static override _mixinName: string = 'Medic';
  public band: CompetenceBandName = 'competent';
  public override async competenceBandFor(): Promise<CompetenceBandName> {
    return this.band;
  }
}

let note: ReturnType<typeof vi.fn>;

function silence(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

const ctxFor = (actor: unknown): CommandContext =>
  ({ commandGiver: actor, location: null, note } as unknown as CommandContext);

const tool = (): MqlOneResult =>
  ({ stuff: makeStuff(() => new Thing()), raw: 'it' } as unknown as MqlOneResult);

/** What the binder hands back when its `[capability.*]` default matches
 * nothing in hand — the arg is bound, but empty (not omitted). */
const empty = (): MqlOneResult =>
  ({ stuff: null, raw: '' } as unknown as MqlOneResult);

function fractureOn(c: Creature, severity = 2): Trauma {
  const t: Trauma = {
    kind: 'trauma',
    type: 'fracture',
    site: 'body.leg.left',
    severity,
  };
  c.afflict(t);
  return t;
}

function ruptureOn(c: Creature, severity = 3): Trauma {
  const t: Trauma = {
    kind: 'trauma',
    type: 'rupture',
    site: 'body.torso.liver',
    severity,
    bleeding: true,
  };
  c.afflict(t);
  return t;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  note = vi.fn();
  silence();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('set — a splint', () => {
  it('⭐⭐ sets a fracture (it reads as set, at a graded quality)', async () => {
    const me = makeStuff(() => new Medic());
    const frac = fractureOn(me);
    await makeStuff(() => new SetController()).execute(
      { splint: tool() },
      ctxFor(me),
    );
    expect(frac.dressed).toBe(true);
    expect(frac.careQuality).toBeGreaterThan(0);
  });

  it('⚠ refuses without a splint', async () => {
    const me = makeStuff(() => new Medic());
    fractureOn(me);
    await makeStuff(() => new SetController()).execute(
      { splint: empty() },
      ctxFor(me),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'no-splint' }),
    );
  });

  it('⚠ refuses a body with no broken bone', async () => {
    const me = makeStuff(() => new Medic());
    await makeStuff(() => new SetController()).execute(
      { splint: tool() },
      ctxFor(me),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'nothing-to-set' }),
    );
  });
});

describe('operate — a surgeon\'s kit', () => {
  it('⭐⭐ a competent surgeon closes a rupture on a lying patient', async () => {
    const surgeon = makeStuff(() => new Medic());
    const patient = makeStuff(() => new Creature());
    patient.setPosture(Postures.Lie);
    const rup = ruptureOn(patient);
    await makeStuff(() => new OperateController()).execute(
      { patient: { stuff: patient, raw: 'them' } as unknown as MqlOneResult, kit: tool() },
      ctxFor(surgeon),
    );
    expect(rup.dressed).toBe(true);
    expect(rup.bleeding).toBe(false);
  });

  it('⚠ refuses an UNTRAINED surgeon by name', async () => {
    const surgeon = makeStuff(() => new Medic());
    surgeon.band = 'novice'; // below competent
    const patient = makeStuff(() => new Creature());
    patient.setPosture(Postures.Lie);
    ruptureOn(patient);
    await makeStuff(() => new OperateController()).execute(
      { patient: { stuff: patient, raw: 'them' } as unknown as MqlOneResult, kit: tool() },
      ctxFor(surgeon),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'unskilled' }),
    );
  });

  it('⚠ refuses a patient who is not lying', async () => {
    const surgeon = makeStuff(() => new Medic());
    const patient = makeStuff(() => new Creature());
    patient.setPosture(Postures.Stand);
    ruptureOn(patient);
    await makeStuff(() => new OperateController()).execute(
      { patient: { stuff: patient, raw: 'them' } as unknown as MqlOneResult, kit: tool() },
      ctxFor(surgeon),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'not-lying' }),
    );
  });
});
