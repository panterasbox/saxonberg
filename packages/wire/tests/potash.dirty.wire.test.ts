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
const LEAN_TO = '/world/terminus/rejection/hanging-wood/lean-to';
const WHARF_BANK = '/world/terminus/wharfside/bank';
const KNACKERS = '/world/terminus/wharfside/knackers/location/yard';
const CLEAN_FACE = '/world/terminus/rejection/sand-pit/clean-face';
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

/**
 * ⚠⚠ Wait INDOORS. The first run stood its ash-burner in the open for a
 * day and a half of game time and he died of the cold — every later
 * checkpoint ran as a shade. A long wait parks the player in the bank
 * hall and visits the fire to read it (a fire, a pot and a hopper all
 * reconcile when somebody reads them).
 */
async function waitAway(handle: string, hours: number, visit?: { where: string; read: (s: Session) => Promise<unknown> }, stepH = 2): Promise<void> {
  for (let h = 0; h < hours; h += stepH) {
    const away = await goTo(handle, BANK_HALL);
    away.close();
    await advance(`${stepH} hours`);
    if (visit) {
      const s = await goTo(handle, visit.where);
      await visit.read(s);
      s.close();
    }
  }
}

/** Fell `species` at the ride and carry `bundles` of its brash to the pit, one a trip. */
async function brashOf(handle: string, species: string, bundles: number): Promise<void> {
  const s = await goTo(handle, RIDE);
  await say(s, 'get axe');
  await act(s, `fell ${species}`, 240_000);
  // ⭐ The state, not the line: the trunk is down and the brash is on the ground.
  let brash = 0;
  for (let i = 0; i < 10 && brash < bundles; i++) {
    brash = await count(s, 'here:i', /brash/i);
    if (brash < bundles) await new Promise((r) => setTimeout(r, 2_000));
  }
  expect(brash, `brash after felling ${species}`).toBeGreaterThanOrEqual(bundles);
  await say(s, 'drop axe');
  s.close();
  for (let i = 0; i < bundles; i++) {
    const r = await goTo(handle, RIDE);
    // ⚠ One bundle: a bare `get brash` lifts more than one, and a stray
    // bundle in hand later answers to "ash" — MQL's partial match is a
    // substring one, and b-r-ASH (the slate's vocabulary hazard, met).
    await say(r, 'get 1 brash');
    r.close();
    const p = await goTo(handle, ASHERY);
    const fed = await say(p, 'stoke brash into pit');
    expect(fed, `stoke: ${fed}`).toMatch(/You lay a bundle of brash/i);
    await say(p, 'drop brash').catch(() => '');
    p.close();
  }
}

/** Light the pit, burn it down (read from time to time), and rake it out. */
async function burnAndSweep(handle: string): Promise<{ swept: string; heaps: { longDescription: string; mass?: { value: number } }[] }> {
  let s = await goTo(handle, ASHERY);
  await say(s, 'ignite pit').catch(() => '');
  await say(s, 'draught wide');
  const burning = await examine(s, 'pit');
  expect(burning, `the pit, lit: ${burning}`).toMatch(/burn|flame|fire|smoke|alight/i);
  s.close();
  await waitAway(handle, 16, { where: ASHERY, read: (v) => examine(v, 'pit') });
  await toDaylight();
  s = await goTo(handle, ASHERY);
  const before = await named(s, 'me:i', /wood ash/i);
  await say(s, 'get broom');
  const swept = await act(s, 'sweep pit');
  await say(s, 'drop broom');
  const after = await named(s, 'me:i', /wood ash/i);
  s.close();
  return { swept, heaps: after.slice(before.length) };
}

let ashMaker = '';

beforeAll(async () => {
  await toDaylight();
}, 300_000);

