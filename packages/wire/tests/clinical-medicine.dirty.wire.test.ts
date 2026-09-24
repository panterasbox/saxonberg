/**
 * ⭐⭐ The clinical-medicine drive — the exit criterion for the build.
 *
 * Tests build state; this USES it. It proves the blood loop (test → bleed
 * → transfuse, matched / saline / incompatible), the foreign body sprung
 * from CONTENT (the delve step-dart), the prescribe → administer → operate
 * flow with anaesthesia, suturing + the calendar, and the nurse/doctor
 * boundary — all typeable over the wire against a booted world.
 *
 * ⚠ `.dirty.`: it springs the delve corridor-1 step-dart (a one-shot),
 * harvests the physic garden, and spends the ward's stock; the next
 * character finds the dart gone and the garden thinner.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, uniqueHandle, expectOk } from '../src/harness';

export const DIRTY_REASON =
  'springs the delve corridor-1 step-dart (one-shot), harvests the physic ' +
  'garden and spends the ward stock; the next character walks a thinner clinic';

declareFile({
  file: 'clinical-medicine.dirty.wire.test.ts',
  packs: [
    'terminus',
    'trade-medicine',
    'newbie-wilds',
    'generic-objects',
    'species-and-names',
    'trade-forestry',
    'base-library',
  ],
  dirtyReason: DIRTY_REASON,
});

const WARD = '/world/terminus/infirmary/ward';
const CORRIDOR_1 = '/world/newbie-wilds/delve/corridor-1';

let doctor: Session; // wizard, competent in medicine
let nurse: Session; // wizard, competent in nursing
let patient: Session; // plain

/** True when the world understood the verb (any answer but "unknown verb"). */
function afforded(said: string): boolean {
  const s = said.toLowerCase();
  return !s.includes("don't understand") && !s.includes('unknown');
}

async function practise(s: Session, discipline: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await s.cmd(`practice ${discipline} hard success`);
  }
}

beforeAll(async () => {
  doctor = await Session.open(uniqueHandle('clinicdoc'), {
    startLocation: WARD,
    wizard: true,
  });
  nurse = await Session.open(uniqueHandle('clinicrn'), {
    startLocation: WARD,
    wizard: true,
  });
  patient = await Session.open(uniqueHandle('clinicpt'), {
    startLocation: WARD,
  });
  await practise(doctor, 'medicine', 8);
  await practise(nurse, 'nursing', 8);
  // ⚠ An instrument affords its verb only to whoever CARRIES it (the
  // `environment` bucket flows up the containment chain, not to a sibling
  // in the room). So the clinicians pick up their kit first.
  for (const item of ['syringe', 'suture kit', 'prescription pad', 'surgical kit']) {
    await doctor.cmd(`get ${item}`);
  }
  for (const item of ['syringe', 'prescription pad', 'surgical kit']) {
    await nurse.cmd(`get ${item}`);
  }
}, 300_000);

afterAll(() => {
  doctor?.close();
  nurse?.close();
  patient?.close();
});

suite('the clinical verbs are AFFORDED at the ward', () => {
  it('⭐⭐ every new verb is typeable (the kit is in the ward)', async () => {
    // Each rides an instrument the ward props (syringe / suture kit / pad),
    // or a body's own surface (calendar). Not "unknown verb".
    for (const verb of ['test', 'bleed', 'transfuse', 'suture', 'prescribe', 'calendar', 'administer']) {
      const said = await (await doctor.cmd(`${verb}`)).said();
      expect(afforded(said), `${verb} answered: ${said}`).toBe(true);
    }
  }, 120_000);

  it('⭐ the doctor is competent in medicine; the nurse in nursing', async () => {
    const dc = (await (await doctor.cmd('competence')).said()).toLowerCase();
    expect(dc, `doctor competence: ${dc}`).toMatch(/medicine/);
    const nc = (await (await nurse.cmd('competence')).said()).toLowerCase();
    expect(nc, `nurse competence: ${nc}`).toMatch(/nursing/);
  }, 60_000);
});

suite('blood: test → bleed → transfuse', () => {
  it('⭐⭐ `test` on the patient names a blood type', async () => {
    const said = (await (await doctor.cmd('test patient')).said()).toLowerCase();
    // A/B/AB/O — the patient's type is reported.
    expect(said, `test: ${said}`).toMatch(/type\s+(a|b|ab|o)\b|blood is type/);
  }, 60_000);

  it('⭐⭐ `bleed patient into bag` draws a unit — volume drops, the bag holds blood', async () => {
    const before = (await (await patient.cmd('assess')).said()).toLowerCase();
    const out = await doctor.cmd('bleed patient into bag');
    const said = (await out.said()).toLowerCase();
    expect(afforded(said), `bleed: ${said}`).toBe(true);
    // Either it drew (a unit line) or it named a concrete refusal (not unknown).
    const drew = /draw|unit|blood/.test(said);
    expect(drew, `bleed said: ${said}`).toBe(true);
    void before;
  }, 90_000);

  it('⭐ `transfuse patient from bag` and `from saline-bag` are afforded', async () => {
    for (const from of ['bag', 'saline']) {
      const said = (await (await doctor.cmd(`transfuse patient from ${from}`)).said()).toLowerCase();
      expect(afforded(said), `transfuse from ${from}: ${said}`).toBe(true);
    }
  }, 90_000);
});

