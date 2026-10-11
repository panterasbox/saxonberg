/**
 * ⭐⭐ **The dairy, driven end to end** — the dairy build's exit criterion,
 * run against the real socket: the requirements' drive script, in order
 * (docs/requirements/dairy-requirements.md § The drive, retired at the
 * sweep; the subsystems are docs/subsystems/dairying.md and mould.md).
 *
 * In one sentence: *on the Delight's flats a bull calf will not milk and
 * gives a vell to the knife, a cow fills a washed pail, milk left warm
 * turns while milk in the cheese room keeps; at the co-op creamery the
 * cream rises in a pan, the skim draws off and stops, the cream breaks in a
 * churn down in the cool; milk scalded on the fire and pitched from the
 * whey crock and renneted sets a firm curd, the whey draws off and starts
 * the next batch, the curd pressed in a hoop comes out a wheel, and the
 * wheel ripens on the cheese-room rack and splits into wedges for the
 * shelf; copper run into a crucible is poured into a mould and comes out
 * an ingot, and water in the ice pan comes out a block; an unwashed hand
 * makes a stranger ill; and three nannies at Rejection give a goat's
 * cheese by the same acts.*
 *
 * ⚠⚠ **Assert UNDERSTOOD AND CHANGED, never "not refused."** Every
 * checkpoint reads prose or state back.
 *
 * ⚠ **Daylight.** The byre and the creamery are lit by their openings, so
 * after dark every object reads *something*. The acts still bind (the
 * binder does not need a name), but a checkpoint that reads a NAME runs at
 * noon — which is why most waits here end at the next noon.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 WIRE_BOOT_TIMEOUT=900000
 * WIRE_FRAME_TIMEOUT=45000 npx vitest run tests/dairy.dirty.wire.test.ts`
 */

import { describe as suite, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { CommandResult } from '../src/harness';
import {
  Session,
  declareFile,
  uniqueHandle,
  engagementIdOf,
  isOwnedTestWorld,
  advanceWorldClock,
  worldClockNow,
} from '../src/harness';

/**
 * ⚠ Why this file cannot run twice: it drafts and slaughters a bull calf,
 * uses up the creamery's starter and rennet, fills and spends the pans, the
 * churn, the vat and both hoops, leaves wheels on the cheese-room racks and
 * a wedge on the co-op shelf, carries the byre's pail away, burns the
 * smelter's charcoal, freezes the ward's ice pan, and makes a second
 * character ill.
 */
export const DIRTY_REASON =
  'slaughters the calf register’s bull calf, spends the creamery’s starter, ' +
  'rennet, pans, churn, vat and hoops, leaves wheels on the racks and a ' +
  'wedge on the shelf, carries off the byre’s pail, burns the smelter’s ' +
  'charcoal, freezes the ward’s ice pan, and infects a second character';

/**
 * ⚠ A day advanced in a world this busy takes minutes of wall time, and
 * several checkpoints wait a day or a fortnight: the harness's five-minute
 * default timed the hoop out mid-press and every later answer arrived for
 * the wrong question.
 */
vi.setConfig({ testTimeout: 1_800_000 });

declareFile({
  file: 'dairy.dirty.wire.test.ts',
  packs: [
    'platform',
    'base-library',
    'generic-objects',
    'world-seed',
    'terminus',
    'hearts-delight',
    'rejection',
    'trade-ranching',
    'trade-cooking',
    'trade-dairying',
    'trade-smelting',
    'trade-mining',
    'hearthworks',
  ],
  dirtyReason: DIRTY_REASON,
});

const YARD = '/world/terminus/hearts-delight/dairy/location/yard';
const BYRE = '/world/terminus/hearts-delight/dairy/location/byre';
const CREAMERY = '/world/terminus/hearts-delight/creamery/location/floor';
const CHEESE_ROOM = '/world/terminus/hearts-delight/creamery/location/cheese-room';
const GOAT_PEN = '/world/terminus/rejection/kestrel-road/goat-pen';
const SMELTER = '/world/terminus/rejection/location/smelter';
const WARD = '/world/terminus/infirmary/ward';
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';
const FARMSTEAD = '/world/terminus/hearts-delight/location/farmstead-yard';
const DELIGHT = '/world/terminus/hearts-delight';

let k: Session;
let handle = '';

const record: string[] = [];
function note(line: string): void {
  const flat = line.replace(/\s+/g, ' ').trim();
  record.push(flat);
  // eslint-disable-next-line no-console
  console.log(`[dairy drive] ${flat}`);
}

/* ──────────────────────────── the harness ──────────────────────────── */

function secondsOf(duration: string): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$/.exec(duration);
  expect(m, `unparseable duration '${duration}'`).toBeTruthy();
  const units: Record<string, number> = { second: 1, minute: 60, hour: 3_600, day: 86_400 };
  return Number(m![1]) * (units[m![2] as string] ?? 0);
}

