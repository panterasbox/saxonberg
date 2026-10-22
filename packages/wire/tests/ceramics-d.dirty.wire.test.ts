/**
 * ⭐⭐ **Ceramics, part D — moulding, founding and bells**, driven end to end
 * against the real socket (the ceramics requirements' drive, steps 26–35;
 * the model is docs/subsystems/mould.md).
 *
 * The drive in one sentence: *burn gypsum to plaster in the core oven, stir
 * a slurry, press a mug into it in the case and let it cure into a plaster
 * mould, and slip-cast a cup in it; ram a flask round a sword and cast it in
 * pewter — a nameless "pewter cast of an arming sword" that says whose sword
 * it was; press the yard key into wax, cast it in brass and unlock the yard
 * door with the cast; misrun a thin pour, blow a damp flask, and leave a
 * cast porous for want of a riser; burn a wooden frame and melt a tin cup
 * with the pour, and chill cast iron white in iron and grey in sand; press a
 * cheese firmer than the stone did, press a tile that comes straight out,
 * strike a token on the founder's die; salvage the pewter to pewter and a
 * pot to sherds, and fit a cast pommel without a joint; carve a pattern that
 * casts true, cast a hand bell and the great bell and hear them, ring the
 * curfew bell from the next street; and restart the world.*
 *
 * ⚠ Every checkpoint asserts the verb was UNDERSTOOD (never "I don't
 * understand") and a STATE changed, read back off the world — never only
 * that the verb was not refused. ⭐ Step 32 (crystallize) is the
 * crystallizing wave's (W8): brine in the salt pan at the Rejection flat
 * sets its salt in the pan, and the bittern runs off into the tub beneath.
 *
 * Setup by the founder: molten metal is stood up in a crucible by `eval`
 * (the material and its heat — the pour, the mould and what it makes are
 * the player's acts), and rows nobody in this valley sells are `clone`d.
 * ⚠ The restart checkpoint (35) is LAST, and only in a world this run OWNS
 * (`WIRE_BOOT=1`) — the assembly.dirty precedent.
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=<this worktree's> npx vitest run
 * tests/ceramics-d.dirty.wire.test.ts`.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  type CommandResult,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
  isOwnedTestWorld,
  plain,
} from '../src/harness';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync } from 'fs';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT, WIRE_LOG } from '../src/runner/boot';

export const DIRTY_REASON =
  'rams, pours and breaks the Rejection foundry\'s flasks and wax block, ' +
  'burns its core-oven charcoal, fills its tubs and case, locks and unlocks ' +
  'its yard door, pours the bell pit, presses a cheese at the Delight ' +
  'creamery and a tile on the foundry press, strikes its token blanks, ' +
  'clones swords, keys, boards, pots and moulds into the foundry, fills the ' +
  'Rejection flat\'s salt pan with brine and rakes its salt, and moves ' +
  'the clock';

declareFile({
  file: 'ceramics-d.dirty.wire.test.ts',
  packs: [
    'platform',
    'base-library',
    'generic-objects',
    'rejection',
    'terminus',
    'hearts-delight',
    'trade-smelting',
    'trade-smithing',
    'trade-carpentry',
    'trade-ceramics',
    'trade-quarrying',
    'trade-fuel',
    'trade-dairying',
    'trade-chandlery',
    'trade-rubber',
    'world-seed',
  ],
  dirtyReason: DIRTY_REASON,
});

const R = '/world/terminus/rejection';
const SALT_FLAT = `${R}/location/salt-flat`;
const FOUNDRY = `${R}/location/foundry`;
const CASTING_YARD = `${R}/location/foundry-yard`;
const CREAMERY = '/world/terminus/hearts-delight/creamery/location/floor';
const SQUARE = '/world/terminus/market/square';
const WHARF_BANK = '/world/terminus/wharfside/bank';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';

const T = {
  flask: '/trade/smelting/thing/flask',
  waxBlock: '/trade/smelting/thing/wax-block',
  crucible: '/trade/smelting/thing/crucible',
  sword: '/stuff/thing/arms/sword',
  key: '/stuff/thing/Key',
  board: '/trade/carpentry/thing/board',
  pommel: '/trade/smithing/thing/pommel',
  gypsum: '/trade/quarrying/thing/gypsum',
  clay: '/trade/quarrying/thing/clay',
  mug: '/trade/ceramics/thing/mug',
  soapFrame: '/trade/chandlery/thing/soap-frame',
  tinCup: '/trade/rubber/thing/latex-cup',
  hoop: '/trade/dairying/thing/hoop',
  charcoal: '/trade/fuel/thing/charcoal',
};
const M = {
  pewter: '/stuff/idea/material/alloy/pewter',
  brass: '/stuff/idea/material/alloy/brass',
  bronze: '/stuff/idea/material/alloy/bronze',
  castIron: '/stuff/idea/material/alloy/cast-iron',
  lead: '/stuff/idea/material/element/lead',
  firmCurd: '/trade/dairying/idea/material/firm-curd',
};

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
const sessions: Session[] = [];

/** The verb was understood — not the parser's "I don't understand". */
function understood(said: string, r: CommandResult): boolean {
  const parser = (r.notes as Array<{ kind?: string }>).some((n) => n.kind === 'command-rejected');
  return !parser && !/don'?t understand|unknown command|not a command/i.test(said);
}

