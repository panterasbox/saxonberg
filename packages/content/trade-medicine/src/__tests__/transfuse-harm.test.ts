/**
 * The harm row on `transfuse` (blood build D5, after the donor-card cut).
 * There is no consent ladder: a transfusion just works. The one thing the
 * ledger records is HARM — forcing a REACTING unit into someone else's
 * body is damage done to them, written non-consented. A compatible unit
 * records nothing, and self-use never records (you may do as you like with
 * your own body). The full live flow is W6's wire drive; this proves the
 * controller's own harm gate.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TransfuseController from '../idea/cmd/medical/TransfuseController';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import Receptacle from '@saxonberg/server/mud/platform/thing/Receptacle';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { AccountabilityApi } from '@saxonberg/server/mud/api/accountability';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BloodUnit } from '@saxonberg/server/mud/lib/vitals/Blood';

// Character is abstract; a concrete subclass is what a Cast/Avatar is.
class TestCharacter extends Character {}

let seq = 0;
let note: ReturnType<typeof vi.fn>;
let selfLines: string[];

function silence(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: unknown) => {
      selfLines.push(String(m));
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

const ctxFor = (actor: unknown): CommandContext =>
  ({ commandGiver: actor, location: null, note } as unknown as CommandContext);

function npc(): Character {
  const c = makeStuff(() => new TestCharacter());
  stampTemplatePathForTest(c, `/platform/agent/Avatar/tx-${seq++}`);
  return c;
}
/** A giver that is NOT Engaged (a Creature, not an Actor), so `transfuse`'s
 * effect runs synchronously in-test rather than deferring to the scheduler
 * (the durative `hands` step the live flow uses — W6 drives that). Every
 * bare body (no species) rolls type O, system '', with the universe-default
 * bloodVolume band. */
function giverBody(): Creature {
  const c = makeStuff(() => new Creature());
  stampTemplatePathForTest(c, `/platform/agent/Avatar/tx-${seq++}`);
  return c;
}

const BLOOD_MATERIAL = '/stuff/idea/material/tissue/blood';
/** Seed the blood Material singleton (a slot reads empty with no material,
 * and Freshness reads the material's tags). */
function seedBloodMaterial(): Material {
  const existing = StuffApi.findByTemplatePath<Material>(BLOOD_MATERIAL);
  if (existing) return existing;
  const m = makeStuff(() => new Material());
  m.setTags(['tissue', 'blood', 'liquid', 'organic']);
  stampTemplatePathForTest(m, BLOOD_MATERIAL);
  return m;
}

/** A blood bag holding one unit of `type` (unlabelled, so the competence
 * judgement gate never fires — this isolates the harm gate). A bare body is
 * O/system-''; a 'B' unit mismatches it (reaction 1), an 'O' unit matches
 * it (reaction 0). */
function bloodBag(donor: Stuff, type: BloodUnit['type']): Stuff {
  const bag = makeStuff(() => new Receptacle());
  // Authored on the blood-bag row; set directly here (the slot is gated on
  // this interior-bulk flag — a bare Receptacle holds no slot).
  (bag as unknown as { interiorBulk: boolean }).interiorBulk = true;
  bag.setInteriorCapacity(Quantity.of(0.5, 'L'));
  const slot = BulkableApi.slotFor(bag, undefined)!;
  slot.setMaterial(seedBloodMaterial());
  slot.setAmount(Quantity.of(0.45, 'L'));
  const unit: BloodUnit = {
    speciesPath: '',
    system: '',
    type,
    labelled: false,
    donorIdentityPath: donor.getIdentityPath() ?? '',
  };
  slot.setPayload({ blood: unit });
  return bag as unknown as Stuff;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  seq = 0;
  note = vi.fn();
  selfLines = [];
  silence();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('transfuse — the harm row', () => {
  it('a REACTING unit forced into another body records a non-consented harm', async () => {
    const giver = giverBody();
    const patient = npc(); // O; a 'B' unit mismatches → reaction 1
    const record = vi.spyOn(AccountabilityApi, 'record').mockImplementation(() => {});
    const bag = bloodBag(giver, 'B');

    await makeStuff(() => new TransfuseController()).execute(
      {
        patient: { stuff: patient } as unknown as MqlOneResult,
        vessel: { stuff: bag } as unknown as MqlOneResult,
        syringe: undefined,
      },
      ctxFor(giver),
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'harm', consented: false }),
    );
  });

  it('a COMPATIBLE unit into another body records nothing', async () => {
    const giver = giverBody();
    const patient = npc(); // O; an 'O' unit matches → reaction 0
    const record = vi.spyOn(AccountabilityApi, 'record').mockImplementation(() => {});
    const bag = bloodBag(giver, 'O');

    await makeStuff(() => new TransfuseController()).execute(
      {
        patient: { stuff: patient } as unknown as MqlOneResult,
        vessel: { stuff: bag } as unknown as MqlOneResult,
        syringe: undefined,
      },
      ctxFor(giver),
    );
    expect(record).not.toHaveBeenCalled();
  });

  it('self-use records nothing even when the unit reacts', async () => {
    const giver = giverBody(); // the patient too (no `patient` arg → self)
    const record = vi.spyOn(AccountabilityApi, 'record').mockImplementation(() => {});
    const bag = bloodBag(giver, 'B'); // would react, but self → no row

    await makeStuff(() => new TransfuseController()).execute(
      {
        patient: undefined,
        vessel: { stuff: bag } as unknown as MqlOneResult,
        syringe: undefined,
      },
      ctxFor(giver),
    );
    expect(record).not.toHaveBeenCalled();
  });
});