async function advance(duration: string): Promise<void> {
  const { before, after } = await advanceWorldClock(duration);
  expect(after - before, `advance ${duration}: world-time did not move`).toBeGreaterThan(
    secondsOf(duration) * 0.9,
  );
  await new Promise((r) => setTimeout(r, 500));
}

/** Advance to the next time the clock reads `hour` o'clock. */
async function untilHour(hour: number): Promise<void> {
  const DAY = 86_400;
  const now = await worldClockNow();
  const into = ((now % DAY) + DAY) % DAY;
  const target = hour * 3_600;
  const wait = into < target ? target - into : DAY - into + target;
  await advance(`${Math.max(1, Math.ceil(wait / 60))} minutes`);
}

/**
 * Type a command; if the binder asks *which one?*, answer it — preferring
 * a LIVING thing over a body (a slaughtered calf reads "the body of a
 * cow" and answers to `cow`), then the first.
 */
async function say(s: Session, text: string): Promise<CommandResult> {
  try {
    return await s.cmd(text);
  } catch (err) {
    if (!/raised a PROMPT/.test(String(err))) throw err;
    type Match = { stuffId?: string; displayName?: string };
    type P = { promptId?: string; outcome?: { notes?: Array<{ matches?: Match[] }> } };
    const pending = (await s.awaitPrompt(5_000)) as unknown as P & { payload?: P };
    const payload = pending.payload?.promptId ? pending.payload : pending;
    const matches = payload.outcome?.notes?.flatMap((n) => n.matches ?? []) ?? [];
    const pick = matches.find((m) => m.stuffId && !/body/i.test(m.displayName ?? '')) ??
      matches.find((m) => m.stuffId);
    note(`(asked which, for '${text}': ${matches.map((m) => m.displayName).join(' / ')} → ${pick?.displayName})`);
    if (payload.promptId && pick?.stuffId) s.answerPrompt(payload.promptId, pick.stuffId);
    await new Promise((r) => setTimeout(r, 1_500));
    return await s.cmd(text);
  }
}

async function read(s: Session, text: string): Promise<string> {
  const r = await say(s, text);
  return r.said();
}

/** Every way a command dies before or inside its controller. */
function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const n = (r.notes as Array<{ kind?: string; reason?: string; detail?: string }>).find(
    (x) =>
      x.kind === 'controller-rejected' ||
      x.kind === 'command-rejected' ||
      x.kind === 'validator-failed' ||
      x.kind === 'mql-error' ||
      x.kind === 'empty-result' ||
      x.kind === 'target-declined',
  );
  if (!n) return null;
  return n.reason ?? n.detail ?? n.kind ?? null;
}

/** Run an act; if it engaged, wait it out. Returns its own prose. */
async function act(s: Session, text: string): Promise<{ r: CommandResult; said: string }> {
  const r = await say(s, text);
  const engaged = (r.notes as Array<{ kind?: string }>).some((n) => n.kind === 'engagement-started');
  if (engaged) {
    await s.awaitActivity(engagementIdOf(r), 120_000);
    await new Promise((res) => setTimeout(res, 2_500));
  }
  const said = await r.said();
  note(`${text} → ${refusedFor(r) ?? 'ok'} · ${said.slice(0, 260)}`);
  return { r, said };
}

/** Act, and require that it was understood and not refused. */
async function doing(s: Session, text: string): Promise<string> {
  const { r, said } = await act(s, text);
  expect(refusedFor(r), `'${text}' was refused: ${said} ${JSON.stringify(r.notes)}`).toBeNull();
  return said;
}

/** Move the character by reopening the session where it needs to be. */
async function goTo(where: string): Promise<void> {
  k?.close();
  k = await Session.open(handle, { startLocation: where, wizard: true });
  await k.drainProse();
}

async function carried(s: Session): Promise<string> {
  return read(s, 'inventory');
}