function refusedFor(r: CommandResult): string | null {
  const n = (r.notes as Array<{ kind?: string; reason?: string; detail?: string }>).find(
    (x) =>
      x.kind === 'controller-rejected' ||
      x.kind === 'command-rejected' ||
      x.kind === 'validator-failed' ||
      x.kind === 'mql-error' ||
      x.kind === 'empty-result',
  );
  return n ? (n.reason ?? n.detail ?? n.kind ?? 'refused') : null;
}

const answeredPrompts = new Set<string>();

/**
 * Type a line; answer a *which one?* prompt WHILE the command is in flight
 * (the first match), never after (the dairy drive's lesson). ⚠ The prompt
 * id is read at the TOP level first (the cleanliness drive's lesson).
 */
async function run(s: Session, line: string): Promise<{ said: string; r: CommandResult }> {
  type Match = { stuffId?: string; displayName?: string };
  type P = { promptId?: string; outcome?: { notes?: Array<{ matches?: Match[] }> } };
  let settled = false;
  const reply = s.cmd(line).finally(() => {
    settled = true;
  });
  while (!settled) {
    let pending: (P & { payload?: P }) | null;
    try {
      pending = (await Promise.race([
        s.awaitPrompt(1_000),
        reply.then(
          () => null,
          () => null,
        ),
      ])) as unknown as (P & { payload?: P }) | null;
    } catch {
      continue;
    }
    if (!pending) break;
    const payload = pending.promptId ? pending : (pending.payload ?? pending);
    const matches = payload.outcome?.notes?.flatMap((n) => n.matches ?? []) ?? [];
    const pick = matches.find((m) => m.stuffId);
    if (!payload.promptId || !pick?.stuffId || answeredPrompts.has(payload.promptId)) continue;
    answeredPrompts.add(payload.promptId);
    s.answerPrompt(payload.promptId, pick.stuffId);
  }
  const r = await reply;
  const said = squash(plain(await r.said()));
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive D] ${s.handle.slice(0, 16)} > ${line} → ${refusedFor(r) ?? 'ok'}\n            ${said.slice(0, 400)}`);
  expect(understood(said, r), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return { said, r };
}

async function say(s: Session, line: string): Promise<string> {
  return (await run(s, line)).said;
}

/** Act, and require that it was not refused. */
async function doing(s: Session, line: string): Promise<string> {
  const { said, r } = await run(s, line);
  expect(refusedFor(r), `'${line}' was refused: ${said} ${JSON.stringify(r.notes)}`).toBeNull();
  return said;
}

/** Wait out an engaged act; with `gameTime`, jump the clock past it. */
async function act(s: Session, line: string, gameTime?: string): Promise<string> {
  const out = await run(s, line);
  expect(refusedFor(out.r), `'${line}' was refused: ${out.said}`).toBeNull();
  const started = (out.r.notes as Array<{ kind?: string; engagementId?: string }>).find(
    (n) => n.kind === 'engagement-started',
  );
  if (started?.engagementId) {
    if (gameTime) await advance(gameTime);
    await s.awaitActivity(started.engagementId, 300_000).catch(() => []);
  }
  await new Promise((res) => setTimeout(res, 500));
  const later = squash(plain(await s.listen(1_500).catch(() => '')));
  await s.drainProse();
  return `${out.said} ${later}`.trim();
}

async function advance(duration: string): Promise<void> {
  await advanceWorldClock(duration);
  await new Promise((res) => setTimeout(res, 1_000));
}

/** What a player reads off things in reach — name, prose, and what they are made of. */
async function examine(s: Session, keyword: string): Promise<string> {
  // ⚠ MQL takes `plaster tub` bare and refuses quotes (a command line wants
  // them; a query does not) — the first run read every quoted tub as empty.
  const rows = await s.query(keyword.replace(/"/g, ''), { fields: 'detail' }).catch(() => []);
  const text = rows
    .map((r) => {
      const row = r as {
        displayName?: unknown;
        longDescription?: unknown;
        bulkMaterial?: { name?: unknown } | null;
      };
      const made = row.bulkMaterial?.name ? ` [${String(row.bulkMaterial.name)}]` : '';
      return `${String(row.displayName ?? '')}${made}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
  // eslint-disable-next-line no-console -- the drive's own record
  console.log(`  [drive D] ${s.handle.slice(0, 16)} examines ${keyword}\n            ${squash(text).slice(0, 500)}`);
  return text;
}

/** The mass of each thing answering `keyword`, kg. */
async function massesOf(s: Session, keyword: string): Promise<number[]> {
  const rows = await s.query(keyword, { fields: ['mass'] }).catch(() => []);
  return rows
    .map((r) => Number((r as { mass?: { value?: unknown } }).mass?.value ?? NaN))
    .filter((n) => Number.isFinite(n));
}

/** The same person somewhere else (inventory travels). */
async function goTo(s: Session, where: string): Promise<Session> {
  const handle = s.handle;
  s.close();
  const next = await Session.open(handle, { startLocation: where, wizard: true });
  sessions.push(next);
  await next.drainProse();
  return next;
}

/** As the caster, clone `path` into `where` (rows nobody here sells). */
async function mint(where: string, path: string, count = 1): Promise<void> {
  const gov = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await gov.cmd(`clone ${path} --here${count > 1 ? ` --count ${count}` : ''}`));
    await gov.drainProse();
  } finally {
    gov.close();
  }
}