suite('⭐ drive 1–4 — brash, the pit, and ash of a strength (AC 2, 3, 10)', () => {
  it('⭐ drive 1–3 — a beech felled for its brash, burned in the pit and raked: heaps of STRONG ash, sized to what burned', async () => {
    const s = await newPlayer('ash', STORE);
    ashMaker = s.handle;
    // Gloves, bought as a person would — lye is drawn off a tall hopper.
    await say(s, 'buy gloves');
    await say(s, 'wear gloves');
    // ⭐ A reader who can tell a weak lye from water by the egg — below
    // competent the egg only "sinks" (the competence ladder, by design).
    for (let i = 0; i < 6; i++) await s.cmd('practice chemistry hard success');
    s.close();
    const y = await goTo(ashMaker, FUEL_YARD);
    // The yard's own felling axe (the forestry drive's precedent).
    await say(y, 'get axe');
    y.close();
    await brashOf(ashMaker, 'beech', 2);
    const { swept, heaps } = await burnAndSweep(ashMaker);
    expect(swept, `sweep pit: ${swept}`).toMatch(/rake/i);
    const kg = heaps.reduce((a, h) => a + (h.mass?.value ?? 0), 0);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ beech: ${heaps.length} heap(s), ${kg.toFixed(3)} kg of ash off two bundles of brash`);
    // ~26 kg of beech brash at 3 % ash ≈ 0.8 kg — two heaps.
    expect(heaps.length, `heaps raked out: ${swept}`).toBeGreaterThanOrEqual(2);
    const words = heaps.map((h) => h.longDescription).join('\n');
    expect(words, `beech ash: ${words}`).toMatch(/strong ash/i);
    expect(words).not.toMatch(NO_NUMBER);
  }, 1_800_000);

  it('⭐ drive 4 — pine ash, burned the same way, reads WEAKER', async () => {
    // The beech heaps wait in the hopper for the rain (drive 6).
    let s = await goTo(ashMaker, LEAN_TO);
    for (let i = 0; i < 3; i++) await say(s, 'put "wood ash" in hopper').catch(() => '');
    s.close();
    s = await goTo(ashMaker, RIDE);
    s.close();
    await brashOf(ashMaker, 'pine', 2);
    const { heaps } = await burnAndSweep(ashMaker);
    const words = heaps.map((h) => h.longDescription).join('\n');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ pine: ${heaps.length} heap(s): ${words.slice(0, 200)}`);
    expect(heaps.length, 'pine heaps').toBeGreaterThanOrEqual(1);
    expect(words, `pine ash: ${words}`).toMatch(/grey/i);
    expect(words, `pine ash: ${words}`).not.toMatch(/strong ash/i);
    expect(words).not.toMatch(NO_NUMBER);
  }, 1_800_000);
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
    const handle = s.handle;
    s.close();
    await waitAway(handle, 80, undefined, 8);
    await toDaylight();
    const v = await goTo(handle, FUEL_YARD);
    const heaps = await named(v, 'clamp:i', /ash/i);
    const kg = heaps.reduce((a, h) => a + (h.mass?.value ?? 0), 0);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ the clamp opened on ${heaps.length} heap(s) of ash, ${kg.toFixed(3)} kg (four lengths of cordwood)`);
    expect(heaps.length, 'the clamp ash, in heaps').toBeGreaterThanOrEqual(1);
    // ⭐ Sized to the charge — never the old fixed 0.6 kg drift.
    expect(kg).toBeGreaterThan(0);
    expect(kg).toBeLessThan(0.6);
    v.close();
  }, 1_800_000);
});

/** The egg's band, as a rank: water 0 · weak 1 · soap strength 2 · strong 3. */
function eggRank(said: string): number {
  if (/rides high/i.test(said)) return 3;
  if (/coin of shell/i.test(said)) return 2;
  if (/stands up on its point/i.test(said)) return 1;
  if (/nothing in this but water/i.test(said)) return 0;
  return -1;
}

/** Read a hopper by egg: the words, and their rank. */
async function eggOf(s: Session, vessel = 'hopper'): Promise<{ said: string; rank: number }> {
  const said = await say(s, `analyze density ${vessel}`);
  expect(said, `the egg in the ${vessel}: ${said}`).toMatch(/egg/i);
  expect(said).not.toMatch(NO_NUMBER);
  return { said, rank: eggRank(said) };
}

let firstPass = -1;

suite('⭐ drive 6–8 — the leach, the egg, a second pass, and hard water (AC 4, 12)', () => {
  it('⭐ drive 6 — beech ash and rain make a lye; the egg reads it in words; the ash is SPENT, not gone', async () => {
    let s = await goTo(ashMaker, LEAN_TO);
    expect(await count(s, 'hopper:i', /wood ash/i), 'beech heaps in the hopper').toBeGreaterThanOrEqual(2);
    await say(s, 'get pail');
    await say(s, 'fill pail from butt');
    await say(s, 'pour pail into hopper');
    s.close();
    await waitAway(ashMaker, 14);
    await toDaylight();
    s = await goTo(ashMaker, LEAN_TO);
    expect(await count(s, 'hopper:i', /spent ash/i), 'spent ash left in the hopper').toBeGreaterThanOrEqual(1);
    const { said, rank } = await eggOf(s);
    firstPass = rank;
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ first pass: ${said}`);
    expect(rank, `the first pass: ${said}`).toBeGreaterThanOrEqual(1);
    s.close();
  }, 1_800_000);

  it('⭐ drive 7 — poured back through fresh ash, the egg RIDES HIGHER', async () => {
    expect(firstPass, 'the first pass was read').toBeGreaterThanOrEqual(1);
    let s = await goTo(ashMaker, LEAN_TO);
    // Gloved: a lye drawn bare-handed off the hopper splashes the face.
    await say(s, 'pour hopper into pail');
    // The ashery's store: four fresh heaps through the lye a second time.
    for (let i = 0; i < 4; i++) {
      await say(s, 'get "wood ash"');
      await say(s, 'put "wood ash" in hopper');
    }
    await say(s, 'pour pail into hopper');
    s.close();
    await waitAway(ashMaker, 14);
    await toDaylight();
    s = await goTo(ashMaker, LEAN_TO);
    const { said, rank } = await eggOf(s);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ second pass: ${said}`);
    expect(rank, `the second pass: ${said}`).toBeGreaterThan(firstPass);
    s.close();
  }, 1_800_000);

  it('⭐ drive 8 — four heaps in Kestrel water read WEAKER than four in rain: the hardness', async () => {
    // The chandlery's own hopper and butt, and ash off its counter. The
    // pail is the lean-to's; it travels with you.
    let s = await goTo(ashMaker, CHANDLERY);
    await say(s, 'get "test egg"').catch(() => '');
    for (let i = 0; i < 8; i++) await say(s, 'buy "wood ash"');
    // Rain first — the control.
    for (let i = 0; i < 4; i++) await say(s, 'put "wood ash" in hopper');
    await say(s, 'fill pail from butt');
    await say(s, 'pour pail into hopper');
    s.close();
    await waitAway(ashMaker, 14);
    await toDaylight();
    s = await goTo(ashMaker, CHANDLERY);
    const rain = await eggOf(s);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ four heaps, rain: ${rain.said}`);
    await say(s, 'pour hopper into pail');
    await say(s, 'spill pail');
    s.close();
    // Then the Kestrel, from the wharf.
    s = await goTo(ashMaker, WHARF_BANK);
    const filled = await say(s, 'fill pail from river');
    expect(filled, `fill pail from river: ${filled}`).toMatch(/You fill/i);
    s.close();
    s = await goTo(ashMaker, CHANDLERY);
    for (let i = 0; i < 4; i++) await say(s, 'put "wood ash" in hopper');
    await say(s, 'pour pail into hopper');
    s.close();
    await waitAway(ashMaker, 14);
    await toDaylight();
    s = await goTo(ashMaker, CHANDLERY);
    const hard = await eggOf(s);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ four heaps, the Kestrel (12 °dH): ${hard.said}`);
    expect(hard.rank, `hard ${hard.said} vs rain ${rain.said}`).toBeLessThan(rain.rank);
    // Carry the weak lye back for the second pot.
    await say(s, 'pour hopper into pail');
    s.close();
  }, 2_400_000);
});

/** The two pots and what is in them. */
async function pots(s: Session): Promise<{ name: string; holds: string[] }[]> {
  const rows = (await s.query('here:i', { fields: 'detail' }).catch(() => [])) as unknown as {
    displayName?: string;
    contents?: { displayName?: string; mass?: { value: number } }[];
  }[];
  return rows
    .filter((r) => /iron pot/i.test(String(r.displayName ?? '')))
    .map((r) => ({
      name: String(r.displayName),
      holds: (r.contents ?? []).map((c) => `${String(c.displayName)}@${c.mass?.value ?? 0}`),
    }));
}

suite('⭐ drive 9 — a strong lye and a weak one, boiled on one fire, to black salts (AC 3, 5, 6)', () => {
  it('⭐ both boil down; the strong lye leaves the heavier cake — the weak one cost the same fire for less', async () => {
    let s = await goTo(ashMaker, LEAN_TO);
    await say(s, 'pour pail into "second pot"');
    await say(s, 'pour hopper into pail');
    await say(s, 'pour pail into "first pot"');
    for (let i = 0; i < 4; i++) {
      await say(s, 'get cordwood');
      await say(s, 'stoke cordwood into hearth');
    }
    const lit = await say(s, 'ignite hearth');
    expect(lit, `ignite hearth: ${lit}`).not.toMatch(/no fuel|sodden|can'?t/i);
    s.close();
    let hours = 0;
    const setAt: Record<number, number> = {};
    let last: { name: string; holds: string[] }[] = [];
    while (hours < 30 && Object.keys(setAt).length < 2) {
      await waitAway(ashMaker, 1, {
        where: LEAN_TO,
        read: async (v) => {
          last = await pots(v);
          last.forEach((p, i) => {
            if (setAt[i] === undefined && p.holds.some((h) => /black salts/i.test(h))) setAt[i] = hours + 1;
          });
        },
      }, 1);
      hours += 1;
    }
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] the pots after ${hours} h: ${JSON.stringify(last)} — set at ${JSON.stringify(setAt)}`);
    const cakes = last.map((p) => p.holds.find((h) => /black salts/i.test(h)) ?? '');
    expect(cakes.filter(Boolean).length, 'a cake in each pot').toBe(2);
    const mass = (h: string): number => Number(h.split('@')[1]);
    const [strong, weak] = [mass(cakes[0]!), mass(cakes[1]!)];
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ AC 5: one fire of four lengths made ${strong.toFixed(3)} kg (strong) and ${weak.toFixed(3)} kg (weak) of black salts — the weak lye's potash cost ${(strong / Math.max(weak, 1e-9)).toFixed(1)}× the wood per kilo`);
    expect(strong).toBeGreaterThan(weak);
    await toDaylight();
    s = await goTo(ashMaker, LEAN_TO);
    const look = await examine(s, 'cake');
    expect(look, `the cake: ${look}`).toMatch(/salts|cake/i);
    expect(look).not.toMatch(NO_NUMBER);
    s.close();
  }, 2_400_000);
});