/** Read a vessel's temperature off the thermometer, in K. */
async function kelvinOf(s: Session, what: string): Promise<number> {
  const line = await read(s, `measure temperature ${what}`);
  const m = /([0-9]+(?:\.[0-9]+)?)\s*K\b/.exec(line);
  expect(m, `no temperature in: ${line}`).toBeTruthy();
  return Number(m![1]);
}

/**
 * As the founder, clone `path` onto the floor of `where` (setup only).
 * ⚠ Not `eval` — a clone inside the eval sandbox dies at the boundary
 * (`fromStored` denied) and the dispatch never answers.
 */
async function mint(where: string, path: string, count = 1): Promise<void> {
  const gov = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    for (let i = 0; i < count; i++) {
      const r = await gov.cmd(`clone ${path} --here`);
      expect(refusedFor(r), `founder clone ${path}: ${await r.said()}`).toBeNull();
    }
    await gov.drainProse();
  } finally {
    gov.close();
  }
}

beforeAll(async () => {
  handle = uniqueHandle('dairyman');
  k = await Session.open(handle, { startLocation: BYRE, wizard: true });
  await k.drainProse();
}, 300_000);

afterAll(() => {
  k?.close();
  // eslint-disable-next-line no-console
  console.log(`\n[dairy drive] RECORD\n${record.map((l) => `  ${l}`).join('\n')}\n`);
});

/* ───────────── 0. the clock ───────────── */

suite.skipIf(!isOwnedTestWorld())('0. the clock', () => {
  it('starts in the small hours, so the herd is full by noon', async () => {
    await untilHour(0);
  });
});

/* ───────────── 1–3. the farm ───────────── */

suite('1–3. the dairy farm, and a cow into a washed pail', () => {
  it('⭐ draft a cow out of the herd book at midnight', async () => {
    const said = await doing(k, 'draft 0 from dairy');
    expect(said).toMatch(/number 0/i);
  });

  it('…and by noon she is full', async () => {
    await untilHour(12);
  });

  it('⭐ the yard and the byre are a dairy farm — and nothing about a college', async () => {
    await goTo(YARD);
    const yard = await read(k, 'look');
    note(`look (dairy yard) → ${yard.slice(0, 300)}`);
    expect(yard).toMatch(/byre/i);
    expect(yard).not.toMatch(/universit|college|campus/i);
    await say(k, 'east');
    await k.drainProse();
    const byre = await read(k, 'look');
    expect(byre).toMatch(/herd book/i);
    expect(byre).toMatch(/calf register/i);
  });

  it('⭐ `look cow` — her condition, and that she is in milk', async () => {
    const cow = await read(k, 'look cow');
    note(`look cow → ${cow}`);
    expect(cow).toMatch(/in full milk|wants milking|heavy/i);
  });

  it('⭐ `wash pail`, then `milk cow into pail` — litres of milk', async () => {
    await doing(k, 'get pail');
    const washed = await doing(k, 'wash pail');
    expect(washed).toMatch(/wash/i);
    const milked = await doing(k, 'milk cow into pail');
    expect(milked).toMatch(/litre|pail|milk/i);
    expect(milked).not.toMatch(/on the floor|nothing to catch/i);
    const pail = await read(k, 'look pail');
    note(`look pail → ${pail}`);
    expect(pail).toMatch(/white|milk/i);
    await doing(k, 'return cow');
  });
});

/* ───────────── 6–9. the creamery: cream, skim, butter ───────────── */

suite('6–9. the co-op creamery: the cream rises, the skim comes off, the butter comes', () => {
  it('⭐ the creamery has its pans, churn, vat, hoops, crock and rennet; stairs down', async () => {
    await goTo(CREAMERY);
    const room = await read(k, 'look');
    note(`look (creamery) → ${room.slice(0, 500)}`);
    for (const thing of [/setting pan/i, /churn/i, /cheese vat/i, /hoop/i, /starter crock/i, /rennet/i]) {
      expect(room).toMatch(thing);
    }
    expect(room).toMatch(/down/i);
    expect(room).not.toMatch(/universit|college/i);
  });

  it('⭐ spoilage samples: a jug left here in the warm, a crock in the cheese room', async () => {
    await doing(k, 'get thermometer');
    await doing(k, 'get jug');
    await doing(k, 'pour pail into jug --amount 1L');
    await doing(k, 'drop jug');
    await doing(k, 'get butter-crock');
    await doing(k, 'pour pail into butter-crock --amount 1L');
    await say(k, 'down');
    await k.drainProse();
    await doing(k, 'drop butter-crock');
    await say(k, 'up');
    await k.drainProse();
  });

  it('⭐ `pour pail into pan` — and the pan stands', async () => {
    await doing(k, 'pour pail into pan --amount 4L');
    const pan = await read(k, 'look pan');
    note(`look pan (just set) → ${pan}`);
    expect(pan).toMatch(/stands|nothing has separated|white/i);
  });
});

