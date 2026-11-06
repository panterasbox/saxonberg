/**
 * Controllers are IO — the build's drive (requirements § The drive).
 *
 * ⭐⭐ **The before/after record (plan D13).** Steps 10–15 are verbs this
 * build MOVES: their logic leaves the controllers for the objects. The
 * acceptance criterion is that a person doing the same thing before and
 * after sees the same state change, the same refusal reason and the same
 * duration. So these steps do not assert outcomes they invented; they
 * RECORD what the world did — per act `{status, notes[{kind, reason}],
 * duration, state}`, no prose — into a committed baseline, and every later
 * run compares against it and fails on any difference.
 *
 *   CAIO_RECORD=1 → write `controllers-are-io.baseline.json` (the steps
 *                   this run recorded replace theirs; the rest are kept).
 *   otherwise     → compare each act to the baseline.
 *
 * `state` is the world facts the act changed, read through `eval` (a
 * staging wizard seated on the extent) — where an item landed, the crop's
 * grade, a wound's state, a wallet's delta, a scroll's charge. Only facts
 * that are the same on every run go in: kinds and booleans, never ids.
 *
 * ⚠ Step 12's venues are staffed by shift, so the step pins the hour of
 * day first (a jump under a day — lighting, not span).
 *
 * Steps 1–9 and 16–25 are later waves'; their placeholders carry the
 * step text so the wave that earns each fills it in.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  hand,
  nourish,
  advanceWorldClock,
  worldClockNow,
  isOwnedTestWorld,
  pinWeather,
  unpinWeather,
} from '../src/harness';
import type { CommandResult } from '../src/harness';

/**
 * ⭐ What the file consumes. Every act runs on fresh characters with
 * handed objects, but the objects stay: dropped crates, tables and
 * saucers and a thrown ball pile up in the market square, two corpses'
 * worth of staging and the coin issued to fund the patron (a recorded
 * mint with no sink) stay behind, and step 12 eats a venue's stock.
 */
export const DIRTY_REASON =
  'leaves handed fixtures (crate, table, pot, saucer, a thrown ball) in ' +
  'the market square, issues the patron coin with no sink, and spends ' +
  "the venues' stock and a scroll per run";

declareFile({
  file: 'controllers-are-io.dirty.wire.test.ts',
  packs: [
    'trade-farming',
    'terminus',
    'saxonberg-lounge',
    'trade-hospitality',
    'arcane-library',
    'generic-objects',
  ],
  dirtyReason: DIRTY_REASON,
});

/* ───────────────────────── the record ───────────────────────── */

/**
 * ⭐ The casting command for step 15: a scroll fires from `recite` and
 * never from `read` (W5).
 */
const CAST_COMMAND = 'recite';

const RECORD = process.env.CAIO_RECORD === '1';
const BASELINE_PATH = new URL('./controllers-are-io.baseline.json', import.meta.url);

interface ActRecord {
  status: string;
  notes: { kind: string; reason?: string; validator?: string }[];
  /** The engagement-started duration (ms), when the act was durative. */
  duration: number | null;
  state: Record<string, unknown>;
}
interface Baseline {
  note: string;
  acts: Record<string, ActRecord>;
}

const baseline: Baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline)
  : { note: '', acts: {} };
const recorded: Record<string, ActRecord> = {};

/** The structural half of an act's answer: status, kinds + reasons, duration. */
function shape(r: CommandResult): Omit<ActRecord, 'state'> {
  const started = r.notes.find((n) => n.kind === 'engagement-started') as
    | { duration?: number }
    | undefined;
  return {
    status: r.status,
    notes: r.notes.map((n) => {
      const { reason, validator } = n as { reason?: unknown; validator?: unknown };
      return {
        kind: n.kind,
        ...(typeof reason === 'string' ? { reason } : {}),
        // A failed validator's name is its reason.
        ...(typeof validator === 'string' ? { validator } : {}),
      };
    }),
    duration: started?.duration ?? null,
  };
}

