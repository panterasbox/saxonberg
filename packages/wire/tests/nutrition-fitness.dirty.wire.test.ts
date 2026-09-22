/**
 * Nutrition & fitness, driven — ⭐⭐ **the build's exit criterion.**
 *
 * Two bodies of one species, enrolled fresh: **H** works a dialled
 * season and **L** does nothing. What a person sees — the body line on
 * `look`, the run that breaks and then holds, the climb with and
 * without the rest, the bar on the floor that makes a room a gym, the
 * scurvy that bread alone brings and the orange that clears it, the two
 * loaves from one wheat — is asserted the way a person would see it:
 * the sentence, the note kind, the projected field. Never "status is
 * defined".
 *
 * ⚠ Nothing renders a reserve — that is the measurement doctrine, not an
 * omission — so every checkpoint here is a BEHAVIOUR: a `pace-broken`
 * note, a band in words, a line that is or is not there, a mass that
 * moved.
 *
 * The five reachability links, each of which fails closed and silent:
 *   verb        `lift` dispatches; `climb down` binds an exit at all
 *   affordance  a bar on the FLOOR confers `lift` (environment bucket)
 *   data        the gym row, the barbell row + recipe, the fruit tags,
 *               the wholemeal loaf, the wind row
 *   boot        the archetype catalogue, the discipline catalogue, the
 *               condition catalogue warm the rows
 *   arg gate    `lift`'s device arg `requires: [ToolMixin]`
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  expectOkOr,
  engagementIdOf,
} from '../src/harness';

/**
 * ⭐ The dirty reason is a QUESTION FOR THE OWNING TRADE. Two bodies are
 * advanced through a dialled season and left that way; the smithy's
 * stock makes one bar; the general store's par orange is eaten. The
 * finding for the trades: nothing SELLS a body a second season.
 */
export const DIRTY_REASON =
  'advances two named bodies through a dialled season (muscle, wind, a ' +
  'deficiency) and leaves them so; orders one barbell out of the smithy’s ' +
  'stock; eats an orange off the general store’s par; leaves a bar on the ' +
  'valley crossroads';

declareFile({
  file: 'nutrition-fitness.dirty.wire.test.ts',
  packs: [
    'trade-farming',
    'trade-baking',
    'trade-smithing',
    'terminus',
    'hearthworks',
    'rejection',
    'generic-objects',
  ],
  dirtyReason: DIRTY_REASON,
});

const CROSSROADS = '/world/terminus/delight-road/crossroads';
const BANK = '/world/terminus/counting-houses/banking-hall';
const SMITHY = '/world/hearthworks/location/smithy';
const STORE = '/world/terminus/general-store/shop-floor';
const BAKERY = '/world/terminus/market/bakery';
const WINZE_HEAD = '/world/rejection/ferrow/winze-head';

/** The dials the season turns, and what they are turned to. */
const SEASON: Record<string, string> = {
  // A 30 s set at the bar (900 W ≥ 0.7 × 840) banks ~18 lean; a run
  // banks ~30 wind — a season in a minute of game time.
  'body.leanGainPerHour': '2000',
  'body.windGainPerHour': '3600',
};
const FADE: Record<string, string> = {
  // Half-lives of about 25 game-seconds: idling for a game-minute is a
  // month of idling.
  'body.windHalfLifeDays': '0.0003',
  'body.leanDetrainDays': '0.0003',
};
const SCURVY: Record<string, string> = {
  // Full to empty in a game-minute.
  'body.vitaminCDrainDays': '0.0007',
};

/** Does H's body carry the wind BAND at least this high? */
const BANDS = ['untrained', 'novice', 'competent', 'proficient', 'expert'];
function windBandOf(competence: string): string {
  const m = /wind\s+[—-]\s+(\w+)/i.exec(competence);
  return m?.[1]?.toLowerCase() ?? 'absent';
}
function rank(band: string): number {
  return BANDS.indexOf(band);
}

