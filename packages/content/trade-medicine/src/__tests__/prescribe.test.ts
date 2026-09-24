/**
 * `prescribe` (clinical-medicine D9) — a doctor writes a slip for a
 * controlled active, and the ⭐ REPLACEMENT flow: a prescription is a
 * physical Thing, so if you lose it, the doctor simply writes another. A
 * re-prescribe is not blocked and produces a fresh, valid slip (the honest
 * answer to "what if you lose the paper" until pharma-slate adds a record).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PrescribeController from '../idea/cmd/medical/PrescribeController';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import Condition from '@saxonberg/server/mud/platform/idea/Condition';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Prescription } from '@saxonberg/server/mud/lib/vitals/Prescription';
import PrescriptionThing from '@saxonberg/server/mud/platform/thing/Prescription';

class Doc extends AdvancementMixin(Creature) {
  static override _mixinName: string = 'Doc';
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

const ANAESTHESIA = '/platform/idea/Condition/metabolism/anaesthesia';
function seedAnaesthesia(): void {
  if (StuffApi.findByTemplatePath(ANAESTHESIA)) return;
  const c = makeStuff(() => new Condition());
  c.setPrescriptionOnly(true);
  c.setToxinBehavior({
    toxinType: 'anaesthesia',
    absorptionRate: 20,
    clearanceRate: 3,
    potency: 1,
    bands: [{ threshold: 1, severity: 1 }],
  } as never);
  stampTemplatePathForTest(c, ANAESTHESIA);
}

/** The prescription slips the doctor is now carrying, newest last. */
function slipsHeldBy(doc: Stuff): (Stuff & Prescription)[] {
  if (!MixinApi.isContainer(doc)) return [];
  return [...doc.getContents()].filter((i) =>
    MixinApi.isPrescription(i),
  ) as (Stuff & Prescription)[];
}

beforeEach(() => {
  installV1QuantityMarshallers();
  note = vi.fn();
  silence();
  seedAnaesthesia();
  // ⚠ StuffApi.clone hits the template DB; a pure unit test has none, so
  // mock it to construct a fresh Prescription — the controller's own
  // stamping/gating logic is what we are exercising, not the clone pipe.
  vi.spyOn(StuffApi, 'clone').mockImplementation(
    async () => makeStuff(() => new PrescriptionThing()) as never,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('prescribe', () => {
  function scene(): { doc: Doc; patient: Creature } {
    const doc = makeStuff(() => new Doc());
    stampTemplatePathForTest(doc, '/platform/agent/Avatar/rx-doc');
    const patient = makeStuff(() => new Creature());
    stampTemplatePathForTest(patient, '/platform/agent/Avatar/rx-pt');
    return { doc, patient };
  }

  it('a competent doctor writes a slip stamped for the patient + active', async () => {
    const { doc, patient } = scene();
    await makeStuff(() => new PrescribeController()).execute(
      { patient: { stuff: patient } as unknown as MqlOneResult, active: 'anaesthesia', pad: undefined },
      ctxFor(doc),
    );
    const slips = slipsHeldBy(doc);
    expect(slips).toHaveLength(1);
    expect(slips[0]!.isFor(patient.getIdentityPath()!, 'anaesthesia')).toBe(true);
  });

  it('⭐ the REPLACEMENT flow — lose the slip, re-prescribe, the new one works', async () => {
    const { doc, patient } = scene();
    const ctrl = () => makeStuff(() => new PrescribeController());
    await ctrl().execute(
      { patient: { stuff: patient } as unknown as MqlOneResult, active: 'anaesthesia', pad: undefined },
      ctxFor(doc),
    );
    const first = slipsHeldBy(doc)[0]!;
    // Lose it — the physical Thing is destroyed (dropped, taken, torn up).
    await StuffApi.destruct(first);
    expect(slipsHeldBy(doc)).toHaveLength(0);

    // Re-prescribe: NOT blocked, and the fresh slip is valid for the patient.
    await ctrl().execute(
      { patient: { stuff: patient } as unknown as MqlOneResult, active: 'anaesthesia', pad: undefined },
      ctxFor(doc),
    );
    const replacement = slipsHeldBy(doc);
    expect(replacement).toHaveLength(1);
    expect(replacement[0]!.isFor(patient.getIdentityPath()!, 'anaesthesia')).toBe(true);
    expect(replacement[0]!.getDosesLeft()).toBeGreaterThan(0);
  });

  it('⚠ an unlicensed giver is refused', async () => {
    const { doc, patient } = scene();
    doc.band = 'novice';
    await makeStuff(() => new PrescribeController()).execute(
      { patient: { stuff: patient } as unknown as MqlOneResult, active: 'anaesthesia', pad: undefined },
      ctxFor(doc),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'unlicensed' }),
    );
    expect(slipsHeldBy(doc)).toHaveLength(0);
  });
});
