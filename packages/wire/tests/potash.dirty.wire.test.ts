/**
 * ⭐⭐ **Potash, driven end to end** — the potash build's exit criterion,
 * run against the real socket (the requirements doc's drive, steps 1–16;
 * the model is docs/subsystems/potash.md).
 *
 * The drive in one sentence: *fell a beech and a pine for their brash, burn
 * each to ash in the Hanging Wood's pit and read the difference off the
 * heap; burn a clamp through with the draught wide and find its ash sized
 * to the charge; leach the beech ash with rain and read the lye by an egg,
 * pass it back through fresh ash and watch the egg rise; leach with well
 * water and find it weaker; boil a strong lye and a weak one to black salts
 * in the iron pot and weigh what each left; calcine a cake to pearl ash and
 * sell it to the glassblower; fire glass with it and fail to fire it with
 * lye in the lime's place; slake lime, make a caustic lye and boil hard
 * soap straight; carry ash and potash to the Wharfside chandlery and sell
 * them; follow the ash-man; and wash in hard water with potash.*
 *
 * ⚠ Every checkpoint asserts the verb was UNDERSTOOD and a STATE CHANGED,
 * read back off the world — never only that the verb was not refused.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 npx vitest run
 * tests/potash.dirty.wire.test.ts` (build-2's port — never the default).
 */

import { describe as suite, it, expect, beforeAll } from 'vitest';
import {
  Session,
  type CommandResult,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
} from '../src/harness';

export const DIRTY_REASON =
  'fells the Hanging Wood ride\'s beech and pine, burns and sweeps the ' +
  'ashery\'s pit and the fuel yard\'s clamp, leaches and boils at the ' +
  'ashery, fires its kiln and the glasshouse\'s, consumes lime and tallow ' +
  'in a soap kettle, sells into the chandlery and the glasshouse counters, ' +
  'and moves the world clock';

declareFile({
  file: 'potash.dirty.wire.test.ts',
  packs: [
    'trade-potash',
    'trade-fuel',
    'trade-forestry',
    'trade-chandlery',
    'trade-glass',
    'trade-quarrying',
    'trade-shopkeeping',
    'generic-objects',
    'base-library',
    'rejection',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const RIDE = '/world/terminus/rejection/hanging-wood/ride';
const ASHERY = '/world/terminus/rejection/hanging-wood/ashery';
const GLASSHOUSE = '/world/terminus/rejection/hanging-wood/glasshouse';
const FUEL_YARD = '/world/terminus/rejection/location/fuel-yard';
const PITHEAD = '/world/terminus/rejection/location/pithead-yard';
const CHANDLERY = '/world/terminus/wharfside/chandlery/location/floor';
const STORE = '/world/terminus/general-store/shop-floor';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const GLOWCAP = '/world/terminus/rejection/thing/glowcap-jar';

const T = {
  axe: '/trade/forestry/thing/felling-axe',
  pail: '/stuff/thing/vessel/pail',
  cordwood: '/trade/forestry/thing/cordwood',
  charcoal: '/trade/fuel/thing/charcoal',
  quicklime: '/trade/quarrying/thing/quicklime',
  woodAsh: '/trade/fuel/thing/wood-ash',
  stove: '/stuff/thing/brazier',
  tallow: '/trade/chandlery/thing/tallow',
  kettle: '/trade/chandlery/thing/soap-kettle',
  hearth: '/stuff/thing/Hearth',
  shirt: '/trade/tailoring/thing/shirt',
};

/** No figure for a strength or a grade ever reaches a player (AC 12). */
const NO_NUMBER = /\d/;

// ── the harness's player-shaped helpers (the cleanliness drive's) ──────

type PromptBody = {
  promptId?: string;
  outcome?: { notes?: { kind?: string; matches?: { stuffId?: string }[]; choices?: { response?: string }[] }[] };
};

function answer(s: Session, prompt: unknown): void {
  const frame = prompt as PromptBody & { payload?: PromptBody };
  const payload = frame.payload?.promptId ? frame.payload : frame;
  const id = payload.promptId;
  const note = payload.outcome?.notes?.find((n) => n.kind?.startsWith('prompt-'));
  if (!id) return;
  switch (note?.kind) {
    case 'prompt-mql-object':
      s.answerPrompt(id, note.matches?.[0]?.stuffId ?? '');
      return;
    case 'prompt-mql-many':
      s.answerPrompt(id, JSON.stringify(note.matches?.[0]?.stuffId ? [note.matches[0].stuffId] : []));
      return;
    case 'prompt-choice':
      s.answerPrompt(id, note.choices?.[0]?.response ?? '');
      return;
    default:
      s.answerPrompt(id, 'yes');
  }
}

async function run(s: Session, line: string): Promise<CommandResult> {
  let done = false;
  const pending = s.cmd(line).finally(() => {
    done = true;
  });
  void (async () => {
    while (!done) {
      const p = await s.awaitPrompt(250).catch(() => null);
      if (p && !done) answer(s, p);
    }
  })();
  const r = await pending;
  await new Promise((res) => setTimeout(res, 300));
  return r;
}

function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command/i.test(said);
}

/** The prose a command said, minus MML — what a player reads. */
function prose(said: string): string {
  return said.replace(/<[^>]*>/g, '');
}

async function say(s: Session, line: string): Promise<string> {
  const r = await run(s, line);
  const said = prose((await r.said()).trim());
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${line} → ${r.status}: ${said.slice(0, 300)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return said;
}

/** A durative act: wait for its engagement, then what it said. */
async function act(s: Session, line: string, timeoutMs = 180_000): Promise<string> {
  const r = await run(s, line);
  const said = prose((await r.said()).trim());
  const started = r.notes.find((n) => n.kind === 'engagement-started') as { engagementId?: string } | undefined;
  if (started?.engagementId) await s.awaitActivity(started.engagementId, timeoutMs);
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive] ${line} → ${r.status} [${r.notes.map((n) => n.kind).join(',')}]: ${said.slice(0, 300)}`);
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await new Promise((res) => setTimeout(res, 500));
  const later = prose(await s.listen(1_500).catch(() => ''));
  if (later.trim()) {
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive]   … then: ${later.trim().slice(0, 300)}`);
  }
  await s.drainProse();
  return `${said} ${later}`.trim();
}