/* ───────────── 10–12. heat, and the curd ───────────── */

suite('10–12. scald it on the fire, cool it, pitch it, rennet it', () => {
  it('⭐ `pour pail into vat`; `heat vat` sets it on the fire', async () => {
    await doing(k, 'pour pail into vat');
    const heat = await doing(k, 'heat vat');
    expect(heat).toMatch(/set .* on|fire|hearth/i);
  });

  it('⭐⭐ the thermometer climbs to about 63 °C — then it comes off the heat', async () => {
    let k0 = await kelvinOf(k, 'vat');
    note(`vat on the fire: ${k0} K`);
    for (let i = 0; i < 24 && k0 < 336; i++) {
      await advance('5 minutes');
      k0 = await kelvinOf(k, 'vat');
    }
    note(`vat reached ${k0} K`);
    expect(k0).toBeGreaterThanOrEqual(333);
    expect(k0).toBeLessThan(355);
    await doing(k, 'get vat');
    await doing(k, 'drop vat');
  });

  it('…and cools below the culture’s kill before it is pitched', async () => {
    let k0 = await kelvinOf(k, 'vat');
    for (let i = 0; i < 24 && k0 > 312; i++) {
      await advance('10 minutes');
      k0 = await kelvinOf(k, 'vat');
    }
    note(`vat cooled to ${k0} K`);
    expect(k0).toBeLessThanOrEqual(316);
  });

  it('⭐⭐ `pour crock into vat` pitches it; `pour rennet into vat` turns it', async () => {
    const pitched = await act(k, 'pour starter into vat --amount 0.5L');
    expect(refusedFor(pitched.r)).toBeNull();
    const renneted = await act(k, 'pour rennet into vat --amount 0.1L');
    expect(refusedFor(renneted.r)).toBeNull();
    const vat = await read(k, 'look vat');
    note(`look vat (pitched, renneted) → ${vat}`);
    expect(vat).toMatch(/renneted|bubbl|working|beads/i);
  });
});

/* ───────────── 7–9 (afternoon). the cream, the skim, the churn ───────────── */

suite('7–9 (afternoon). the pan has separated; skim off; churn the cream cool', () => {
  it('⭐ a few hours on, `look pan` — it has stood, and separated', async () => {
    await untilHour(16);
    const pan = await read(k, 'look pan');
    note(`look pan (afternoon) → ${pan}`);
    expect(pan).toMatch(/separated/i);
  });

  it('⭐⭐ `pour pan into pail` — the skim comes off and STOPS; the cream is left', async () => {
    const drawn = await doing(k, 'pour pan into pail');
    note(`skim: ${drawn}`);
    const pail = await read(k, 'look pail');
    expect(pail).toMatch(/thin|blue|skim/i);
    const pan = await read(k, 'look pan');
    note(`look pan (skimmed) → ${pan}`);
    expect(pan).toMatch(/cream|yellow|rich/i);
  });

  it('⭐⭐ the churn, carried down where it is cool, breaks the cream into butter', async () => {
    await doing(k, 'pour pan into churn');
    await doing(k, 'get churn');
    await say(k, 'down');
    await k.drainProse();
    await doing(k, 'drop churn');
    // ⚠ Two hours, not "until the thermometer says so": the reading is a
    // bracket, and the cheese room cannot take it below the break.
    await advance('2 hours');
    const t = await kelvinOf(k, 'churn');
    note(`cream in the churn at ${t} K`);
    const churned = await doing(k, 'churn churn');
    expect(churned).toMatch(/come|butter|thump/i);
    expect(churned).not.toMatch(/will not come|greasy/i);
  });

  it('⭐ `pour churn into can` — buttermilk; the butter stays', async () => {
    await doing(k, 'get churn');
    await say(k, 'up');
    await k.drainProse();
    await doing(k, 'drop churn');
    const drawn = await doing(k, 'pour churn into can');
    note(`buttermilk: ${drawn}`);
    const churn = await read(k, 'look churn');
    note(`look churn (drawn) → ${churn}`);
    expect(churn).toMatch(/run out|dregs|butter|gold/i);
  });
});