/** Record (CAIO_RECORD=1) or compare one act against the baseline. */
function check(key: string, r: CommandResult, state: Record<string, unknown>): void {
  const rec: ActRecord = { ...shape(r), state };
  if (RECORD) {
    recorded[key] = rec;
    return;
  }
  const want = baseline.acts[key];
  expect(want, `no baseline for '${key}' — record with CAIO_RECORD=1`).toBeDefined();
  expect(rec, `'${key}' (${r.text}) differs from the before-record`).toEqual(want);
}

afterAll(() => {
  if (!RECORD || Object.keys(recorded).length === 0) return;
  const acts: Record<string, ActRecord> = { ...baseline.acts, ...recorded };
  const sorted = Object.fromEntries(
    Object.keys(acts)
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
      .map((k) => [k, acts[k]!]),
  );
  const out: Baseline = {
    note:
      'controllers-are-io drive: the before-record of steps 10-15 (plan D13). ' +
      'Written by CAIO_RECORD=1; compared on every other run. Do not hand-edit.',
    acts: sorted,
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(out, null, 2)}\n`);
});

/* ───────────────────────── staging ───────────────────────── */

const TERMINUS = '/world/terminus';
const LOUNGE = '/world/lounge';
const SQUARE = '/world/terminus/market/square';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const BAR = '/world/lounge/location/bar';
const WARD = '/world/terminus/infirmary/ward';
const LAVOIR = '/world/terminus/wharfside/lavoir/location/lavoir';
const BATHS = '/world/terminus/market/bathhouse/location/baths';
// ⚠ Not the tinker: he walks a round, so whether he is in his yard is the hour's.
const COBBLER = '/world/terminus/mayfield-row/cobbler/location/shop';
const NECROPOLIS = '/world/terminus/necropolis/ground';
const GAZETTE = '/world/terminus/gazette/office';

const open: Session[] = [];

/** A staging character: seated on both extents, so its `eval` reaches. */
async function stager(handle: string, where: string): Promise<Session> {
  const s = await Session.open(handle, {
    startLocation: where,
    wizard: true,
    committees: [TERMINUS, LOUNGE],
  });
  open.push(s);
  await s.drainProse();
  return s;
}

/**
 * Run a staging/reading `eval` in `extent` and hand back its JSON value.
 * ⚠ One EXPRESSION — the command line splits on `;` and pipes on `||`.
 */
async function ev<T = unknown>(s: Session, expr: string, extent = TERMINUS): Promise<T> {
  const r = await s.cmd(`eval --parcel ${extent} JSON.stringify(${expr})`);
  const said = (await r.said()).trim();
  expect(said, `eval threw: ${expr}`).not.toMatch(/\berror:|sandbox boundary denied/i);
  const m = /^\S+: ("(?:[^"\\]|\\.)*")\s*$/m.exec(said);
  expect(m, `eval answered no value: ${said.slice(0, 300)}`).toBeTruthy();
  return JSON.parse(JSON.parse(m![1]!) as string) as T;
}

/** `StuffApi.findById` as an eval fragment. */
const byId = (id: string): string => `StuffApi.findById('${id}')`;

/** Where a thing is, in run-stable words. */
const whereIs = (id: string, holder: Record<string, string>): string =>
  `((t) => (t ? (t.isDestroyed() ? { gone: true, in: null, placement: null } : { gone: false, in: t.getContainer() ? (${JSON.stringify(
    holder,
  )}[t.getContainer().stuffId] ?? t.getContainer().getTemplatePath()) : null, placement: t.getPlacement && t.getPlacement() ? t.getPlacement().name : null }) : { gone: true, in: null, placement: null }))(${byId(id)})`;

/** Is the thing gone (destroyed, or never found)? — no `||`, the eval pipes on it. */
const goneExpr = (id: string): string => `((t) => t ? t.isDestroyed() : true)(${byId(id)})`;

/**
 * Run a command, answering every prompt it raises with `answer(prompt)`
 * (a stuffId for an object prompt, `'yes'` for a confirm). Returns the
 * result and how many prompts were answered.
 */
async function act(
  s: Session,
  text: string,
  answer: (p: unknown) => unknown = () => 'yes',
): Promise<{ r: CommandResult; prompts: number }> {
  const pending = s.cmd(text);
  let prompts = 0;
  let done = false;
  const settled = pending.then(
    (r) => {
      done = true;
      return r;
    },
    (e: unknown) => {
      done = true;
      throw e;
    },
  );
  while (!done) {
    const p = await Promise.race([
      s.awaitPrompt(2_000).catch(() => null),
      settled.then(() => null),
    ]);
    if (p === null) continue;
    const payload = (p as { payload?: { promptId?: string } }).payload;
    const id = payload?.promptId ?? (p as { promptId?: string }).promptId;
    if (id) {
      prompts++;
      s.answerPrompt(id, answer(p));
    }
  }
  const r = await settled;
  await s.drainProse();
  return { r, prompts };
}

/** Bring the world to `hour`:00 of the game day (a jump under a day). */
async function toHour(hour: number, living: Session[]): Promise<void> {
  const now = await worldClockNow();
  const h = (((now % 86_400) + 86_400) % 86_400) / 3_600;
  const minutes = Math.round((((hour - h) % 24) + 24) % 24 * 60);
  if (minutes > 0) await advanceWorldClock(`${minutes} minutes`);
  for (const s of living) await nourish(s);
}

/** The patron's money, in minor units, summed over its accounts. */
async function balance(s: Session, extent = TERMINUS): Promise<number> {
  const rows = await ev<{ minor: number }[]>(
    s,
    `(await BankingApi.accountIdsOf(self.getIdentityPath())).map(a => BankingApi.balanceOf(a))`,
    extent,
  );
  return rows.reduce((sum, m) => sum + m.minor, 0);
}

/*
 * ⭐ One clock, one sky, for every recorded step: the hour of day decides
 * who is on shift (step 12) and the light and warmth a plant reconciles
 * against at the pick (step 10), and the weather the cold. Pinned once,
 * here, so a record and its comparison read the same world.
 */
beforeAll(async () => {
  await toHour(11, []);
  await pinWeather('clear', SQUARE);
}, 600_000);
afterAll(async () => {
  await unpinWeather(SQUARE).catch(() => undefined);
});

/* ───────────────── steps 1–9: later waves ───────────────── */

suite('controllers-are-io — the drive', () => {
  it.todo(
    '1. (W1) carrying a watch by a second timepiece offering wind, `wind@me:watch` winds the watch only; `wind` alone does what it did',
  );
  it.todo('2. (W1) with two watches carried, `wind@watch` asks which; the chosen one is wound');
  it.todo('3. (W1) a script running `wind@watch` with two present errors at once; `wind@all watches` winds both');
  it.todo('4. (W1) `say@me hello` says hello as `say hello`; `wind@nonsense` refuses not-found');
  it.todo('5. (W1) two offers of a verb, the first refuses: the reply names the other in its scoped form');
  it.todo('6. (W2) `pour` from a jug into a glass and `pour` an ingredient at a bench are one act, unscoped');
  it.todo('7. (W6) each regrouped noun keeps its subcommands; `help <noun>` lists them');
  it.todo('8. (W6) in a fight, `disarm` and `fight disarm` are one act with one result');
  it.todo('9. (W5) `carve` at the bench, written with its options, makes the piece the preposition chain made');
});

/* ───────────── step 10: plant, grow (staged), harvest ───────────── */

suite('10. plant a seed in a bed, grow it (staged), harvest', () => {
  let s: Session;
  let pot = '';
  let seed = '';
  beforeAll(async () => {
    s = await stager(uniqueHandle('caio-grower'), SQUARE);
    // The pot-as-a-bed (husbandry: a pot is a bed with one slot), filled.
    pot = await hand(s, '/trade/farming/thing/pot/small', {
      interiorMaterial: '/stuff/idea/material/bulk/potting-soil',
      interiorAmount: 0.5,
    });
    seed = await hand(s, '/trade/farming/thing/seed/turnip');
  }, 300_000);

  const plantIn = (): string =>
    `${byId(pot)}.getContents().find(c => c.getGrowthStage)`;

  it('10a. plant the seed', async () => {
    const { r } = await act(s, `plant #${seed} in #${pot}`);
    const state = await ev<Record<string, unknown>>(
      s,
      `((p) => ({ plant: p ? p.getTemplatePath() : null, stage: p ? p.getGrowthStage() : null, seedGone: ${goneExpr(seed)} }))(${plantIn()})`,
    );
    check('10a.plant', r, state);
  }, 120_000);

  it('10b. harvest before it is ready — refused', async () => {
    const { r } = await act(s, `harvest #${pot}`);
    check('10b.harvest-unready', r, {
      stillGrowing: await ev(s, `!!${plantIn()}`),
    });
  }, 120_000);

  it('10c. staged mature, harvested: the yield and its grade', async () => {
    // ⭐ The staged twin of the season: reconcile first, then set it ripe
    // with a kept season's worst stretch (0.9), as the field drive does.
    await ev(
      s,
      `((p) => (p.getVigor(), p.growthStage = 'mature', p._worstLimiting = 0.9, p.isHarvestable()))(${plantIn()})`,
    );
    const { r } = await act(s, `harvest #${pot}`);
    const state = await ev<Record<string, unknown>>(
      s,
      `({ crops: self.getContents().filter(c => /\\/crop\\//.test(c.getTemplatePath() ?? '')).map(c => ({ crop: c.getTemplatePath(), grade: c.getGradeBand ? c.getGradeBand() : null, maker: c.getMaker ? c.getMaker() : null })), potEmpty: !${plantIn()} })`,
    );
    check('10c.harvest', r, state);
  }, 120_000);
});