/** What a player reads off things matching a query. */
async function examine(s: Session, q: string): Promise<string> {
  const rows = await s.query(q, { fields: 'detail' });
  return prose(
    rows
      .map((r) => {
        const row = r as { displayName?: unknown; longDescription?: unknown };
        return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
      })
      .join('\n'),
  );
}

/** The things in a scope (`here:i`, `me:i`, `pit:i`) whose name matches. */
async function named(s: Session, scope: string, name: RegExp): Promise<{ displayName: string; longDescription: string; mass?: { value: number } }[]> {
  const rows = (await s.query(scope, { fields: 'detail' }).catch(() => [])) as unknown as {
    displayName?: string;
    longDescription?: string;
    mass?: { value: number };
  }[];
  return rows
    .filter((r) => name.test(String(r.displayName ?? '')))
    .map((r) => ({ displayName: String(r.displayName), longDescription: prose(String(r.longDescription ?? '')), mass: r.mass }));
}

async function count(s: Session, scope: string, name: RegExp): Promise<number> {
  return (await named(s, scope, name)).length;
}

/** Into the ROOM, by the founder, who holds the title. */
async function cloneHere(where: string, path: string, n = 1): Promise<void> {
  const f = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await f.cmd(`clone ${path} --here${n > 1 ? ` --count ${n}` : ''}`));
  } finally {
    f.close();
  }
}

const LIT = new Set<string>();

/** The same person, standing somewhere else (inventory travels), with a light. */
async function goTo(handle: string, where: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: where, wizard: true });
  if (!LIT.has(handle)) {
    // ⚠ A light for the dark rooms; outdoors by day it is not needed, and
    // the founder may hold no title to clone on Rejection's ground.
    const lit = await cloneHere(where, GLOWCAP).then(() => true).catch(() => false);
    if (lit) {
      LIT.add(handle);
      await s.cmd('get glowcap');
    }
  }
  await s.drainProse();
  return s;
}

async function newPlayer(tag: string, where: string): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: potash drive"`));
  } finally {
    gov.close();
  }
  // ⭐ A light that travels with them — the founder holds title at the bank
  // hall, not on Rejection's ground or in the chandlery (which is dim).
  await cloneHere(BANK_HALL, GLOWCAP);
  await bank.cmd('get glowcap');
  LIT.add(handle);
  bank.close();
  return goTo(handle, where);
}

/** Jump the clock, then wait for the world to answer again. */
async function advance(duration: string): Promise<void> {
  await advanceWorldClock(duration);
  const probe = await Session.open('founder', { startLocation: BANK_HALL, wizard: true }).catch(() => null);
  try {
    const until = Date.now() + 600_000;
    while (probe && Date.now() < until) {
      const ok = await probe
        .query('here', { fields: ['displayName'] })
        .then(() => true)
        .catch(() => false);
      if (ok) break;
    }
  } finally {
    probe?.close();
  }
}