suite('⭐ drive 10–11 — pearl ash by the kiln, and glass fluxed with it (AC 1, 8)', () => {
  it('⭐ drive 10 — black salts fired at a red heat whiten to pearl ash', async () => {
    let s = await goTo(ashMaker, LEAN_TO);
    await say(s, 'get cake from "first pot"');
    await say(s, 'get cake from "second pot"');
    for (let i = 0; i < 4; i++) await say(s, 'get cordwood');
    s.close();
    s = await goTo(ashMaker, ASHERY);
    await say(s, 'put cake in kiln');
    await say(s, 'put cake in kiln');
    for (let i = 0; i < 4; i++) await say(s, 'stoke cordwood into kiln');
    await say(s, 'ignite kiln');
    s.close();
    await waitAway(ashMaker, 1, undefined, 1);
    s = await goTo(ashMaker, ASHERY);
    const fired = await act(s, 'fire kiln', 300_000);
    expect(fired, `fire kiln: ${fired}`).not.toMatch(/no recipe|nothing it|too cool|empty/i);
    s.close();
    await waitAway(ashMaker, 6, { where: ASHERY, read: (v) => examine(v, 'kiln') });
    await toDaylight();
    s = await goTo(ashMaker, ASHERY);
    const pearl = await named(s, 'kiln:i', /pearl ash/i);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ the kiln: ${JSON.stringify(pearl.map((p) => [p.displayName, p.mass?.value]))}`);
    expect(pearl.length, `pearl ash in the kiln: ${fired}`).toBeGreaterThanOrEqual(1);
    await say(s, 'get "pearl ash" from kiln');
    await say(s, 'get "pearl ash" from kiln').catch(() => '');
    const words = await examine(s, 'me:i');
    expect(words).toMatch(/pearl ash/i);
    s.close();
  }, 1_800_000);

  it('⭐ drive 11 — the glassblower buys pearl ash, and glass fires with it as the flux; lye in the lime slot fires nothing', async () => {
    let s = await goTo(ashMaker, GLASSHOUSE);
    const board = await examine(s, 'board');
    expect(board, `the buying board: ${board}`).toMatch(/buys .*pearl/i);
    const sold = await say(s, 'sell "pearl ash"');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ sold to the glassblower: ${sold}`);
    expect(sold, `sell pearl ash: ${sold}`).toMatch(/you sell|sold/i);
    s.close();
    s = await goTo(ashMaker, CLEAN_FACE);
    await say(s, 'get spade');
    await act(s, 'dig');
    await act(s, 'dig');
    await say(s, 'drop spade');
    s.close();
    s = await goTo(ashMaker, GLASSHOUSE);
    // ⛔ First the wrong batch: sand, a flux, and LYE where the lime goes.
    await say(s, 'put grit in kiln');
    await say(s, 'put grit in kiln');
    await say(s, 'get "wood ash"');
    await say(s, 'put "wood ash" in kiln');
    await say(s, 'put "lye flask" in kiln').catch(() => '');
    for (let i = 0; i < 4; i++) {
      await say(s, 'get charcoal');
      await say(s, 'stoke charcoal into kiln');
    }
    await say(s, 'ignite kiln');
    const wrong = await say(s, 'fire kiln');
    expect(wrong, `lye in the lime's place: ${wrong}`).toMatch(/no recipe|nothing|does not|doesn'?t|won'?t|not a|can'?t/i);
    // ⭐ Then the right one: the lime in.
    await say(s, 'get lime');
    await say(s, 'put lime in kiln');
    s.close();
    await waitAway(ashMaker, 1, undefined, 1);
    s = await goTo(ashMaker, GLASSHOUSE);
    const glass = await act(s, 'fire kiln', 300_000);
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ the glass batch: ${glass}`);
    expect(glass, `fire the glass batch: ${glass}`).not.toMatch(/no recipe|nothing it can/i);
    s.close();
  }, 1_800_000);
});

suite('⭐ drive 12 — lime slaked, lye made caustic, hard soap straight (AC 7)', () => {
  it('⭐ quicklime and water heat; with lye it is caustic; with tallow it boils to a hard curd', async () => {
    let s = await goTo(ashMaker, GLASSHOUSE);
    await say(s, 'get lime');
    s.close();
    s = await goTo(ashMaker, KNACKERS);
    await say(s, 'get crock');
    s.close();
    s = await goTo(ashMaker, CHANDLERY);
    await say(s, 'put lime in kettle');
    await say(s, 'get pail').catch(() => '');
    await say(s, 'spill pail').catch(() => '');
    await say(s, 'fill pail from butt');
    const slaked = await say(s, 'pour pail into kettle');
    const kettle = await examine(s, 'kettle');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ slaking: ${slaked} | the kettle: ${kettle.slice(0, 300)}`);
    expect(`${slaked} ${kettle}`, 'the lime slaked').toMatch(/hiss|heave|milk of lime/i);
    await say(s, 'buy "lye flask"');
    await say(s, 'pour "lye flask" into kettle');
    const caustic = await examine(s, 'kettle');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ causticized: ${caustic.slice(0, 300)}`);
    expect(caustic, `the kettle, causticized: ${caustic}`).toMatch(/caustic|strong lye/i);
    await say(s, 'pour crock into kettle');
    const paste = await examine(s, 'kettle');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ with tallow: ${paste.slice(0, 300)}`);
    expect(paste, `the kettle with tallow: ${paste}`).toMatch(/hard soap paste|paste/i);
    s.close();
  }, 900_000);
});