/* ───────────── step 11: put — in, on, into a slot, into a feeder ───────────── */

suite('11. put into a container, onto a surface, into a slot, into a feeder', () => {
  let s: Session;
  const id: Record<string, string> = {};
  const holder: Record<string, string> = {};
  beforeAll(async () => {
    s = await stager(uniqueHandle('caio-putter'), SQUARE);
    const fixtures: [string, string, Record<string, unknown>?][] = [
      ['crate', '/trade/farming/thing/crate'],
      ['table', '/stuff/thing/fixture/table'],
      // ⭐ With soil: a plant fits a slot by the root room it would get, and
      // an empty pot has none (11c's first record, an unclaimed slot).
      [
        'pot',
        '/trade/farming/thing/pot/small',
        { interiorMaterial: '/stuff/idea/material/bulk/potting-soil', interiorAmount: 0.5 },
      ],
      ['saucer', '/stuff/thing/vessel/saucer'],
    ];
    for (const [k, tpl, fields] of fixtures) {
      id[k] = await hand(s, tpl, fields);
      holder[id[k]!] = k;
      expectOk(await s.cmd(`drop #${id[k]}`));
    }
    id.rag = await hand(s, '/stuff/thing/rag');
    id.stone = await hand(s, '/trade/farming/thing/field-stone');
    id.mint = await hand(s, '/trade/farming/thing/plant/mint');
    id.rations = await hand(s, '/world/terminus/general-store/thing/rations');
    await s.drainProse();
  }, 300_000);

  it('11a. into a container', async () => {
    const { r } = await act(s, `put #${id.rag} in #${id.crate}`);
    check('11a.put-in-container', r, await ev(s, whereIs(id.rag!, holder)));
  }, 120_000);

  it('11b. onto a surface', async () => {
    const { r } = await act(s, `put #${id.stone} on #${id.table}`);
    check('11b.put-on-surface', r, await ev(s, whereIs(id.stone!, holder)));
  }, 120_000);

  it('11c. into a slot', async () => {
    const { r } = await act(s, `put #${id.mint} in #${id.pot}`);
    const where = await ev<Record<string, unknown>>(s, whereIs(id.mint!, holder));
    const slotted = await ev(
      s,
      `((p) => p.getSlotNames().map(n => [n, [...p.getOccupants(n)].some(o => o.stuffId === '${id.mint}')]))(${byId(id.pot!)})`,
    );
    check('11c.put-in-slot', r, { ...where, slotted });
  }, 120_000);

  it('11d. into a feeder', async () => {
    const { r } = await act(s, `put #${id.rations} in #${id.saucer}`);
    const where = await ev<Record<string, unknown>>(s, whereIs(id.rations!, holder));
    const filledByMe = await ev(
      s,
      `${byId(id.saucer!)}.getLastFilledBy() === self.getIdentityPath()`,
    );
    check('11d.put-in-feeder', r, { ...where, filledByMe });
  }, 120_000);
});