/* ───────────── 5. milk that spoils ───────────── */

suite('5. milk left warm turns; milk in the cheese room keeps', () => {
  it('⭐⭐ a day on, the warm jug has turned and the cellar crock has not', async () => {
    await goTo(CREAMERY);
    await untilHour(12);
    const warm = await read(k, 'smell jug');
    note(`smell jug (a day in the warm) → ${warm}`);
    await say(k, 'down');
    await k.drainProse();
    const cool = await read(k, 'smell butter-crock');
    note(`smell crock (a day in the cheese room) → ${cool}`);
    expect(warm).toMatch(/sour|off|turn|taint|spoil|rank/i);
    expect(cool).not.toMatch(/sour|off|turn|taint|spoil|rank/i);
    await doing(k, 'get butter-crock');
    await doing(k, 'spill butter-crock');
    await say(k, 'up');
    await k.drainProse();
  });

  it('⭐ the butter left in the churn goes into the crock', async () => {
    await doing(k, 'pour churn into butter-crock');
    const crock = await read(k, 'look butter-crock');
    note(`look butter-crock → ${crock}`);
    expect(crock).toMatch(/gold|butter|grain/i);
  });
});

/* ───────────── 12–15. curd, whey, starter, hoop, wheel ───────────── */

suite('12–15. the curd has set; the whey starts the next batch; the hoop makes a wheel', () => {
  it('⭐ `look vat` — the curd has set', async () => {
    await goTo(CREAMERY);
    const vat = await read(k, 'look vat');
    note(`look vat (next noon) → ${vat}`);
    expect(vat).toMatch(/still|done|whey|thin|green/i);
  });

  it('⭐⭐ `pour vat into pail` — the whey comes off; the curd is left', async () => {
    await doing(k, 'spill pail');
    const drawn = await doing(k, 'pour vat into pail');
    note(`whey: ${drawn}`);
    const pail = await read(k, 'look pail');
    expect(pail).toMatch(/green|thin|whey/i);
    const vat = await read(k, 'look vat');
    note(`look vat (whey off) → ${vat}`);
    expect(vat).toMatch(/curd|white|springy/i);
  });

  it('⭐⭐ the whey becomes next time’s starter — `pour pail into crock`', async () => {
    await doing(k, 'pour pail into starter');
    const crock = await read(k, 'look starter');
    note(`look starter crock → ${crock}`);
    expect(crock).toMatch(/sediment|creams|culture|stirs/i);
  });

  it('⭐⭐ `pour vat into hoop`; `put stone on hoop`; it draws down; a WHEEL', async () => {
    await doing(k, 'pour vat into hoop');
    await doing(k, 'get stone');
    const stone = await doing(k, 'put stone on hoop');
    expect(stone).toMatch(/stone/i);
    const filled = await read(k, 'look hoop');
    note(`look hoop (filled) → ${filled}`);
    await advance('8 hours');
    const drawn = await read(k, 'look hoop');
    note(`look hoop (eight hours pressed) → ${drawn}`);
    expect(drawn).toMatch(/drawn down|firmed|set/i);
    await untilHour(12);
    const set = await read(k, 'look hoop');
    note(`look hoop (set) → ${set}`);
    expect(set).toMatch(/set|wheel/i);
    await doing(k, 'get stone');
    const got = await doing(k, 'get wheel from hoop');
    expect(got).toMatch(/wheel/i);
    expect(await carried(k)).toMatch(/wheel/i);
  });

  it('⭐ the wheel is salted at the trough (`cure wheel`)', async () => {
    const cured = await doing(k, 'cure wheel');
    note(`cure wheel → ${cured}`);
    expect(cured).toMatch(/salt/i);
  });
});

/* ───────────── 16–19. the cheese room: ripening, splitting, selling ───────────── */