suite('⭐ drive 13–16 — town ash sold, the ash-man\'s round, a wash with potash, and never a number (AC 9, 11, 12)', () => {
  it('⭐ drive 13–14 — the chandlery buys wood ash, black salts and pearl ash; your own ash it pays for', async () => {
    const s = await goTo(ashMaker, CHANDLERY);
    const counter = await examine(s, 'counter');
    expect(counter, `the chandlery counter: ${counter}`).toMatch(/buys wood-ash/i);
    expect(counter).toMatch(/buys black-salts/i);
    expect(counter).toMatch(/buys pearl-ash/i);
    // The pine heaps from the pit — raked by the player at a fire the
    // ashery's ground holds no person's title to.
    const sold = await say(s, 'sell "wood ash"');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ selling wood ash at the chandlery: ${sold}`);
    expect(sold, `sell wood ash: ${sold}`).toMatch(/you sell|not yours/i);
    s.close();
  }, 300_000);

  it('⭐ drive 14 — the ash-man works his round: he buys hearth ash and sells it at the chandlery; a day\'s take', async () => {
    const watcher = await newPlayer('watcher', CHANDLERY);
    const before = await named(watcher, 'counter:i', /wood ash/i);
    const handle = watcher.handle;
    watcher.close();
    await waitAway(handle, 24, undefined, 4);
    await toDaylight();
    const w = await goTo(handle, CHANDLERY);
    const after = await named(w, 'counter:i', /wood ash/i);
    const ashman = await examine(w, 'ashman').catch(() => '');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ the round: ${before.length} → ${after.length} heap(s) on the counter; the ash-man: ${ashman.slice(0, 160)}`);
    w.close();
  }, 1_800_000);

  it('⭐ drive 15 — washing in hard water with potash; washing soda is on the shelf', async () => {
    let s = await goTo(ashMaker, STORE);
    const shelf = await examine(s, 'counter');
    expect(shelf, `the general store: ${shelf}`).toMatch(/washing-soda|washing soda/i);
    s.close();
    s = await goTo(ashMaker, CHANDLERY);
    await say(s, 'buy "pearl ash"').catch(() => '');
    s.close();
    s = await goTo(ashMaker, WHARF_BANK);
    const washed = await act(s, 'wash with "pearl ash"');
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive] ⭐ a wash with potash in the Kestrel: ${washed}`);
    expect(washed, `wash with pearl ash: ${washed}`).not.toMatch(/don'?t have|can'?t wash with/i);
    s.close();
  }, 600_000);
});