/* ───────────── step 12: order a drink, then the six services ───────────── */

suite('12. order a drink, then each of the six services', () => {
  const handle = uniqueHandle('caio-patron');
  const patientHandle = uniqueHandle('caio-patient');
  let s: Session;
  const goTo = async (where: string, who = handle): Promise<Session> => {
    if (s) {
      s.close();
      // ⚠ Let the old socket's logout land before the new login, or it
      // evicts the character the new session just brought in.
      await new Promise((r) => setTimeout(r, 1_500));
    }
    s = await stager(who, where);
    return s;
  };

  /** A funded customer: an account at the hall, the Governor's recorded
   * override into it (economic bootstrap: no coin by hand). */
  async function fund(who: string): Promise<void> {
    const b = await Session.open(who, { startLocation: BANK_HALL });
    try {
      expectOk(await b.cmd('bank open'));
      const gov = await Session.open('founder', { startLocation: BANK_HALL });
      try {
        expectOk(await gov.cmd(`reserve override 200 to ${who} "wire: controllers-are-io patron"`));
      } finally {
        gov.close();
      }
      await nourish(b);
    } finally {
      b.close();
    }
    await new Promise((r) => setTimeout(r, 1_500));
  }

  beforeAll(async () => {
    // ⭐ The venues are staffed by shift: the file pinned mid-morning,
    // when every house is open. ⚠ Two patrons: the one who is wounded for
    // the clinic must not carry that wound into the other houses' records.
    await fund(handle);
    await fund(patientHandle);
  }, 600_000);

  /** One order: the act, the money it moved, and whatever else `extra` reads. */
  async function order(
    key: string,
    where: string,
    text: (s: Session) => Promise<string>,
    extra: (s: Session) => Promise<Record<string, unknown>> = async () => ({}),
    extent = TERMINUS,
    who = handle,
  ): Promise<void> {
    const p = await goTo(where, who);
    const line = await text(p);
    const before = await balance(p, extent);
    const { r, prompts } = await act(p, line);
    const after = await balance(p, extent);
    check(key, r, { prompts, paid: before - after, ...(await extra(p)) });
  }

  it('12a. a drink at the bar', async () => {
    await order(
      '12a.order-drink',
      BAR,
      async () => 'order pint',
      async (p) => ({
        carried: await ev(
          p,
          `self.getContents().map(c => c.getTemplatePath()).filter(t => !/clothes/.test(t ?? '')).filter(t => !/AetherImplant/.test(t ?? '')).sort()`,
          LOUNGE,
        ),
      }),
      LOUNGE,
    );
  }, 300_000);

  it('12b. treatment — a wounded patron', async () => {
    await order(
      '12b.order-treatment',
      WARD,
      async (p) => {
        // ⚠ A light cut: a heavier one bleeds the patient faint before the
        // house can see to it, and the record would be the validator's.
        await ev(p, `ConditionApi.inflict(self, { mechanism: 'edge', site: 'body.arm.right', energy: 10 }).afflicted`);
        return 'order treatment';
      },
      async (p) => ({
        wounds: await ev(
          p,
          `self.conditions.filter(c => c.kind === 'trauma').map(c => ({ type: c.type, dressed: !!c.dressed, bleeding: !!c.bleeding }))`,
        ),
      }),
      TERMINUS,
      patientHandle,
    );
  }, 300_000);

  it('12c. wash — the laundress', async () => {
    await order('12c.order-wash', LAVOIR, async (p) => {
      // A garment of her trade's (the house washes a `Garment`), brought in.
      const apron = await hand(p, '/trade/tailoring/thing/apron');
      return `order wash #${apron}`;
    });
  }, 300_000);

  it('12d. bath — the bathhouse', async () => {
    await order('12d.order-bath', BATHS, async () => 'order bath');
  }, 300_000);

  it('12e. repair — the cobbler', async () => {
    await order('12e.order-repair', COBBLER, async (p) => {
      const knife = await hand(p, '/stuff/thing/arms/belt-knife');
      return `order repair #${knife}`;
    });
  }, 300_000);

  it('12f. burial — the undertaker', async () => {
    await order('12f.order-burial', NECROPOLIS, async (p) => {
      const body = await hand(p, '/stuff/thing/Corpse');
      return `order burial #${body}`;
    });
  }, 300_000);

  it('12g. transfusion — the blood window', async () => {
    await order('12g.order-transfusion', WARD, async (p) => {
      // ⭐ ABO is seeded on identity, and every run's patron is a new
      // person: stage the universal recipient so whether the window has a
      // compatible unit is the world's answer, not the dice's.
      await ev(p, `(self.bloodGenotype = 'AB', self.bloodType())`);
      return 'order transfusion';
    });
  }, 300_000);
});