suite('16–19. the wheel ripens on the rack; it splits into wedges; a wedge sells', () => {
  it('⭐ down to the cheese room; on the rack; `look wheel` — young', async () => {
    await goTo(CHEESE_ROOM);
    await doing(k, 'put wheel on rack');
    const young = await read(k, 'look wheel');
    note(`look wheel (new) → ${young}`);
    expect(young).toMatch(/young/i);
  });

  it('⭐⭐ a fortnight on, `look wheel` and `taste wheel` read its ripening in words', async () => {
    await advance('14 days');
    await untilHour(12);
    const look = await read(k, 'look wheel');
    const taste = await read(k, 'taste wheel');
    note(`look wheel (a fortnight) → ${look}`);
    note(`taste wheel (a fortnight) → ${taste}`);
    expect(look).toMatch(/coming on|rind|ripe/i);
    expect(look).not.toMatch(/[0-9]/);
    expect(taste).toMatch(/milk|cheese/i);
  });

  it('⭐⭐ `split wheel` — a wedge; `consign wedge` on the co-op shelf', async () => {
    await doing(k, 'get wheel');
    await doing(k, 'get knife');
    const split = await doing(k, 'split wheel');
    expect(split).toMatch(/wedge/i);
    await say(k, 'up');
    await k.drainProse();
    await doing(k, 'get wedge');
    const listed = await doing(k, 'consign wedge --ask 12');
    note(`consign wedge → ${listed}`);
    const shelf = await read(k, 'look shelf');
    expect(shelf).toMatch(/wedge|cheese/i);
  });
});

/* ───────────── 11. a batch taken to the boil sets badly ───────────── */

suite('11. a second batch taken to the boil: its curd sets badly, said in words', () => {
  it('⭐ a fresh pail from the herd', async () => {
    await goTo(BYRE);
    await untilHour(0);
    await doing(k, 'draft 4 from dairy');
    await untilHour(12);
    await act(k, 'spill pail');
    const milked = await doing(k, 'milk cow into pail');
    expect(milked).not.toMatch(/on the floor|nothing to catch/i);
    await doing(k, 'return cow');
  });

  it('⭐⭐ boiled on the fire, cooled, pitched — and the curd sets BADLY', async () => {
    await goTo(CREAMERY);
    await doing(k, 'pour pail into vat --amount 4L');
    await doing(k, 'heat vat');
    let t = await kelvinOf(k, 'vat');
    for (let i = 0; i < 40 && t < 362; i++) {
      await advance('5 minutes');
      t = await kelvinOf(k, 'vat');
    }
    note(`the second batch reached ${t} K`);
    expect(t).toBeGreaterThanOrEqual(356);
    await doing(k, 'get vat');
    await doing(k, 'drop vat');
    for (let i = 0; i < 30 && t > 312; i++) {
      await advance('10 minutes');
      t = await kelvinOf(k, 'vat');
    }
    await doing(k, 'pour starter into vat --amount 0.5L');
    await advance('10 hours');
    await untilHour(12);
    const vat = await read(k, 'look vat');
    note(`look vat (boiled batch, set) → ${vat}`);
    expect(vat).toMatch(/set badly|slack and grainy/i);
  });
});

/* ───────────── 20. the kitchen takes butter as its fat ───────────── */

suite('20. butter fries roots at the cookhouse, as a fat', () => {
  it('⭐⭐ butter into the pot, two bundles of roots, the fire, and a plate', async () => {
    await goTo(CREAMERY);
    await doing(k, 'get butter-crock');
    await goTo(COOKHOUSE);
    await untilHour(12);
    await act(k, 'ignite oven');
    const fat = await doing(k, 'pour butter-crock into pot --amount 0.05L');
    note(`butter into the pot → ${fat}`);
    await doing(k, 'add roots to pot');
    await doing(k, 'add roots to pot');
    await doing(k, 'heat pot');
    const plated = await doing(k, 'plate');
    note(`plate → ${plated}`);
    expect(plated).toMatch(/fried|crisp|roots/i);
    expect(plated).not.toMatch(/pot luck/i);
  });
});

/* ───────────── 25. ewe's milk, in season ───────────── */