/** As the caster, run a setup `eval` in `where` under Rejection's title. */
async function founderEval(where: string, code: string, parcel = R): Promise<string> {
  const gov = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    const r = await gov.cmd(`eval --parcel ${parcel} ${code}`);
    const said = await r.said();
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive D] (caster eval → ${squash(said).slice(0, 200)})`);
    expect(refusedFor(r), `founder eval: ${said}`).toBeNull();
    return said;
  } finally {
    gov.close();
  }
}

/** As the caster, run `code` with `this` bound to the thing called `keyword` in `where`. */
async function founderEvalOn(where: string, keyword: string, code: string, parcel = R): Promise<string> {
  const gov = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    const r = await gov.cmd(`eval --parcel ${parcel} --on ${keyword} return ${code}`);
    const said = await r.said();
    // eslint-disable-next-line no-console -- the drive's own record
    console.log(`  [drive D] (caster eval on ${keyword} → ${squash(said).slice(0, 200)})`);
    expect(refusedFor(r), `founder eval on ${keyword}: ${said}`).toBeNull();
    return said;
  } finally {
    gov.close();
  }
}

/**
 * ⭐ Stand a melt up (setup): fill the pot standing in `where` (the
 * foundry's crucible, the yard's ladle) to its brim with `materialPath`,
 * molten at `kelvin`. Reading the colour of it is the founder's own act.
 */
async function melt(where: string, potRow: string, materialPath: string, kelvin: number): Promise<void> {
  const said = await founderEval(
    where,
    `return (() => { const here = self.getContainer().getContents();` +
      ` const pot = here.find(o => o.getTemplatePath() === '${potRow}');` +
      ` const m = StuffApi.findByTemplatePath('${materialPath}');` +
      ` if (!(pot && m)) return 'no pot or no metal';` +
      // ⭐ Preheat the empty pot first, a few kelvin at a time, as a founder
      // does: 1350 K metal into a cold crucible is a shock that cracks it,
      // and a cracked crucible holds nothing (run 11 read "0 L of bronze").
      ` for (let k = pot.getTemperature().rawValue(); k < ${kelvin}; k += 5) pot.setContentsTemperature(Math.min(k + 5, ${kelvin}));` +
      ` pot.setBulkMaterial('interior', m);` +
      ` pot.setBulkAmount('interior', pot.getBulkCapacity('interior'));` +
      ` pot.setContentsTemperature(${kelvin});` +
      ` return 'melt: ' + pot.getBulkAmount('interior').rawValue() + ' L of ' + m.getName() + ' at ' + Math.round(pot.getTemperature().rawValue()); })()`,
  );
  expect(said, `the melt stood up: ${said}`).toMatch(/melt: .* L of /);
}

async function funded(tag: string, where: string): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  bank.close();
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 200 to ${handle} "wire: ceramics drive D"`));
  } finally {
    gov.close();
  }
  const s = await Session.open(handle, { startLocation: where, wizard: true });
  sessions.push(s);
  await s.drainProse();
  return s;
}

/** Work by daylight: jump to mid-morning unless it already is day. */
async function daylight(): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const h = (((after % 86_400) + 86_400) % 86_400) / 3600;
  if (h >= 8 && h < 15) return;
  const wait = ((9 - h + 24) % 24) * 3600;
  await advance(`${Math.ceil(wait / 60) + 1} minutes`);
}

/** Ram a fresh flask round `pattern` (the founder brings the flask). */
async function ram(s: Session, pattern: string, riser: boolean): Promise<void> {
  await mint(FOUNDRY, T.flask);
  const rammed = await doing(s, `impress ${pattern} in flask`);
  expect(rammed, `impress ${pattern}: ${rammed}`).toMatch(/holds the shape of/i);
  if (riser) {
    const cut = await act(s, 'carve riser on flask', '5 minutes');
    expect(cut, `carve riser: ${cut}`).toMatch(/riser/i);
  }
}

/**
 * Sweep the moulding floor (setup): break up the casts, runners and lumps
 * a checkpoint left lying, so the next one reads only its own. What the
 * caster HOLDS is left alone.
 */
async function clearFloor(): Promise<void> {
  await founderEval(
    FOUNDRY,
    `return (() => { const top = self.getContainer().getContents();` +
      ` const all = top.concat(...top.map(o => (o.getContents && !o.getTemplatePath().startsWith('/platform/agent') ? o.getContents() : [])));` +
      ` const gone = all.filter(o =>` +
      ` (o.getCastFrom && o.getCastFrom()) ??` +
      ` ['/stuff/thing/metal-casting', '/stuff/thing/Casting', '/stuff/thing/sherds', '/trade/smelting/thing/moulding-sand'].includes(o.getTemplatePath()));` +
      ` gone.forEach(o => StuffApi.destruct(o)); return 'swept ' + gone.length; })()`,
  );
}

let caster: Session; // the player — a founder in the making
let playerName = '';

beforeAll(async () => {
  caster = await funded('caster', FOUNDRY);
  const me = await caster.query('me', { fields: ['displayName'] });
  playerName = String((me[0] as { displayName?: unknown } | undefined)?.displayName ?? '');
  await daylight();
}, 600_000);

afterAll(() => {
  for (const s of sessions) s.close();
});

/* ───────────── 26. slip casting ───────────── */