/** Work by daylight: a dark room names nothing. */
async function toDaylight(): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = ((after % 86_400) + 86_400) % 86_400;
  if (tod >= 9 * 3600 && tod <= 14 * 3600) return;
  const toNine = (9 * 3600 - tod + 86_400) % 86_400;
  await advance(`${Math.ceil(toNine / 60)} minutes`);
}

/** Burn a fire down in slices, reading it each time (a fire is reconciled on read). */
async function burnDown(s: Session, fire: string, hours: number): Promise<void> {
  for (let h = 0; h < hours; h += 2) {
    await advance('2 hours');
    await examine(s, fire);
  }
}

/** Fell `species` at the ride and carry `bundles` of its brash to the ashery. */
async function brashOf(handle: string, species: string, bundles: number): Promise<Session> {
  let s = await goTo(handle, RIDE);
  await say(s, 'get axe');
  const felled = await act(s, `fell ${species}`, 240_000);
  expect(felled, `fell ${species}: ${felled}`).not.toMatch(/nothing left|no such|which/i);
  expect(await count(s, 'here:i', /brash/i), `brash after felling ${species}`).toBeGreaterThanOrEqual(bundles);
  await say(s, 'drop axe');
  for (let i = 0; i < bundles; i++) {
    s.close();
    s = await goTo(handle, RIDE);
    await say(s, 'get brash');
    s.close();
    s = await goTo(handle, ASHERY);
    await say(s, 'stoke brash into pit');
  }
  return s;
}

let ashMaker = '';
let beechHeap = '';

beforeAll(async () => {
  await toDaylight();
}, 300_000);

suite('⭐ drive 1–4 — brash, the pit, and ash of a strength (AC 2, 3, 10)', () => {
  it('⭐ drive 1 — felling a beech leaves brash beside the bole, the logs and the bark', async () => {
    let s = await newPlayer('ash', STORE);
    ashMaker = s.handle;
    // Gloves, bought as a person would — a lye is drawn off a tall hopper.
    await say(s, 'buy gloves');
    await say(s, 'wear gloves');
    s.close();
    s = await goTo(ashMaker, FUEL_YARD);
    // The yard's own felling axe (the forestry drive's precedent).
    await say(s, 'get axe');
    s.close();
    s = await goTo(ashMaker, RIDE);
    const felled = await act(s, 'fell beech', 240_000);
    expect(felled, `fell beech: ${felled}`).not.toMatch(/nothing left|which|no such/i);
    const brash = await count(s, 'here:i', /brash/i);
    expect(brash, 'bundles of brash on the ground').toBeGreaterThanOrEqual(10);
    expect(await count(s, 'here:i', /trunk/i), 'the felled trunk').toBeGreaterThanOrEqual(1);
    // The axe stays at the ride; a back carries one bundle of brash at a
    // time (about thirteen kilos of beech) — two trips to the ashery.
    await say(s, 'drop axe');
    await say(s, 'get brash');
    s.close();
    s = await goTo(ashMaker, ASHERY);
    await say(s, 'stoke brash into pit');
    s.close();
    s = await goTo(ashMaker, RIDE);
    await say(s, 'get brash');
    s.close();
  }, 600_000);

  it('⭐ drive 2–3 — stoke the pit with beech brash, light it, let it burn down, sweep it: heaps of STRONG ash', async () => {
    const s = await goTo(ashMaker, ASHERY);
    const fed = await say(s, 'stoke brash into pit');
    expect(fed, `stoke: ${fed}`).toMatch(/You lay a bundle of brash/i);
    const lit = await say(s, 'ignite pit');
    expect(lit, `ignite pit: ${lit}`).not.toMatch(/can'?t|won'?t|nothing to/i);
    await say(s, 'draught wide');
    const burning = await examine(s, 'pit');
    expect(burning, `the pit, lit: ${burning}`).toMatch(/burn|flame|fire|smoke/i);
    await burnDown(s, 'pit', 16);
    await toDaylight();
    const before = await count(s, 'me:i', /wood ash/i);
    await say(s, 'get broom');
    const swept = await act(s, 'sweep pit');
    expect(swept, `sweep pit: ${swept}`).toMatch(/rake/i);
    const heaps = (await count(s, 'me:i', /wood ash/i)) - before;
    // ~26 kg of beech brash at 3 % ash ≈ 0.8 kg — two heaps.
    expect(heaps, `heaps raked out: ${swept}`).toBeGreaterThanOrEqual(2);
    beechHeap = (await named(s, 'me:i', /wood ash/i)).map((h) => h.longDescription).join('\n');
    expect(beechHeap, `beech ash: ${beechHeap}`).toMatch(/pale|strong ash/i);
    expect(beechHeap.split('\n')[0]).not.toMatch(NO_NUMBER);
    s.close();
  }, 900_000);

  it('⭐ drive 4 — pine ash, burned the same way, reads WEAKER', async () => {
    // The beech heaps go into the hopper to wait for the rain (drive 6).
    let s = await goTo(ashMaker, ASHERY);
    for (let i = 0; i < 4; i++) await say(s, 'put "wood ash" in hopper').catch(() => '');
    s.close();
    s = await brashOf(ashMaker, 'pine', 2);
    await say(s, 'ignite pit').catch(() => '');
    await burnDown(s, 'pit', 16);
    await toDaylight();
    await act(s, 'sweep pit');
    const pine = (await named(s, 'me:i', /wood ash/i)).map((h) => h.longDescription).join('\n');
    expect(pine, `pine ash: ${pine}`).toMatch(/grey/i);
    expect(pine, `pine ash: ${pine}`).not.toMatch(/strong ash/i);
    expect(pine).not.toMatch(NO_NUMBER);
    s.close();
  }, 900_000);
});

