/**
 * The consent ladder on `transfuse` (blood build D5). A conscious
 * card-less player is ASKED and the act is refused `consent-pending`; a
 * `wont` directive does NOT block — the act proceeds and a `harm` row with
 * `consented: false` is recorded (a consequence, never a veto). The full
 * live flow is W6's wire drive; this proves the controller's own gate +
 * the harm append.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TransfuseController from '../idea/cmd/medical/TransfuseController';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { HasInteractiveMixin } from '@saxonberg/server/mud/lib/connection/HasInteractive';
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

class Player extends HasInteractiveMixin(Character) {
  static override _mixinName: string = 'Player';
}

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
  const c = makeStuff(() => new Character());
  stampTemplatePathForTest(c, `/platform/agent/Avatar/tx-${seq++}`);
  return c;
}
/** A giver that is NOT Engaged (a Creature, not an Actor), so `transfuse`'s
 * effect runs synchronously in-test rather than deferring to the scheduler
 * (the durative `hands` step the live flow uses — W6 drives that). */
function giverBody(): Creature {
  const c = makeStuff(() => new Creature());
  stampTemplatePathForTest(c, `/platform/agent/Avatar/tx-${seq++}`);
  return c;
}
function player(): Player {
  const c = makeStuff(() => new Player());
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

/** A blood bag holding one compatible unit. */
function bloodBag(donor: Stuff): Stuff {
  const bag = makeStuff(() => new Receptacle());
  // Authored on the blood-bag row; set directly here (the slot is gated on
  // this interior-bulk flag — a bare Receptacle holds no slot).
  (bag as unknown as { interiorBulk: boolean }).interiorBulk = true;
  bag.setInteriorCapacity(Quantity.of(0.5, 'L'));
  const slot = BulkableApi.slotFor(bag, undefined)!;
  slot.setMaterial(seedBloodMaterial());
  slot.setAmount(Quantity.of(0.45, 'L'));
  // The patients here are bare Characters with no species, so their blood
  // system reads '' and their type rolls to O; a unit that matches (same
  // empty system, O) is compatible → no reaction, isolating the consent
  // rule from the compatibility rule.
  const unit: BloodUnit = {
    speciesPath: '',
    system: '',
    type: 'O',
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

describe('transfuse — the consent ladder', () => {
  it('a conscious card-less PLAYER is asked → `consent-pending`, act refused', async () => {
    const giver = npc();
    const patient = player(); // conscious, no card → `asked`
    await makeStuff(() => new TransfuseController()).execute(
      {
        patient: { stuff: patient } as unknown as MqlOneResult,
        vessel: undefined,
      },
      ctxFor(giver),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'consent-pending' }),
    );
    // The patient was prompted to decide.
    expect(selfLines.some((l) => /donor accept/.test(l))).toBe(true);
  });

  it('a `wont` directive does NOT block — the act proceeds and records harm', async () => {
    const giver = giverBody();
    const patient = npc();
    patient.setDonorCard({ receive: 'wont', donor: false });
    // Sanity: the ladder sees the directive (isolates a card-read bug from
    // an effect-not-running bug).
    expect(patient.getDonorCard().receive).toBe('wont');
    expect(patient.transfusionConsent(giver as unknown as Stuff).consented).toBe(false);
    const record = vi.spyOn(AccountabilityApi, 'record').mockImplementation(() => {});
    const bag = bloodBag(giver);

    await makeStuff(() => new TransfuseController()).execute(
      {
        patient: { stuff: patient } as unknown as MqlOneResult,
        vessel: { stuff: bag } as unknown as MqlOneResult,
      },
      ctxFor(giver),
    );

    // It was NOT stopped at the consent gate.
    expect(note).not.toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'consent-pending' }),
    );
    // A harm row was appended, non-consented.
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'harm', consented: false }),
    );
  });

  it('a willing NPC patient (`consented`) records no harm on a compatible unit', async () => {
    const giver = giverBody();
    const patient = npc(); // no card, conscious, NPC → `consented`
    const record = vi.spyOn(AccountabilityApi, 'record').mockImplementation(() => {});
    const bag = bloodBag(giver);

    await makeStuff(() => new TransfuseController()).execute(
      {
        patient: { stuff: patient } as unknown as MqlOneResult,
        vessel: { stuff: bag } as unknown as MqlOneResult,
      },
      ctxFor(giver),
    );
    expect(record).not.toHaveBeenCalled();
  });
});