suite('⭐ 26 — slip cast: gypsum to plaster, plaster to a mould, slip to a cup', () => {
  it('⭐ the core oven burns gypsum to PLASTER (one heat rule)', async () => {
    await mint(FOUNDRY, T.gypsum);
    await doing(caster, 'get gypsum');
    await say(caster, 'open oven');
    await doing(caster, 'put gypsum in oven');
    await doing(caster, 'get charcoal');
    await doing(caster, 'stoke charcoal into oven');
    const lit = await say(caster, 'ignite oven');
    expect(lit, `ignite oven: ${lit}`).toMatch(/catch|light|burn|alight/i);
    // A lump heats through slowly and plaster wants a long low heat: an hour
    // was spent warming the stone (run 11 came out gypsum). Four.
    await act(caster, 'fire oven for 4 hours', '4 hours');
    await say(caster, 'douse oven');
    await advance('1 hour'); // let it cool enough to handle
    const plaster = await examine(caster, 'lump');
    expect(plaster, `the lump after the oven: ${plaster}`).toMatch(/lump of plaster/i);
  }, 1_800_000);

  it('⭐⭐ plaster slurry in the case, a mug pressed in, CURES into a plaster mould with the mug\'s cavity', async () => {
    await say(caster, 'open oven');
    await doing(caster, 'get lump');
    await doing(caster, 'put lump in "plaster tub"');
    await doing(caster, 'fill "plaster tub" from butt');
    await act(caster, 'stir "plaster tub"', '2 minutes');
    expect(await examine(caster, '"plaster tub"'), 'the tub holds slurry').toMatch(/slurry/i);
    await doing(caster, 'pour "plaster tub" into case');
    await mint(FOUNDRY, T.mug);
    const pressed = await doing(caster, 'impress mug in case');
    expect(pressed, `impress mug in case: ${pressed}`).toMatch(/holds the shape of/i);
    await advance('30 minutes');
    const mould = await examine(caster, '"plaster mould"');
    expect(mould, `a plaster mould cured in the case: ${mould}`).toMatch(/plaster mould/i);
    expect(mould, 'it holds the mug\'s cavity').toMatch(/impression of an? .*mug/i);
  }, 1_800_000);

  it('⭐⭐ slip poured into it: the mould drinks the water, a CUP of clay releases, and the mould is damp', async () => {
    await mint(FOUNDRY, T.clay);
    await doing(caster, 'get clay');
    await doing(caster, 'put clay in "slip tub"');
    await doing(caster, 'fill "slip tub" from butt');
    await act(caster, 'stir "slip tub"', '2 minutes');
    expect(await examine(caster, '"slip tub"'), 'the tub holds slip').toMatch(/slip/i);
    await doing(caster, 'get "plaster mould"');
    await doing(caster, 'drop "plaster mould"');
    await doing(caster, 'pour "slip tub" into "plaster mould"');
    await advance('3 hours');
    const cup = await examine(caster, 'mug');
    expect(cup, `the slip cast: ${cup}`).toMatch(/clay cast of an? .*mug/i);
    expect(cup, 'it comes out green clay, firm enough to handle').toMatch(/It is green/i);
    expect(await examine(caster, '"plaster mould"'), 'the mould drank the water').toMatch(/damp|wet/i);
    await clearFloor();
  }, 1_800_000);
});

/* ───────────── 27. the impression ───────────── */