suite('25. on the bench at the Delight, in season: ewe’s milk', () => {
  it('⭐⭐ a ewe milks only in her season — and in it, she fills the pail', async () => {
    await goTo(FARMSTEAD);
    await untilHour(0);
    await act(k, 'spill pail');
    await doing(k, 'draft 0 from flock');
    await untilHour(12);
    let milked = await act(k, 'milk ewe into pail');
    for (let i = 0; i < 20 && /^season-/.test(refusedFor(milked.r) ?? ''); i++) {
      note(`ewe out of season (${refusedFor(milked.r)}): ${milked.said}`);
      await doing(k, 'return ewe');
      await advance('15 days');
      await untilHour(0);
      await doing(k, 'draft 0 from flock');
      await untilHour(12);
      milked = await act(k, 'milk ewe into pail');
    }
    expect(refusedFor(milked.r)).toBeNull();
    const pail = await read(k, 'look pail');
    note(`ewe's milk → ${pail}`);
    expect(pail).toMatch(/thick|white|ewe/i);
    await doing(k, 'return ewe');
  });
});

/* ───────────── 26. the herd: a cow dries off, rests, comes back ───────────── */

suite('26. a cow left unmilked dries off; back in the book she rests; then she is in milk', () => {
  it('⭐⭐ a cow drafted and left unmilked dries off — `look cow` says so', async () => {
    await goTo(BYRE);
    await untilHour(0);
    await doing(k, 'draft 2 from dairy');
    await untilHour(12);
    const full = await read(k, 'look cow');
    note(`look cow (drafted, noon) → ${full}`);
    expect(full).not.toMatch(/dried off/i);
    await advance('1 day');
    const cow = await read(k, 'look cow');
    note(`look cow (a day unmilked) → ${cow}`);
    expect(cow).toMatch(/dried off/i);
  });

  it('⭐⭐ `return cow`; `draft 2` at once — still dry', async () => {
    await doing(k, 'return cow');
    await doing(k, 'draft 2 from dairy');
    const cow = await read(k, 'look cow');
    note(`look cow (redrafted at once) → ${cow}`);
    expect(cow).toMatch(/dried off/i);
  });

  it('⭐⭐ after the rest, drafted again, she is back in milk', async () => {
    await doing(k, 'return cow');
    await advance('4 days');
    await untilHour(0);
    await doing(k, 'draft 2 from dairy');
    await untilHour(12);
    const cow = await read(k, 'look cow');
    note(`look cow (after the rest) → ${cow}`);
    expect(cow).not.toMatch(/dried off/i);
    expect(cow).toMatch(/milk/i);
    await doing(k, 'return cow');
  });
});

/* ───────────── 22–23. raw milk and a stranger ───────────── */

suite('22–23. an unwashed hand, raw milk, and a stranger who drinks it', () => {
  let stranger: Session;

  it('⭐ a cow milked by hands nine hours unwashed', async () => {
    // ⚠ The ewe's milk is spilled in the yard: a floor already holding a
    // puddle of another milk refuses a second (a bulk finding).
    await goTo(YARD);
    await act(k, 'spill pail');
    await goTo(BYRE);
    await doing(k, 'draft 3 from dairy');
    await advance('9 hours');
    const milked = await doing(k, 'milk cow into pail');
    expect(milked).not.toMatch(/on the floor|nothing to catch/i);
    await doing(k, 'return cow');
  });

  it('⭐⭐ the stranger drinks it raw, and falls ill', async () => {
    await doing(k, 'drop pail');
    stranger = await Session.open(uniqueHandle('stranger'), { startLocation: BYRE });
    await stranger.drainProse();
    const drank = await act(stranger, 'drink pail');
    expect(refusedFor(drank.r)).toBeNull();
    await advance('18 hours');
    const self = await read(stranger, 'look me');
    note(`the stranger, eighteen hours on → ${self.slice(0, 400)}`);
    const diagnosed = await read(stranger, 'assess');
    note(`assess → ${diagnosed.slice(0, 400)}`);
    expect(`${self} ${diagnosed}`).toMatch(/sick|ill|fever|nause|cramp|gut|infect|unwell|diarr/i);
    stranger.close();
  });
});

/* ───────────── 4 / AC 2, AC 9. the bull calf ───────────── */