/* ───────────── step 13: treat a wound, treat an affliction ───────────── */

suite('13. treat a wound with a dressing, an affliction with a remedy', () => {
  let s: Session;
  beforeAll(async () => {
    s = await stager(uniqueHandle('caio-medic'), SQUARE);
  }, 300_000);

  const traumas = `self.conditions.filter(c => c.kind === 'trauma').map(c => ({ type: c.type, dressed: !!c.dressed, bleeding: !!c.bleeding }))`;

  it('13a. a laceration, dressed with a bandage', async () => {
    const bandage = await hand(s, '/world/lounge/thing/bandage');
    await ev(s, `ConditionApi.inflict(self, { mechanism: 'edge', site: 'body.arm.right', energy: 10 }).afflicted`);
    const { r } = await act(s, `treat with #${bandage}`);
    check('13a.treat-wound', r, {
      wounds: await ev(s, traumas),
      bandageSpent: await ev(s, goneExpr(bandage)),
    });
  }, 120_000);

  it('13b. an affliction that wants fluid, treated with water', async () => {
    // A fresh body: 13a's wound must not ride into this one's record.
    s = await stager(uniqueHandle('caio-medic'), SQUARE);
    // ⭐ The one item-borne remedy `treat` knows for an affliction is FLUID
    // (a vessel with something in it); salt poisoning is cured by water.
    // A full waterskin is the article. (⚠ At HEAD this is refused
    // `wrong-treatment`: the verb classes the skin `fluid` and the row asks
    // `water` — the before-record keeps that, and W5 decides it.)
    const skin = await hand(s, '/world/terminus/general-store/thing/waterskin', {
      interiorMaterial: '/stuff/idea/material/bulk/water',
      interiorAmount: 1,
    });
    await ev(
      s,
      `self.afflict({ kind: 'affliction', templatePath: '/platform/idea/Condition/metabolism/salt-poisoning', stage: 2, elapsed: 0 })`,
    );
    const { r } = await act(s, `treat with #${skin}`);
    check('13b.treat-affliction', r, {
      afflictions: await ev(
        s,
        `self.conditions.filter(c => c.kind === 'affliction').map(c => c.templatePath.split('/').pop() + ':' + c.stage).sort()`,
      ),
    });
  }, 120_000);
});