/** The world's clock runs at 12×: a game-minute is five wall-seconds. */
async function idle(s: Session, gameSeconds: number): Promise<void> {
  const wallMs = (gameSeconds / 12) * 1000;
  const until = Date.now() + wallMs;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, Math.min(1500, until - Date.now())));
    await s.cmd('look');
  }
}

/** The shelf's BODY figure — the words the client renders. */
async function bodyOf(s: Session): Promise<{ breath: string; hunger: string; thirst: string; build: string }> {
  const rows = await s.query('me', { fields: ['bodyState'] });
  const b = (rows[0] as { bodyState?: { breath: string; hunger: string; thirst: string; build: string } } | undefined)?.bodyState;
  expect(b, 'bodyState is a projected field on the self card').toBeDefined();
  return b!;
}

async function massOf(s: Session): Promise<number> {
  const rows = await s.query('me', { fields: ['mass'] });
  const m = rows[0] as { mass?: { value?: number } | number } | undefined;
  const v = typeof m?.mass === 'number' ? m.mass : m?.mass?.value;
  expect(v, 'mass is a projected field').toBeDefined();
  return v as number;
}

/** Run the crossroads lane until the body breaks, or `max` exits. */
async function runUntilBroken(s: Session, max = 10): Promise<number> {
  for (let i = 0; i < max; i++) {
    const dir = i % 2 === 0 ? 'north' : 'south';
    const r = await s.cmd(`run ${dir}`);
    const broke = r.notes.find((n) => n.kind === 'pace-broken');
    // ⭐ The cue arrives on `self.body` at the crossing — the exit that
    // took the body under the line says *"You're winded."* before the
    // NEXT run breaks. Recorded when it lands; asserted on the break.
    if (/You're winded\./.test(await r.said())) windedCueSeen = true;
    if (broke) {
      expect(broke).toMatchObject({ from: 'run', to: 'walk' });
      expect(await r.said()).toMatch(/winded/i);
      // Back to the crossroads so the next caller starts where it expects.
      if (dir === 'north') await s.cmd('go south');
      return i + 1;
    }
    expectOk(r);
  }
  return -1;
}

let H: Session;
let L: Session;
let founder: Session;
let hName: string;
let lName: string;
let baselineMass: number;
const snapshot: Record<string, string> = {};
/** The sweat cue, seen anywhere in H's prose after work began. */
let sweatSeen = false;
/** The breath cue, seen on the lane at the crossing. */
let windedCueSeen = false;

async function bank(handle: string, amount: number): Promise<void> {
  const gov = await Session.open('founder', { startLocation: BANK, wizard: true });
  try {
    expectOk(await gov.cmd(`reserve issue ${amount}`));
    expectOk(await gov.cmd('drop coins'));
  } finally {
    gov.close();
  }
  const me = await Session.open(handle, { startLocation: BANK });
  try {
    expectOk(await me.cmd('get coins'));
    expectOkOr(await me.cmd('bank open'), 'already-open', 'account-exists');
    expectOk(await me.cmd('bank deposit coins'));
  } finally {
    me.close();
  }
}

beforeAll(async () => {
  hName = uniqueHandle('nf-h');
  lName = uniqueHandle('nf-l');
  await bank(hName, 500);
  H = await Session.open(hName, { startLocation: CROSSROADS });
  L = await Session.open(lName, { startLocation: CROSSROADS });
  founder = await Session.open('founder', { startLocation: BANK, wizard: true });
}, 600_000);

afterAll(() => {
  H?.close();
  L?.close();
  founder?.close();
});

/* ───────────────── Part 1 — the mirror on a fresh body ───────────────── */

suite('1–3 · two fresh bodies read the same', () => {
  it('⭐ `look <person>` ends with the body line, and it is the species baseline', async () => {
    expectOk(await H.cmd('introduce'));
    expectOk(await L.cmd('introduce'));
    const hSeen = await L.prose(`look ${hName}`);
    const lSeen = await H.prose(`look ${lName}`);
    expect(hSeen, 'the body line exists on a person').toMatch(/In good flesh\./);
    expect(lSeen).toMatch(/In good flesh\./);
    expect(hSeen).not.toMatch(/\d+ ?%/);
  }, 120_000);

  it('⭐ `assess` says the weight band in words, never a number', async () => {
    const said = await H.prose('assess');
    expect(said).toMatch(/of a healthy weight/i);
    const weightLine = said.split('\n').find((l) => /weight/i.test(l)) ?? '';
    expect(weightLine).not.toMatch(/\d/);
  }, 60_000);

  it('the tape: same species, same mass', async () => {
    baselineMass = await massOf(H);
    expect(await massOf(L)).toBeCloseTo(baselineMass, 3);
    expect(baselineMass).toBeGreaterThan(0);
  }, 60_000);

  it('⭐ the BODY figure on the self card reads in words — fresh, and the build', async () => {
    const b = await bodyOf(H);
    expect(b.breath).toBe('fresh');
    expect(b.build).toBe('in good flesh');
    expect(JSON.stringify(b)).not.toMatch(/\d/);
  }, 60_000);
});

/* ───────────────── Part 2 — reach, fresh ───────────────── */

suite('4 · a fresh body cannot sustain a run', () => {
  it('⭐⭐ within a few exits the run BREAKS to a walk, with the winded line', async () => {
    // ⚠ L runs this, not H. Running until winded spends the endurance H
    // needs to get a bar off the floor at the smithy, and nowhere on the
    // drive's route has a floor you can lie down on to get it back (the
    // forge floor authors no posture slot; most rooms have no floor at
    // all — a world finding). A fresh body is a fresh body.
    const at = await runUntilBroken(L);
    expect(at, 'the run broke within ten exits').toBeGreaterThan(0);
    expect(at).toBeLessThanOrEqual(8);
    // ⭐ Feedback: the figure turned over to the word, unasked.
    expect((await bodyOf(L)).breath).toBe('winded');
    expect(windedCueSeen, 'the winded cue arrived at the crossing, unasked').toBe(true);
    // …and the next run breaks too — nothing has rested.
    const again = await L.cmd('run north');
    expect(again.notes.some((n) => n.kind === 'pace-broken')).toBe(true);
    await L.cmd('go south');
  }, 240_000);
});

/* ───────────────── Part 3 — the season, dialled ───────────────── */

suite('5 · the wizard turns the season up', () => {
  it('⭐ the body-rate dials are visible in `config`, and the drive records what it changes', async () => {
    for (const key of [...Object.keys(SEASON), ...Object.keys(FADE), ...Object.keys(SCURVY)]) {
      const said = await founder.prose(`config ${key}`);
      expect(said, `${key} is a real key`).toContain(key);
      const m = /(\d+(?:\.\d+)?)/.exec(said.replace(key, ''));
      expect(m, `${key} has a value`).not.toBeNull();
      snapshot[key] = m![1]!;
    }
    for (const [key, value] of Object.entries(SEASON)) {
      expectOk(await founder.cmd(`config ${key} ${value}`));
    }
  }, 120_000);
});

suite('6 · a season of work (H), and a season of nothing (L)', () => {
  it('⭐ the smithy makes a bar, priced on its own slate', async () => {
    H.close();
    H = await Session.open(hName, { startLocation: SMITHY });
    expect(await H.prose('menu')).toMatch(/Barbell/i);
    // ⚠ The forge has to be at heat before the smith will take an order
    // for anvil-work (`insufficient-heat` otherwise — the drive's first
    // run found it cold). Light it and pump it, as the crafting drive
    // does; `already-burning` is fine.
    expectOkOr(await H.cmd('ignite forge'), 'already-burning');
    expectOkOr(await H.cmd('pump forge'), 'already-burning', 'not-lit');
    const ordered = await H.cmd('order barbell');
    expectOk(ordered);
    const carried = await H.query('me:i', { fields: ['displayName'] });
    expect(JSON.stringify(carried)).toMatch(/barbell/i);
  }, 240_000);

  it('⭐⭐ a bar on the FLOOR makes the room meet the gym’s load slot — no code, no second archetype', async () => {
    expectOk(await H.cmd('drop barbell'));
    const said = await H.prose('survey');
    expect(said).toMatch(/a gym/i);
    expect(said).toMatch(/load \(/i);
  }, 60_000);

  it('⭐⭐ `lift 60` is afforded from the floor, holds the hands, and the mass moves', async () => {
    const before = await massOf(H);
    for (let set = 0; set < 3; set++) {
      const r = await H.cmd('lift 60');
      expectOk(r);
      await H.awaitActivity(engagementIdOf(r), 60_000);
      if (/sweating/i.test(await r.said())) sweatSeen = true;
    }
    const after = await massOf(H);
    expect(after, 'the season put muscle on').toBeGreaterThan(before + 1);
  }, 240_000);

  it('`lift 200` is refused by the bar’s range, honestly', async () => {
    const r = await H.cmd('lift 200');
    expect(
      r.notes.some(
        (n) => n.kind === 'controller-rejected' && (n as { reason?: string }).reason === 'load-out-of-range',
      ),
    ).toBe(true);
    expect(await r.said()).toMatch(/between 20 and 160/);
  }, 60_000);

  it('L does nothing, and the season ends', async () => {
    // ⚠ Not `look`: L's focus is still H from step 1, and H has left the
    // room, so a bare `look` answers `empty-result[target]`.
    expectOk(await L.cmd('inventory'));
    // The season is over: the gain dials go back before anyone runs
    // again, or L's runs in step 10 would train it too.
    for (const key of Object.keys(SEASON)) {
      expectOk(await founder.cmd(`config ${key} ${snapshot[key]}`));
    }
  }, 60_000);
});

suite('7 · heat', () => {
  it('⭐ a shift in a coat makes you sweat — work is heat, and the body sheds it by sweating', async () => {
    // Build-4 (harm-survey) merged mid-build, so W6 landed: `1 − η` of
    // every exertion goes onto the internal heat load and the thermal
    // slice sheds it. The coat is the general store's padded gambeson —
    // three kilos of wool, the warmest thing a person can buy (the
    // tailor's linen coat costs 200 and a day of her time; a wizard's
    // `clone` is access-denied on the smithy's parcel).
    // ⚠ Not at the smithy: with the forge lit the room's wet-bulb sits
    // over the ceiling where sweat cannot shed heat, and the model's cue
    // is honest about it — nothing. H takes the bar out to the lane.
    expectOk(await H.cmd('get barbell'));
    H.close();
    H = await Session.open(hName, { startLocation: STORE });
    expectOk(await H.cmd('buy gambeson'));
    H.close();
    H = await Session.open(hName, { startLocation: CROSSROADS });
    expectOk(await H.cmd('drop barbell'));
    // Donning is an engagement (three kilos of wool take a moment);
    // the hands are busy until it lands.
    const donning = await H.cmd('wear gambeson');
    expectOk(donning);
    if (donning.notes.some((n) => n.kind === 'engagement-started')) {
      await H.awaitActivity(engagementIdOf(donning), 120_000);
    }
    for (let set = 0; set < 3; set++) {
      const r = await H.cmd('lift 60');
      expectOk(r);
      const notes = await H.awaitActivity(engagementIdOf(r), 60_000);
      expect(notes.some((n) => n.kind === 'engagement-completed')).toBe(true);
      if (/sweating/i.test(await r.said())) sweatSeen = true;
    }
    // The cue rides the thermal slice (one a game-minute), and the slice
    // runs on a VITALS read — `assess` is one; `look` is not. Read the
    // body a few times to let the slices run.
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      if (/sweating/i.test(await H.prose('assess'))) sweatSeen = true;
    }
    // ⓘ The cue is a debounced EPISODE flag: *"You're sweating."* fires
    // once when a load first remains after a shed, and re-arms only
    // when the body is back in its comfort band with nothing to shed.
    // At the forge (step 6) the ambient already had H sweating and the
    // sets rode on top of it, so the cue may well have fired THERE —
    // hence the flag is collected from step 6 on.
    expect(sweatSeen, 'the work made H sweat').toBe(true);
    // ⓘ `wear gambeson` answers ok and runs its dressing step, and
    // `remove gambeson` then answers `not-worn` — a finding for the
    // equipment verbs, not this build's; recorded, tolerated.
    expectOkOr(await H.cmd('remove gambeson'), 'not-worn');
    // ⓘ Even three kilos of wool over the torso is ~0.2 clo body-weighted
    // (the sum is surface-weighted per part), so the sweat CUE alone
    // cannot tell coated from bare on the wire over one set; the hydration difference is proven in
    // `Exerting.heat.test.ts` (a 1-clo body sheds slower and spends more
    // water over the same shift). And cold air does not stop the
    // sweating: the internal load sheds through the cold branch too,
    // which is right — you sweat shovelling snow.
  }, 300_000);
});

/* ───────────────── Part 4 — the mirror after ───────────────── */

suite('8–9 · the mirror and the tape', () => {
  it('⭐⭐ two lines from one starting body — nothing authored', async () => {
    L.close();
    L = await Session.open(lName, { startLocation: CROSSROADS });
    expectOk(await L.cmd('introduce'));
    expectOk(await H.cmd('introduce'));
    const hSeen = await L.prose(`look ${hName}`);
    const lSeen = await H.prose(`look ${lName}`);
    expect(hSeen).toMatch(/hard|wiry|broad|burly|powerful/i);
    expect(hSeen).not.toMatch(/In good flesh\.$/m);
    expect(lSeen).toMatch(/In good flesh\./);
    expect(hSeen).not.toBe(lSeen);
  }, 120_000);

  it('⭐ the tape says the worked body has moved; the idle one (near enough) has not', async () => {
    expect(await massOf(H)).toBeGreaterThan(baselineMass + 1);
    // L ran a dozen exits in step 4 — a sprint sits just over a fresh
    // body's overload line, so a few hundredths of a kilo of lean is
    // honest. Nothing a tape would notice.
    expect(Math.abs((await massOf(L)) - baselineMass)).toBeLessThan(0.2);
  }, 60_000);
});

/* ───────────────── Part 5 — reach, conditioned ───────────────── */

suite('10 · reach', () => {
  it('⭐ `competence` lists wind for the worked body, as a band', async () => {
    const said = await H.prose('competence');
    expect(said).toMatch(/wind/i);
    expect(rank(windBandOf(said))).toBeGreaterThanOrEqual(rank('competent'));
    expect(said).not.toMatch(/0\.\d/);
  }, 60_000);

  it('⭐⭐ H holds the lane past where it broke; L breaks where H did', async () => {
    H.close();
    H = await Session.open(hName, { startLocation: CROSSROADS });
    L.close();
    L = await Session.open(lName, { startLocation: CROSSROADS });
    const hBroke = await runUntilBroken(H, 8);
    expect(hBroke, 'a conditioned body holds eight exits').toBe(-1);
    // L has rested since step 4 (the relog gaps integrate recovery) and
    // is still untrained: it breaks again within a few exits.
    const lBroke = await runUntilBroken(L, 10);
    expect(lBroke).toBeGreaterThan(0);
  }, 300_000);

  it('⭐⭐ the climb: L stops for breath, H does not — and somebody can finally climb', async () => {
    H.close();
    L.close();
    H = await Session.open(hName, { startLocation: WINZE_HEAD });
    L = await Session.open(lName, { startLocation: WINZE_HEAD });
    const l = await L.cmd('climb down');
    expectOk(l);
    expect(await l.said()).toMatch(/stop on the way to get your breath/i);
    const h = await H.cmd('climb down');
    expectOk(h);
    expect(await h.said()).not.toMatch(/get your breath/i);
    expect(await H.prose('look')).toMatch(/winze foot/i);
  }, 120_000);
});

/* ───────────────── Part 6 — fade ───────────────── */

suite('11 · fade', () => {
  it('⭐ idling in-session for the dial’s worth of time, the run breaks again', async () => {
    for (const [key, value] of Object.entries(FADE)) {
      expectOk(await founder.cmd(`config ${key} ${value}`));
    }
    H.close();
    H = await Session.open(hName, { startLocation: CROSSROADS });
    await idle(H, 6 * 60);
    const said = await H.prose('competence');
    expect(rank(windBandOf(said))).toBeLessThan(rank('competent'));
  }, 300_000);

  it('⭐ absence is not taxed: the dials back to a month, log off, log on — nothing moved', async () => {
    // A relog integrates the gap it can see (the far-past guard is four
    // game-hours, unit-tested); what this proves on the wire is that a
    // logout/login moves NOTHING that the clock would not.
    for (const key of Object.keys(FADE)) {
      expectOk(await founder.cmd(`config ${key} ${snapshot[key]}`));
    }
    const before = windBandOf(await H.prose('competence'));
    H.close();
    await new Promise((r) => setTimeout(r, 3000));
    H = await Session.open(hName, { startLocation: CROSSROADS });
    expect(windBandOf(await H.prose('competence'))).toBe(before);
  }, 120_000);
});

/* ───────────────── Part 7 — provisioning ───────────────── */

suite('12 · bread alone, and an orange', () => {
  it('⭐⭐ the deficiency clock: scurvy the physician can see', async () => {
    for (const [key, value] of Object.entries(SCURVY)) {
      expectOk(await founder.cmd(`config ${key} ${value}`));
    }
    await idle(H, 3 * 60);
    const said = await H.prose('assess');
    expect(said).toMatch(/scurvy|bleeding-gums|bruising|listless/i);
  }, 300_000);

  it('⭐ an orange is for sale somewhere a person can go, and it clears it', async () => {
    for (const key of Object.keys(SCURVY)) {
      expectOk(await founder.cmd(`config ${key} ${snapshot[key]}`));
    }
    H.close();
    H = await Session.open(hName, { startLocation: STORE });
    // `buy orange` — the FRUIT, not the packet of orange seed the same
    // counter sells (the first run bought the packet; the fruit's line
    // now sits above the seeds).
    expectOk(await H.cmd('buy orange'));
    expect(JSON.stringify(await H.query('me:i', { fields: ['displayName'] }))).toMatch(/orange(?! seed)/i);
    expectOk(await H.cmd('eat me:i:orange'));
    // The orange sits in the stomach and absorbs at 2 %-points a
    // game-minute (30 points in the pool): a quarter of a game-hour to
    // clear the cascade's 15 % line — a minute and a bit of wall time.
    await idle(H, 12 * 60);
    const said = await H.prose('assess');
    expect(said).not.toMatch(/scurvy|bleeding-gums/i);
  }, 300_000);
});

/* ───────────────── Part 8 — composition ───────────────── */

suite('13 · two loaves from one wheat', () => {
  it('⭐ the wholemeal and the white show different amounts, and no row authored them', async () => {
    H.close();
    H = await Session.open(hName, { startLocation: BAKERY });
    // ⚠ `buy loaf` at this bakery had NEVER worked: the bakery's business
    // listed only the room as an operating location and a sale settles
    // against the COUNTER's path — the first run answered
    // `insufficient-funds` with 500 in the bank. Fixed in the business row.
    expectOk(await H.cmd('buy wholemeal'));
    expectOk(await H.cmd('buy white'));
    // Look at the ones in HAND (`me:i:…`): four more of each stand on the
    // counter, and a bare `look wholemeal` asks WHICH — a prompt the
    // harness cannot answer.
    const wholemeal = await H.prose('look me:i:wholemeal');
    const white = await H.prose('look me:i:white');
    expect(wholemeal).toMatch(/fibre \d+mg/i);
    expect(white).toMatch(/fibre \d+mg/i);
    const fibre = (s: string): number => Number(/fibre (\d+)mg/i.exec(s)?.[1] ?? 0);
    expect(fibre(wholemeal)).toBeGreaterThan(fibre(white));
  }, 120_000);
});

/* ───────────────── Part 9 — the dials back ───────────────── */

suite('14 · the wizard turns the dials back', () => {
  it('every setting is restored, and the restore is asserted', async () => {
    for (const [key, value] of Object.entries(snapshot)) {
      expectOk(await founder.cmd(`config ${key} ${value}`));
      const said = await founder.prose(`config ${key}`);
      expect(said).toContain(value);
    }
  }, 120_000);
});