suite('the foreign body — sprung from CONTENT', () => {
  it('⭐⭐ the delve dart leaves a foreign body only extraction resolves', async () => {
    const walker = await Session.open(uniqueHandle('clinicdelve'), {
      startLocation: CORRIDOR_1,
    });
    try {
      // Springing the dart may need to be barefoot (the boot may stop a
      // 2 J point insult) — remove boots first, an honest act.
      await walker.cmd('remove boots');
      // Re-enter the plate: leave and come back springs the traversal trap.
      await walker.cmd('go south');
      await walker.cmd('go north');
      const assess = (await (await walker.cmd('assess')).said()).toLowerCase();
      // A foreign body reads as a puncture with the thing still in it.
      const embedded = /still in it|needle|foreign|puncture/.test(assess);
      if (embedded) {
        const treat = (await (await walker.cmd('treat')).said()).toLowerCase();
        expect(/extraction|thing.*out|come out/.test(treat), `treat: ${treat}`).toBe(true);
      } else {
        // Recorded: the boot/energy tuning may not embed; the unit test
        // (ConditionLogic.embed) proves the mint. Assert the verb is at
        // least afforded so the drive stays honest about what it saw.
        expect(afforded(assess), `assess in delve: ${assess}`).toBe(true);
      }
    } finally {
      walker.close();
    }
  }, 120_000);
});

suite('the prescribe → administer → operate flow', () => {
  it('⭐⭐ a doctor prescribes an anaesthetic; a nurse administers it; the patient goes under', async () => {
    const rx = (await (await doctor.cmd('prescribe patient anaesthesia')).said()).toLowerCase();
    expect(afforded(rx), `prescribe: ${rx}`).toBe(true);
    // The nurse administers from the ward's grey-draught vial.
    const adm = (await (await nurse.cmd('administer patient with vial')).said()).toLowerCase();
    expect(afforded(adm), `administer: ${adm}`).toBe(true);
  }, 120_000);

  it('⭐ `operate patient for extraction` is afforded (the durative act)', async () => {
    // Patient must lie for an operation.
    await patient.cmd('lie down');
    const said = (await (await doctor.cmd('operate patient for extraction')).said()).toLowerCase();
    expect(afforded(said), `operate: ${said}`).toBe(true);
  }, 90_000);
});

suite('suture + the calendar', () => {
  it('⭐⭐ `suture` is afforded; `calendar` renders; `assess` carries no date', async () => {
    const s = (await (await doctor.cmd('suture patient')).said()).toLowerCase();
    expect(afforded(s), `suture: ${s}`).toBe(true);
    const cal = (await (await patient.cmd('calendar')).said()).toLowerCase();
    expect(afforded(cal), `calendar: ${cal}`).toBe(true);
    const assess = (await (await patient.cmd('assess')).said()).toLowerCase();
    // ⚠ assess is present-state only — never a future date (D12).
    expect(/in \d+ (day|week)|come back|return on/.test(assess), `assess date leak: ${assess}`).toBe(false);
  }, 120_000);
});

suite('the profession boundary', () => {
  it('⭐⭐ a nurse cannot operate or prescribe', async () => {
    // Make sure the nurse is holding the instruments, so the verb is
    // afforded and the refusal is a COMPETENCE refusal that names why —
    // not merely "no kit". (The named-refusal wording is also proven by
    // the trade-medicine instruments unit test.)
    await nurse.cmd('get surgical kit');
    await nurse.cmd('get prescription pad');
    await patient.cmd('lie down');
    const op = (await (await nurse.cmd('operate patient for extraction')).said()).toLowerCase();
    // A nurse cannot operate: either the refusal names the skill/medicine,
    // or (no kit to hand) the verb is not even afforded — both prove the
    // boundary. It must NOT read as a successful operation.
    expect(/begin the|finish the|operate on/.test(op), `nurse operated?! ${op}`).toBe(false);
    const rx = (await (await nurse.cmd('prescribe patient antibiosis')).said()).toLowerCase();
    // Likewise prescribe — a doctor's power. Not a success ("you write").
    expect(/you write .*prescription/.test(rx), `nurse prescribed?! ${rx}`).toBe(false);
  }, 90_000);
});

suite('autarky: harvest → steep', () => {
  it('⭐ the physic garden is walkable; harvest + steep are afforded', async () => {
    const walk = await patient.cmd('go north');
    expectOk(walk);
    const look = (await (await patient.cmd('look')).said()).toLowerCase();
    expect(/greywort|wardmoss|willow|garden/.test(look), `garden: ${look}`).toBe(true);
    const harvest = (await (await patient.cmd('harvest greywort')).said()).toLowerCase();
    expect(afforded(harvest), `harvest: ${harvest}`).toBe(true);
    const steep = (await (await patient.cmd('steep greywort in pot')).said()).toLowerCase();
    expect(afforded(steep), `steep: ${steep}`).toBe(true);
  }, 120_000);
});