suite('⭐ drive 5 — the clamp burned through leaves ash sized to the charge (AC 2)', () => {
  it('⭐ a wide-open clamp opens on heaps of wood ash, not one fixed drift', async () => {
    const s = await newPlayer('collier', FUEL_YARD);
    for (let i = 0; i < 4; i++) {
      await say(s, 'get cordwood');
      await say(s, 'put cordwood in clamp');
    }
    // ⭐ The Burner's own draught, wide open — the collier's mistake.
    // (⚠ `char 0.9` binds the number as the CLAMP — a pre-existing view
    // defect the drive found; the help promised `char 0.45`.)
    await say(s, 'draught wide');
    const started = await say(s, 'char');
    expect(started, `char: ${started}`).toMatch(/fire the clamp/i);
    await advance('80 hours');
    await toDaylight();
    const heaps = await named(s, 'clamp:i', /ash/i);
    const kg = heaps.reduce((a, h) => a + (h.mass?.value ?? 0), 0);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] the clamp opened on ${heaps.length} heap(s) of ash, ${kg.toFixed(3)} kg`);
    expect(heaps.length, 'the clamp ash, in heaps').toBeGreaterThanOrEqual(1);
    // ⭐ Sized to the charge — never the old fixed 0.6 kg drift.
    expect(kg).toBeGreaterThan(0);
    expect(kg).toBeLessThan(0.6);
    s.close();
  }, 900_000);
});

/** The egg's band, as a rank: water 0 · weak 1 · soap strength 2 · strong 3. */
function eggRank(said: string): number {
  if (/rides high/i.test(said)) return 3;
  if (/coin of shell/i.test(said)) return 2;
  if (/stands up on its point|The egg sinks\./i.test(said)) return 1;
  return 0;
}

let firstPass = 0;

suite('⭐ drive 6–8 — the leach, the egg, a second pass, and hard water (AC 4, 12)', () => {
  it('⭐ drive 6 — beech ash and rain make a lye; the egg reads it in words; the ash is SPENT, not gone', async () => {
    const s = await goTo(ashMaker, ASHERY);
    await say(s, 'get pail');
    await say(s, 'fill pail from butt');
    await say(s, 'pour pail into hopper');
    await advance('14 hours');
    await toDaylight();
    expect(await count(s, 'hopper:i', /spent ash/i), 'spent ash left in the hopper').toBeGreaterThanOrEqual(1);
    const egg = await say(s, 'analyze density hopper');
    expect(egg, `the egg in the lye: ${egg}`).toMatch(/egg/i);
    expect(egg).not.toMatch(NO_NUMBER);
    firstPass = eggRank(egg);
    expect(firstPass, `the first pass: ${egg}`).toBeGreaterThanOrEqual(1);
    s.close();
  }, 900_000);

  it('⭐ drive 7 — poured back through fresh ash, the egg RIDES HIGHER', async () => {
    const s = await goTo(ashMaker, ASHERY);
    // Gloved: a lye drawn bare-handed off the hopper splashes the face.
    await say(s, 'pour hopper into pail');
    // The ashery's store: four fresh heaps through the lye a second time.
    for (let i = 0; i < 4; i++) {
      await say(s, 'get "wood ash"');
      await say(s, 'put "wood ash" in hopper');
    }
    await say(s, 'pour pail into hopper');
    await advance('14 hours');
    await toDaylight();
    const egg = await say(s, 'analyze density hopper');
    expect(egg).not.toMatch(NO_NUMBER);
    expect(eggRank(egg), `the second pass: ${egg}`).toBeGreaterThan(firstPass);
    s.close();
  }, 900_000);
});