suite('4. a bull calf will not milk — and gives the creamery its rennet', () => {
  it('⭐ draft the calf register’s number 1: a bull calf', async () => {
    // ⚠ Last of the byre's acts: his body answers to `cow` afterwards.
    await goTo(BYRE);
    await untilHour(12);
    await doing(k, 'get pail');
    const said = await doing(k, 'draft 1 from calves');
    expect(said).toMatch(/number 1/i);
  });

  it('⭐⭐ `milk bull` is refused in the animal’s own words — a male does not milk', async () => {
    const { r, said } = await act(k, 'milk bull into pail');
    expect(refusedFor(r)).toBe('wrong-sex');
    expect(said).toMatch(/male does not milk|nothing to give/i);
  });

  it('⭐ AC 9 — slaughtered and butchered young, he gives a VELL', async () => {
    await doing(k, 'slaughter bull');
    const butchered = await doing(k, 'butcher body with knife');
    expect(butchered.length).toBeGreaterThan(0);
    await doing(k, 'get vell');
    expect(await carried(k)).toMatch(/vell/i);
  });

  it('the pail is left in the byre', async () => {
    await doing(k, 'drop pail');
  });
});



/* ───────────── 24. the second venue ───────────── */

suite('24. Rejection’s goats: the same acts, a different milk, no new verb', () => {
  it('⭐⭐ draft a nanny, milk her, set a soft goat’s cheese', async () => {
    await goTo(GOAT_PEN);
    await untilHour(6);
    await doing(k, 'draft 0 from nannies');
    await untilHour(12);
    const pen = await read(k, 'look');
    expect(pen).toMatch(/goat|pen/i);
    await doing(k, 'get pail');
    await doing(k, 'wash pail');
    const milked = await doing(k, 'milk goat into pail');
    expect(milked).not.toMatch(/on the floor|nothing to catch/i);
    const pail = await read(k, 'look pail');
    note(`goat's milk → ${pail}`);
    await doing(k, 'pour pail into vat');
    await doing(k, 'pour crock into vat --amount 0.3L');
    await advance('10 hours');
    await untilHour(12);
    const vat = await read(k, 'look vat');
    note(`look vat (goat's curd) → ${vat}`);
    expect(vat).toMatch(/still|done|whey|green|thin/i);
    await doing(k, 'pour vat into crock');
    await doing(k, 'pour vat into hoop');
    await advance('1 day');
    await untilHour(12);
    await doing(k, 'get wheel from hoop');
    const taste = await read(k, 'taste wheel');
    note(`taste goat's wheel → ${taste}`);
    expect(taste).toMatch(/goat/i);
  });
});

/* ───────────── 19a. the ingot mould ───────────── */

suite('19a. the smelt fills the crucible; the smelter pours the mould', () => {
  it('⭐⭐ copper runs into the crucible; poured into the mould it sets as an INGOT', async () => {
    await mint(SMELTER, '/world/terminus/rejection/thing/copper-ore', 3);
    await goTo(SMELTER);
    await untilHour(12);
    await doing(k, 'get crucible');
    await doing(k, 'put crucible in furnace');
    await doing(k, 'get ore');
    await doing(k, 'put ore in furnace');
    await doing(k, 'get charcoal');
    await doing(k, 'put charcoal in furnace');
    const smelt = await act(k, 'smelt');
    note(`smelt → ${smelt.said}`);
    expect(refusedFor(smelt.r)).toBeNull();
    await advance('10 minutes');
    const furnace = await read(k, 'look furnace');
    note(`look furnace → ${furnace}`);
    const poured = await act(k, 'pour crucible into mould');
    note(`pour crucible into mould → ${poured.said}`);
    expect(refusedFor(poured.r)).toBeNull();
    await advance('2 hours');
    const mould = await read(k, 'look mould');
    note(`look mould (cooled) → ${mould}`);
    expect(mould).toMatch(/set/i);
    const got = await doing(k, 'get ingot from mould');
    expect(got).toMatch(/ingot/i);
  });
});

/* ───────────── 19b. the ice pan ───────────── */

suite('19b. water in the ice pan sets as a BLOCK, by the same acts', () => {
  it('⭐ fill a pail at the creamery butt, carry it to the ward’s freezer', async () => {
    await goTo(CREAMERY);
    await untilHour(12);
    await act(k, 'spill pail');
    await doing(k, 'fill pail from butt');
    await goTo(WARD);
    await doing(k, 'open fridge');
    await doing(k, 'open freezer');
    await doing(k, 'get pan from freezer');
    await doing(k, 'pour pail into pan --amount 2L');
    await doing(k, 'put pan in freezer');
    await advance('12 hours');
    const pan = await read(k, 'look pan');
    note(`look pan (in the freezer) → ${pan}`);
    const got = await doing(k, 'get block from pan');
    expect(got).toMatch(/block/i);
  });
});