suite('⭐⭐ 27 — impress a sword in a flask, cast it in pewter', () => {
  it('a sand mould holds the sword\'s shape; poured, a nameless "pewter cast of an arming sword", seams, whose it was', async () => {
    await mint(FOUNDRY, T.sword);
    await doing(caster, 'get sword');
    expect(await examine(caster, 'me:i:sword'), 'a sword in hand').toMatch(/sword/i);
    await ram(caster, 'sword', true);
    await melt(FOUNDRY, T.crucible, M.pewter, 580);
    const poured = await doing(caster, 'pour crucible into flask');
    expect(poured, `pour: ${poured}`).toMatch(/pour/i);
    await advance('1 hour');
    const cast = await examine(caster, 'cast');
    expect(cast, `the cast: ${cast}`).toMatch(/pewter cast of an arming sword/i);
    expect(cast, 'seams, no mark').toMatch(/seams/i);
    expect(cast, 'no maker\'s mark').toMatch(/no maker's mark/i);
    expect(cast, 'one piece').toMatch(/one piece/i);
    // ⭐ Whose sword it was — the player's own, stamped when they took it up.
    if (playerName) expect(cast, `names whose sword (${playerName})`).toContain(playerName);
    // A riser fed it: sound, not porous.
    expect(cast, 'a riser → sound').not.toMatch(/porous/i);
    // The overfill is a runner, not lost.
    expect(await examine(caster, 'runner'), 'the runner and riser').toMatch(/runner and riser of pewter/i);
    // Kept in hand for 33's recast; the floor is swept for the next.
    await doing(caster, 'get cast');
    await clearFloor();
  }, 1_800_000);
});

/* ───────────── 28. the cast key ───────────── */

suite('⭐⭐⭐ 28 — a wax impression of a key, cast in brass, opens the key\'s lock', () => {
  it('the cast key unlocks the yard door', async () => {
    // Setup: the founder's yard key on the bench, and the yard door locked.
    await mint(FOUNDRY, T.key);
    await founderEvalOn(
      FOUNDRY,
      'key',
      `(() => { this.ensureCredential('key').addKey('rejection-foundry-yard', 'pin-tumbler');` +
        ` this.setMaterial(StuffApi.findByTemplatePath('${M.brass}'));` +
        ` this.setMass(this.getMass().constructor.of(0.02, 'kg'));` +
        ` return 'key ready'; })()`,
    );
    await founderEvalOn(FOUNDRY, 'door', `(() => { this.setOpen(false); this.lock(); return this.isLocked(); })()`);
    await doing(caster, 'get key');
    const pressed = await doing(caster, 'impress key in wax');
    expect(pressed, `impress key in wax: ${pressed}`).toMatch(/holds the shape of/i);
    // The yard key goes back on the bench: only the CAST will be in hand.
    await doing(caster, 'drop key');
    await melt(FOUNDRY, T.crucible, M.brass, 1320);
    await doing(caster, 'pour crucible into wax');
    await advance('1 hour');
    expect(await examine(caster, 'brass'), 'a brass cast of the key').toMatch(/brass cast of a key/i);
    expect(await examine(caster, 'beeswax'), 'the wax came back').toMatch(/beeswax/i);
    await doing(caster, 'get brass');
    await clearFloor();
    // Refused before: nobody holds a key that fits… (the player holds only the cast)
    const unlocked = await run(caster, 'unlock door');
    expect(refusedFor(unlocked.r), `unlock with the cast key: ${unlocked.said}`).toBeNull();
    expect(unlocked.said, `unlock: ${unlocked.said}`).toMatch(/unlock/i);
    await say(caster, 'open door');
    const through = await say(caster, 'go north');
    const here = await caster.query('here', { fields: ['displayName'] });
    expect(
      String((here[0] as { displayName?: unknown } | undefined)?.displayName ?? '') + through,
      'through into the casting yard',
    ).toMatch(/casting yard/i);
    caster = await goTo(caster, FOUNDRY);
  }, 1_800_000);
});

/* ───────────── 29. the pour fails ───────────── */

suite('⭐⭐ 29 — make the pour fail (Chvorinov, the damp blow, the riser)', () => {
  it('too cool into a thin pattern → a MISRUN', async () => {
    await ram(caster, 'sword', true);
    await melt(FOUNDRY, T.crucible, M.pewter, 505); // 5 K over the melt
    await doing(caster, 'pour crucible into flask');
    await advance('1 hour');
    const misrun = await examine(caster, 'misrun');
    expect(misrun, `a cool pour into a blade: ${misrun}`).toMatch(/misrun/i);
    expect(misrun).toMatch(/froze before the mould was full/i);
    await clearFloor();
  }, 1_800_000);

  it('a DAMP flask blows: the pourer is burned and the cast is a ruined lump', async () => {
    await ram(caster, 'sword', true);
    const watered = await doing(caster, 'pour butt into flask');
    expect(watered, `watering the flask: ${watered}`).toMatch(/pour/i);
    expect(await examine(caster, 'flask'), 'the sand drank it').toMatch(/damp|wet|soaked/i);
    await melt(FOUNDRY, T.crucible, M.pewter, 600);
    const blew = await doing(caster, 'pour crucible into flask');
    expect(blew, `the blow: ${blew}`).toMatch(/steam|spits/i);
    const hurt = await say(caster, 'assess me');
    expect(hurt, `the pourer's hands: ${hurt}`).toMatch(/burn/i);
    await advance('1 hour');
    expect(await examine(caster, 'blown'), 'a blown lump').toMatch(/blown lump of pewter/i);
    await clearFloor();
  }, 1_800_000);

  it('NO riser → porous where it froze last (27\'s risered cast was sound)', async () => {
    await ram(caster, 'sword', false);
    await melt(FOUNDRY, T.crucible, M.pewter, 600);
    await doing(caster, 'pour crucible into flask');
    await advance('1 hour');
    const casts = await examine(caster, 'cast');
    expect(casts, `the unrisered cast: ${casts}`).toMatch(/porous/i);
    await clearFloor();
  }, 1_800_000);
});

/* ───────────── 30. survival and chill ───────────── */

suite('⭐⭐ 30 — every pour obeys its receiver; the chill', () => {
  it('bronze into a wooden mould → it BURNS', async () => {
    await mint(FOUNDRY, T.soapFrame);
    await melt(FOUNDRY, T.crucible, M.bronze, 1350);
    const burned = await say(caster, 'pour crucible into "soap frame"');
    expect(burned, `bronze into pine: ${burned}`).toMatch(/burning|catches|chars/i);
    expect(await examine(caster, '"soap frame"'), 'the frame is gone').not.toMatch(/soap frame/i);
  }, 1_800_000);

  it('lead into a tin cup → the cup MELTS', async () => {
    await mint(FOUNDRY, T.tinCup);
    await melt(FOUNDRY, T.crucible, M.lead, 720);
    const melted = await say(caster, 'pour crucible into "latex cup"');
    expect(melted, `lead into tin: ${melted}`).toMatch(/melted|slumps/i);
    expect(await examine(caster, '"latex cup"'), 'the cup is gone').not.toMatch(/cup/i);
  }, 1_800_000);

  it('cast iron into an iron mould sets WHITE; into sand, GREY', async () => {
    await melt(FOUNDRY, T.crucible, M.castIron, 1650);
    await doing(caster, 'pour crucible into "chill mould"');
    await advance('2 hours');
    const white = await examine(caster, 'ingot');
    expect(white, `chilled: ${white}`).toMatch(/white cast iron/i);
    await doing(caster, 'get ingot');
    // The white ingot is its own pattern: rammed into sand and poured again.
    await ram(caster, 'ingot', true);
    await melt(FOUNDRY, T.crucible, M.castIron, 1700);
    await doing(caster, 'pour crucible into flask');
    await advance('2 hours');
    const grey = await examine(caster, 'cast');
    expect(grey, `in sand: ${grey}`).toMatch(/grey cast iron/i);
    await clearFloor();
  }, 1_800_000);
});

/* ───────────── 31. pressing ───────────── */

suite('⭐⭐ 31 — pressing: one load, from a stone, a screw and a blow', () => {
  it('`turn press` on a cheese → firmer than the stone made it', async () => {
    caster = await goTo(caster, CREAMERY);
    await daylight();
    // Setup: the creamery's hoop full of firm curd (the dairy drive makes
    // curd; this one only needs it in the hoop).
    await founderEval(
      CREAMERY,
      `return JSON.stringify(self.getContainer().getContents()` +
        `.filter(o => o.getTemplatePath() === '${T.hoop}')` +
        `.map(o => { o.setBulkMaterial('interior', StuffApi.findByTemplatePath('${M.firmCurd}'));` +
        ` o.setBulkAmount('interior', o.getBulkAmount('interior').constructor.of(2, 'L')); return 'curd'; }))`,
      '/world/terminus/hearts-delight',
    );
    await doing(caster, 'put hoop on "cheese press"');
    let turned = '';
    for (let i = 0; i < 6; i++) turned = await doing(caster, 'turn "cheese press"');
    expect(turned, `the screw: ${turned}`).toMatch(/bears down|as tight/i);
    await advance('8 hours');
    const wheels = await massesOf(caster, 'wheel');
    expect(wheels.length, `a wheel set in the pressed hoop: ${JSON.stringify(wheels)}`).toBeGreaterThanOrEqual(1);
    // ⭐ What the creamery's 12 kg stone makes of the same 2 L of firm curd
    // (1030 kg/m³, 70 % water, `loaded` 0.55 at its reference, 0.47 at the
    // stone's ~2.9×) is a 1.29 kg wheel. Six turns of the screw drive it to
    // ~0.30 moisture: about 1.05 kg — firmer, drier, lighter.
    const stoneWheelKg = 2.06 * (1 - (1 - 0.55 * Math.pow(12 / (2.06 * 2), -0.15)) * 0.7);
    expect(Math.min(...wheels), `the pressed wheel against the stone's ${stoneWheelKg.toFixed(2)} kg`).toBeLessThan(
      stoneWheelKg * 0.92,
    );
    await doing(caster, 'turn back "cheese press"');
    caster = await goTo(caster, FOUNDRY);
  }, 1_800_000);

  it('`turn press` on a tile charge → a pressed tile comes straight out', async () => {
    await daylight();
    await mint(FOUNDRY, T.clay);
    await doing(caster, 'get clay');
    await doing(caster, 'put clay in "tile mould"');
    await doing(caster, 'put "tile mould" on "tile press"');
    let out = '';
    for (let i = 0; i < 8 && !/comes free/i.test(out); i++) out = await doing(caster, 'turn "tile press"');
    expect(out, `the press: ${out}`).toMatch(/comes free/i);
    const tile = await examine(caster, 'tile');
    expect(tile, `the pressed tile: ${tile}`).toMatch(/tile/i);
    await doing(caster, 'turn back "tile press"');
  }, 1_800_000);

  it('`hammer blank on die` → a struck token carrying the die\'s provenance', async () => {
    const struck = await act(caster, 'hammer blank on die', '5 minutes');
    expect(struck, `the blow: ${struck}`).toMatch(/die bites|device/i);
    const token = await examine(caster, 'token');
    expect(token, `the token: ${token}`).toMatch(/struck from .*founder.* die/i);
  }, 1_800_000);
});

/* ───────────── 32. crystallize (W8) ───────────── */

suite('⭐⭐ 32 — crystallize', () => {
  /** The pan's crop and the tub's liquor, read off the world (the reads drive both reconciles). */
  async function saltern(): Promise<{ crop: number; panL: number; tub: string | null; tubL: number }> {
    const said = await founderEval(
      SALT_FLAT,
      `return JSON.stringify((() => { const here = self.getContainer().getContents();` +
        ` const pan = here.find(o => o.getTemplatePath() === '/trade/quarrying/thing/salt-pan');` +
        ` const tub = here.find(o => o.getTemplatePath() === '/trade/quarrying/thing/bittern-tub');` +
        ` if (!(pan && tub)) return { crop: -1, panL: -1, tub: 'missing', tubL: -1 };` +
        ` pan.getMaturationPhase(); const panL = pan.getBulkAmount('interior').rawValue();` +
        ` const crop = pan.getContents().filter(c => c.getTemplatePath() === '/stuff/thing/salt-crystals')` +
        `.reduce((a, c) => a + c.getMass().rawValue(), 0);` +
        ` return { crop, panL, tub: tub.getBulkMaterialPath('interior'), tubL: tub.getBulkAmount('interior').rawValue() }; })())`,
    );
    const json = /\{.*\}/s.exec(plain(said))?.[0] ?? '{}';
    return JSON.parse(json) as { crop: number; panL: number; tub: string | null; tubL: number };
  }

  it('brine in the salt pan → salt crystals IN the pan, with bittern in the tub beneath', async () => {
    await daylight();
    caster = await goTo(caster, SALT_FLAT);
    // ⭐ The pan stands ON its tub (the flat's props), and that is the whole
    // of the drain: the mold's `drainsInto()` reads the vessel under it.
    const tubBefore = await examine(caster, 'tub');
    expect(tubBefore, 'the bittern tub at the flat').toMatch(/tub/i);

    // ⚠ Setup by the founder: the brine. The flat's spring is a strong
    // subsurface brine (most of the way to saturation, as inland brine
    // springs are), and getting it into the pan is the bore crew's trade,
    // not this drive's. 20 L at 0.28 kg/L — under a liter's 0.317, so it
    // has to LOSE water before anything sets.
    const filled = await founderEval(
      SALT_FLAT,
      `return (() => { const pan = self.getContainer().getContents()` +
        `.find(o => o.getTemplatePath() === '/trade/quarrying/thing/salt-pan');` +
        ` const brine = StuffApi.findByTemplatePath('/stuff/idea/material/bulk/salt-water');` +
        ` if (!(pan && brine)) return 'no pan or no brine';` +
        ` pan.setBulkMaterial('interior', brine);` +
        ` pan.setBulkAmount('interior', pan.getBulkAmount('interior').constructor.of(20, 'L'));` +
        ` pan.setBulkPayload('interior', { dissolvedSolidsKgPerL: 0.28 });` +
        ` return 'brine: ' + pan.getBulkAmount('interior').rawValue() + ' L, ' + pan.getMaturationPhase(); })()`,
    );
    expect(filled, `the pan filled: ${filled}`).toMatch(/brine: 20 L, active/);
    const first = await saltern();
    expect(first.crop, 'nothing set yet — the brine is under saturation').toBe(0);

    // The sun works it: a day at a time until the pan is done and the
    // bittern has run off (rain sets it back; a wet week does nothing).
    let read = first;
    for (let day = 0; day < 60 && !(read.tubL > 0); day++) {
      await advance('1 day');
      await examine(caster, 'pan');
      read = await saltern();
    }
    expect(read.crop, `the crop in the pan: ${JSON.stringify(read)}`).toBeGreaterThan(0);
    // ⭐ Nearly all of it: 20 L × 0.28 kg/L is 5.6 kg, and the pan keeps
    // only what its last 3 % of liquor can hold.
    expect(read.crop).toBeGreaterThan(4);
    expect(read.tub, 'the liquor below is BITTERN').toBe('/stuff/idea/material/bulk/bittern');
    expect(read.tubL).toBeGreaterThan(0);
    expect(read.panL, 'the pan is drained').toBe(0);

    // What a player sees: the crop in the pan, the bittern in the tub, and
    // the salt is salt in the hand.
    const pan = await examine(caster, 'pan:i:crystals');
    expect(pan, `the pan's crop: ${pan}`).toMatch(/salt crystals/i);
    const tub = await examine(caster, 'tub');
    expect(tub, `the tub: ${tub}`).toMatch(/bittern/i);
    const got = await doing(caster, 'get crystals from pan');
    expect(got, `raking the crop: ${got}`).toMatch(/crystals/i);
    const held = await examine(caster, 'me:i:crystals');
    expect(held, `the crop in hand: ${held}`).toMatch(/salt/i);
    await say(caster, 'drop crystals');
    caster = await goTo(caster, FOUNDRY);
  }, 3_600_000);
});

/* ───────────── 33. recast and fit ───────────── */

suite('⭐⭐ 33 — recast and interchangeable', () => {
  it('`salvage` the pewter cast → a lump of PEWTER, which recasts', async () => {
    // ⚠ `pewter`, not `cast`: the brass key in hand is a cast too.
    const back = await doing(caster, 'salvage pewter');
    expect(back, `salvage: ${back}`).toMatch(/pewter/i);
    const lump = await examine(caster, 'lump');
    expect(lump, `the salvage: ${lump}`).toMatch(/salvaged lump of pewter/i);
    expect(lump, 'not tin and lead apart').not.toMatch(/lump of tin|lump of lead/i);
    await clearFloor();
  }, 1_800_000);

  it('salvage a fired pot → SHERDS', async () => {
    await mint(FOUNDRY, T.mug);
    const broken = await doing(caster, 'salvage mug');
    expect(broken, `salvage a pot: ${broken}`).toMatch(/sherd/i);
    expect(await examine(caster, 'sherds'), 'sherds').toMatch(/sherd/i);
    await clearFloor();
  }, 1_800_000);

  it('⭐⭐ a pommel cast from a pommel\'s impression fits the sword without a new joint', async () => {
    await mint(FOUNDRY, T.pommel);
    await ram(caster, 'pommel', true);
    await melt(FOUNDRY, T.crucible, M.pewter, 600);
    await doing(caster, 'pour crucible into flask');
    await advance('1 hour');
    expect(await examine(caster, 'pewter'), 'a pewter pommel').toMatch(/pewter cast of a pommel/i);
    const fitted = await doing(caster, 'fit pewter to sword');
    expect(fitted, `fit: ${fitted}`).toMatch(/fit a new pommel/i);
    expect(fitted, 'no new joint').toMatch(/no new joint/i);
  }, 1_800_000);
});

/* ───────────── 34. patterns and bells ───────────── */

suite('⭐⭐ 34 — patterns and bells', () => {
  it('`carve pattern` → an oversize pattern that casts TRUE (27\'s straight impression came out a shade small)', async () => {
    await mint(FOUNDRY, T.board);
    await doing(caster, 'get board');
    const carved = await act(caster, 'carve pattern of sword from board for pewter', '1 hour');
    expect(carved, `carve pattern: ${carved}`).toMatch(/pattern|shavings/i);
    expect(await examine(caster, 'pattern'), 'the pattern').toMatch(/pattern of an arming sword/i);
    await ram(caster, 'pattern', true);
    await melt(FOUNDRY, T.crucible, M.pewter, 600);
    await doing(caster, 'pour crucible into flask');
    await advance('1 hour');
    // ⚠ `pewter`: the brass key in hand is a cast too, and a shade small.
    const cast = await examine(caster, 'pewter');
    expect(cast, `the cast from the pattern: ${cast}`).toMatch(/pewter cast of an arming sword/i);
    expect(cast, 'true to size').not.toMatch(/shade smaller/i);
    await clearFloor();
  }, 1_800_000);

  it('cast a hand bell in a flask → `ring` sounds its note', async () => {
    await ram(caster, 'bell', true);
    await melt(FOUNDRY, T.crucible, M.bronze, 1350);
    await doing(caster, 'pour crucible into flask');
    await advance('2 hours');
    const rung = await doing(caster, 'ring bronze');
    expect(rung, `the hand bell: ${rung}`).toMatch(/high|clear/i);
    expect(rung, 'a named note').toMatch(/\b[A-G]\b( sharp| flat)?/);
  }, 1_800_000);

  it('cast the great bell in the pit — the founder\'s day — and it sounds a LOWER note', async () => {
    caster = await goTo(caster, CASTING_YARD);
    await daylight();
    await melt(CASTING_YARD, '/trade/smelting/thing/ladle', M.bronze, 1350);
    const poured = await doing(caster, 'pour ladle into pit');
    expect(poured, `the pour: ${poured}`).toMatch(/watch|rope|pour/i);
    await advance('7 hours');
    const rung = await doing(caster, 'ring "great bell"');
    expect(rung, `the great bell: ${rung}`).toMatch(/deep/i);
    caster = await goTo(caster, FOUNDRY);
  }, 1_800_000);

  it('⭐ ring the Terminus curfew bell — it is heard in the next places', async () => {
    const listener = await funded('bell-ear', WHARF_BANK);
    caster = await goTo(caster, SQUARE);
    await listener.drainProse();
    const rung = await doing(caster, 'ring "curfew bell"');
    expect(rung, `the curfew bell: ${rung}`).toMatch(/deep|clear/i);
    const heard = squash(plain(await listener.listen(5_000)));
    expect(heard, `heard from the wharf bank: ${heard}`).toMatch(/ring|bell/i);
    listener.close();
    caster = await goTo(caster, FOUNDRY);
  }, 1_800_000);
});

/* ───────────── 35. restart ───────────── */

/**
 * ⭐⭐⭐ Drive 35 — what this part made survives a restart: an impression
 * standing in a rammed flask, a plaster case mid-cure, a press screwed
 * down, a cast's provenance and a cast key's wards. Run LAST: it restarts
 * the world, and only in a world this run OWNS.
 *
 * ⚠ The other bullets of 35 (green bricks, a lining's wear, a lead dose in
 * progress, a potter's mark, a named jug) are the state of parts A–C and
 * are read by THEIR handles; this part checks W7's own.
 */
suite('⭐⭐⭐ 35 — restart the server', () => {
  afterAll(async () => {
    await stopOwnedWorld();
  });

  it.skipIf(!isOwnedTestWorld())('an impression, a curing case, a screwed press and a cast survive', async () => {
    await daylight();
    // Leave state standing: a rammed flask; a case mid-cure; a press down.
    await mint(FOUNDRY, T.sword);
    await ram(caster, 'sword', true);
    await mint(FOUNDRY, T.gypsum);
    await founderEval(
      FOUNDRY,
      `return (() => { const here = self.getContainer().getContents();` +
        ` const c = here.find(o => o.getTemplatePath() === '/trade/ceramics/thing/plaster-case');` +
        ` if (!c) return 'no case';` +
        ` c.setBulkMaterial('interior', StuffApi.findByTemplatePath('/trade/ceramics/idea/material/plaster-slurry'));` +
        ` c.setBulkAmount('interior', c.getBulkAmount('interior').constructor.of(1, 'L'));` +
        ` c.reconcileSetting(); return 'case filled'; })()`,
    );
    // Five turns: past half the thread, so a sixth reads "hard down" only
    // if the five survived.
    for (let i = 0; i < 5; i++) await doing(caster, 'turn "tile press"');
    const handle = caster.handle;
    for (const s of sessions) s.close();
    await new Promise((r) => setTimeout(r, 8_000)); // let the logout saves land

    try {
      copyFileSync(WIRE_LOG, `${WIRE_LOG}.before-restart`);
    } catch {
      /* no log to keep */
    }
    const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();

    const back = await Session.open(handle, { startLocation: FOUNDRY, wizard: true });
    try {
      await back.drainProse();
      const flask = await examine(back, 'flask');
      expect(flask, `the rammed flask after a restart: ${flask}`).toMatch(/impression of an arming sword/i);
      expect(flask, 'its riser').toMatch(/riser/i);
      const caseRead = await examine(back, 'case');
      expect(caseRead, `the case after a restart: ${caseRead}`).toMatch(/setting|set|plaster/i);
      const press = await say(back, 'turn "tile press"');
      expect(press, `the press kept its turns: ${press}`).toMatch(/hard down|as tight/i);
      const key = await examine(back, 'me:i:brass');
      expect(key, `the cast key after a restart: ${key}`).toMatch(/brass cast of a key/i);
      const unlocked = await run(back, 'unlock door');
      expect(refusedFor(unlocked.r), `the cast key still turns the lock: ${unlocked.said}`).toBeNull();
    } finally {
      back.close();
    }
  }, 2_400_000);
});