/* ───────────── step 14: throw to, throw away, throw at ───────────── */

suite('14. throw to a person, throw away, throw at a target', () => {
  let s: Session;
  let ann: Session;
  const annHandle = uniqueHandle('caio-ann');
  let annName = '';
  beforeAll(async () => {
    ann = await stager(annHandle, SQUARE);
    s = await stager(uniqueHandle('caio-thrower'), SQUARE);
    // ⭐ A line goes to a person by what the THROWER knows her as, and a
    // stranger is "a human" — so Ann introduces herself first.
    expectOk(await ann.cmd('introduce'));
    await ann.drainProse();
    const annId = await ev<string>(ann, `self.stuffId`);
    annName = (await ev<string>(s, `${byId(annId)}.describeFor(self)`)).split(/\s+/)[0]!.toLowerCase();
  }, 300_000);

  it('14a. throw the line to Ann, and she has it', async () => {
    const line = await hand(s, '/world/terminus/wharfside/water/thing/heaving-line');
    const { r } = await act(s, `throw #${line} to ${annName}`);
    check('14a.throw-to', r, {
      fastToAnn: await ev(
        ann,
        `((l) => !!l && !!l.getOnEnd() && l.getOnEnd().getIdentityPath() === self.getIdentityPath())(${byId(line)})`,
      ),
      line: await ev(s, whereIs(line, {})),
    });
  }, 120_000);

  it('14b. throw the ball, and it lands', async () => {
    // ⚠ Not a musket ball: balls STACK, so a thrown one merges into the
    // last run's on the ground and the record would differ run to run.
    const ball = await hand(s, '/stuff/thing/cutlery/horn-spoon');
    const { r } = await act(s, `throw #${ball}`);
    check('14b.throw-away', r, await ev(s, whereIs(ball, {})));
  }, 120_000);

  it('14c. throw the ball at Ann — an attack, through the consent gate', async () => {
    const ball = await hand(s, '/stuff/thing/cutlery/horn-spoon');
    const { r, prompts } = await act(s, `throw #${ball} at ${annName}`, () => 'no');
    check('14c.throw-at', r, {
      prompts,
      ball: await ev(s, whereIs(ball, {})),
      annTraumas: await ev(ann, `self.conditions.filter(c => c.kind === 'trauma').map(c => c.type).sort()`),
    });
  }, 120_000);
});

