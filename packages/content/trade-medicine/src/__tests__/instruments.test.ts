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
import SurgicalKit from '../thing/SurgicalKit';
import OperationCatalogue from '@saxonberg/server/mud/platform/idea/OperationCatalogue';
import type { OperationDescriptor } from '@saxonberg/server/mud/platform/idea/Operation';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import { Postures } from '@saxonberg/server/mud/lib/slot/Postured';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { makeStuff, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
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

function fractureOn(c: Creature, severity = 1): Trauma {
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

const OPS: OperationDescriptor[] = [
  {
    key: 'rupture-repair',
    label: 'rupture repair',
    addresses: { traumaTypes: ['rupture'] },
    instrument: 'surgery',
    competence: { discipline: 'medicine', band: 'competent' },
    bloodCostL: 0.3,
    baseDurationS: 300,
    anaesthesia: 'required',
    resolution: 'surgery',
    difficulty: 'formidable',
  },
];

/** Stand up an OperationCatalogue with the ops seeded (the drive warms it
 * from rows; a unit test injects the cache). */
function warmCatalogue(): void {
  const cat = makeStuff(() => new OperationCatalogue());
  stampTemplatePathForTest(cat, '/platform/idea/OperationCatalogue');
  (cat as unknown as { cache: Map<string, OperationDescriptor> }).cache =
    new Map(OPS.map((o) => [o.key, o]));
}

const kit = (): MqlOneResult =>
  ({ stuff: makeStuff(() => new SurgicalKit()), raw: 'kit' } as unknown as MqlOneResult);

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
  // ⭐ A successful durative operation is the DRIVE's job (it needs the
  // catalogue warmed from rows, the scheduler, and anaesthesia). These
  // cover the synchronous refusal GATES, each of which fires before any
  // engagement starts.
  it('⚠ refuses when nothing matches an operation', async () => {
    warmCatalogue();
    const surgeon = makeStuff(() => new Medic());
    const patient = makeStuff(() => new Creature());
    patient.setPosture(Postures.Lie);
    await makeStuff(() => new OperateController()).execute(
      { patient: { stuff: patient, raw: 'them' } as unknown as MqlOneResult, kit: kit() },
      ctxFor(surgeon),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'nothing-to-operate' }),
    );
  });

  it('⚠ refuses an UNTRAINED surgeon by name', async () => {
    warmCatalogue();
    const surgeon = makeStuff(() => new Medic());
    surgeon.band = 'novice';
    const patient = makeStuff(() => new Creature());
    patient.setPosture(Postures.Lie);
    ruptureOn(patient);
    await makeStuff(() => new OperateController()).execute(
      { patient: { stuff: patient, raw: 'them' } as unknown as MqlOneResult, kit: kit() },
      ctxFor(surgeon),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'unskilled' }),
    );
  });

  it('⚠ refuses a patient who is not lying', async () => {
    warmCatalogue();
    const surgeon = makeStuff(() => new Medic());
    const patient = makeStuff(() => new Creature());
    patient.setPosture(Postures.Stand);
    ruptureOn(patient);
    await makeStuff(() => new OperateController()).execute(
      { patient: { stuff: patient, raw: 'them' } as unknown as MqlOneResult, kit: kit() },
      ctxFor(surgeon),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'not-lying' }),
    );
  });

  it('⚠ a required-anaesthesia op refuses a CONSCIOUS patient', async () => {
    warmCatalogue();
    const surgeon = makeStuff(() => new Medic());
    const patient = makeStuff(() => new Creature());
    patient.setPosture(Postures.Lie);
    ruptureOn(patient);
    await makeStuff(() => new OperateController()).execute(
      { patient: { stuff: patient, raw: 'them' } as unknown as MqlOneResult, kit: kit() },
      ctxFor(surgeon),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'needs-anaesthesia' }),
    );
  });
});