/* ───────────── step 15: read a page, read a display, cast from a scroll ───────────── */

suite('15. read a page, read a display, cast from a scroll', () => {
  let s: Session;
  beforeAll(async () => {
    s = await stager(uniqueHandle('caio-reader'), SQUARE);
  }, 300_000);

  it('15a. read a page of a notebook', async () => {
    const book = await hand(s, '/platform/thing/book');
    const { r } = await act(s, `read #${book} page 1`);
    check('15a.read-page', r, await ev(s, whereIs(book, {})));
  }, 120_000);

  it('15b. read the wall display', async () => {
    const p = await stager(uniqueHandle('caio-reader'), GAZETTE);
    const { r } = await act(p, 'read screen');
    check('15b.read-display', r, {});
    p.close();
  }, 120_000);

  it(`15c. cast from a scroll (${CAST_COMMAND})`, async () => {
    // ⚠ Not identify: at HEAD `read` on an identify scroll dies in the
    // controller (`reading 'replace'` of undefined) before any working —
    // remove-curse asks for its mark, which is the shape worth recording.
    const scroll = await hand(s, '/stuff/thing/magic/scroll-of-remove-curse');
    const mark = await hand(s, '/stuff/thing/cutlery/horn-spoon');
    const { r, prompts } = await act(s, `${CAST_COMMAND} #${scroll}`, () => mark);
    check('15c.cast-scroll', r, {
      prompts,
      scroll: await ev(
        s,
        `((t) => (t ? (t.isDestroyed() ? 'gone' : (t.isSpent && t.isSpent() ? 'spent' : 'charged')) : 'gone'))(${byId(scroll)})`,
      ),
    });
  }, 120_000);
});

/* ───────────── steps 16–25: later waves ───────────── */

suite('controllers-are-io — the drive, continued', () => {
  it.todo(
    '16. (W5) a wizard installs an alternate `harvest` controller that only words differently; the world ends as step 10, the words differ, the duration is the same',
  );
  it.todo(
    "17. (W7) after the mixin splits these survive a restart: a business's call roster, a good's title and crafted maker, a buoyant load in water, a body mid-digestion",
  );
  it.todo(
    '18. (W6) a new character has the default aliases; `l` runs look; `alias unset l` removes it across a restart; no command answers to a second word',
  );
  it.todo("19. (W4) at Dave's Bar `do martini` runs the banked script over its real time; `make martini` is no such command");
  it.todo('20. (W6) `reel` lands a hooked fish; `unwind cocoons` reels silk; each help page reads one trade');
  it.todo('21. (W6) in a drift `drift` cuts forward; on a cart `drive` takes it through an exit');
  it.todo('22. (W6) `store deposit` and `shelf consign` work; `help` lists commands by category');
  it.todo('23. (W1) standing over a block of ice, carrying a smaller, `cut ice` cuts the block underfoot; `--strict` with two refuses naming both');
  it.todo('24. (W1) a script command that would prompt fails at once naming the input; a typed `--async` line runs in the background');
  it.todo("25. (W3) the dip pot's card reads answers: dip; `help dip` lists what answers dip; a greyed offer says why");
});

afterAll(() => {
  for (const s of open) s.close();
});

// The owned/attached split: nothing here jumps more than a day, but step 12
// pins the hour, which only a test world allows.
void isOwnedTestWorld;
