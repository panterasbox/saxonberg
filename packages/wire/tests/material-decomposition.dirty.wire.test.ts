/**
 * The material decomposition drive (material-decomposition W4) — the
 * blocking half of the requirements' drive, against the running game. No
 * step needs the clock, so there is no soak drive.
 *
 * What it walks (requirements § The drive):
 *  1. goods of oak, iron, bronze, gin, lye and salt read as before;
 *  2. gin smells, iron does not;
 *  7. lye is not food — drinking it refuses or harms; salt tastes salty;
 *  8. the assay reads iron as an element and bronze as a mixture;
 *  9. the wiki's capability and kind pages list their materials;
 * 11. after a restart, 1, 2 and 7 read back the same.
 *
 * Steps 3–6 (fire, smelt, kiln, bake) are the sibling drives' — fire,
 * metal chain, ceramics and cooking read the same capabilities through the
 * same verbs, and are re-run beside this file for the drive record. Step 10
 * (a new row, no code) is proved by `lint:material-kinds` + the installer
 * test, not here: it is an authoring act, not a player's.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CommandResult } from '../src/harness';
import { Session, declareFile, uniqueHandle, isOwnedTestWorld, hand } from '../src/harness';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT } from '../src/runner/boot';

export const DIRTY_REASON =
  'hands the driver an oak washboard, a fork, a bronze breastplate, a bottle of gin, a flask of lye ' +
  'and salt through the test seam, and restarts the world';

declareFile({
  file: 'material-decomposition.dirty.wire.test.ts',
  packs: ['platform', 'base-library', 'generic-objects', 'trade-distilling', 'trade-chandlery', 'terminus'],
  dirtyReason: DIRTY_REASON,
});

const SQUARE = '/world/terminus/market/square';
const GOODS = {
  oak: '/stuff/thing/fixture/washboard',
  iron: '/stuff/thing/cutlery/table-fork',
  bronze: '/stuff/thing/armor/bronze-breastplate',
  gin: '/trade/distilling/thing/gin',
  lye: '/trade/chandlery/thing/lye-flask',
  salt: '/stuff/thing/salt-crystals',
};

let handle = '';
let p: Session | null = null;
const record: string[] = [];

function note(line: string): void {
  const flat = line.replace(/\s+/g, ' ').trim();
  record.push(flat);
  // eslint-disable-next-line no-console
  console.log(`[material drive] ${flat}`);
}

function refusedFor(r: { notes: readonly unknown[] }): string | null {
  const n = (r.notes as Array<{ kind?: string; reason?: string; detail?: string }>).find((x) =>
    ['controller-rejected', 'command-rejected', 'validator-failed', 'mql-error', 'empty-result', 'target-declined'].includes(
      x.kind ?? '',
    ),
  );
  return n ? (n.reason ?? n.detail ?? n.kind ?? null) : null;
}

async function say(text: string): Promise<{ r: CommandResult; said: string }> {
  const r = await p!.cmd(text);
  const said = await r.said();
  note(`${text} → ${refusedFor(r) ?? 'ok'} · ${said.slice(0, 300)}`);
  return { r, said };
}

/** The taste of salt — tasting BITES it, so it is read by its words, never compared whole. */
async function tasteSalt(): Promise<string> {
  return (await say('taste salt')).said;
}

/** What the player reads of each good, before and after the restart (reads only — nothing here changes a good). */
const before: Record<string, string> = {};

async function readings(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const word of ['washboard', 'fork', 'breastplate', 'gin', 'lye', 'salt']) {
    const { r, said } = await say(`look ${word}`);
    expect(refusedFor(r), `look ${word}: ${said}`).toBeNull();
    out[word] = said;
  }
  out['smell gin'] = (await say('smell gin')).said;
  return out;
}

beforeAll(async () => {
  handle = uniqueHandle('matter');
});

afterAll(() => {
  p?.close();
  // eslint-disable-next-line no-console
  console.log(`\n[material drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

suite.skipIf(!isOwnedTestWorld())('the material decomposition — blocking drive', () => {
  it('1. goods of each kind read as before', async () => {
    p = await Session.open(handle, { startLocation: SQUARE });
    await p.drainProse();
    for (const t of Object.values(GOODS)) await hand(p, t);
    // A sealed bottle gives nothing to a nose; open it once, before any read,
    // so the reads before and after the restart see the same bottle.
    await say('open gin');
    Object.assign(before, await readings());
    expect(before.fork).toMatch(/fork/i);
    expect(before.gin).toMatch(/gin/i);
  });

  it('2. gin smells; iron does not', async () => {
    expect(before['smell gin']).not.toMatch(/nothing|no smell|can't smell/i);
    const fork = await say('smell fork');
    expect(fork.said).not.toMatch(/juniper|spirit/i);
  });

  it('7. lye is not food — it burns on the way down; salt tastes salty', async () => {
    // ⚠ Its own body: the burn lands on the HEAD and dims the eyes, and the
    // restart step reads the main body's goods by sight.
    const main = p;
    p = await Session.open(uniqueHandle('lye'), { startLocation: SQUARE });
    await p.drainProse();
    await hand(p, GOODS.lye);
    const { r, said } = await say('drink lye');
    p.close();
    p = main;
    expect(said).not.toMatch(/refresh|satisf|tasty|delicious/i);
    // ⭐ A caustic burns on the way down (Metabolic → corrodeOnContact), and
    // the wound is a card, not a reply line — `Metabolic.caustic.test.ts`
    // proves the seam fires and that lye feeds no pool. Here: never a meal.
    expect(refusedFor(r) === null || /can't|cannot|won't/i.test(said), said).toBe(true);
    const salt = await tasteSalt();
    expect(salt, `taste salt: ${salt}`).toMatch(/salty/i);
  });

  it('8. the assay: iron an element, bronze a mixture', async () => {
    const iron = await say('analyze chemistry fork');
    expect(iron.said, iron.said).toMatch(/symbol: Fe/);
    const bronze = await say('analyze chemistry breastplate');
    expect(bronze.said, bronze.said).not.toMatch(/symbol:/);
    expect(bronze.said, bronze.said).toMatch(/copper|tin|Cu|Sn/i);
  });

  it('9. the wiki: a capability page lists what burns; a kind page lists the metals', async () => {
    const burning = await say('wiki read main:material-combustion');
    expect(refusedFor(burning.r), burning.said).toBeNull();
    expect(burning.said).toMatch(/oak/i);
    expect(burning.said).not.toMatch(/\[wiki:/);
    const metal = await say('wiki read main:material-kind-metal');
    expect(metal.said).toMatch(/iron/i);
    expect(metal.said).toMatch(/bronze/i);
  });

  it('11. after a restart, the goods read, smell and taste the same', { timeout: 1_500_000 }, async () => {
    p?.close();
    p = null;
    await new Promise((r) => setTimeout(r, 8_000)); // let the logout save land
    const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();
    p = await Session.open(handle, { startLocation: SQUARE });
    await p.drainProse();
    const after = await readings();
    for (const [k, v] of Object.entries(before)) {
      // A good tasted since reads "someone has taken a bite of it" — that
      // the bite survived is the restart working, not a difference.
      // The street goes on around a reader: an arrival, a departure, the cold.
      const strip = (t: string | undefined) =>
        (t ?? '')
          .replace(/\s*Someone has taken a bite of it\./g, '')
          .replace(/[^.\n]*\b(arrives from|leaves to)\b[^.\n]*\./g, '')
          .replace(/You're shivering\./g, '')
          // Smell rides the AIR (source → air → nose): how strong it is
          // follows the room and how long the bottle has stood open; WHAT it
          // smells of is the material's, and that is what must survive.
          .replace(/\bsmells \w+ of\b/g, 'smells of')
          .replace(/\s+/g, ' ')
          .trim();
      expect(strip(after[k]), `${k} after the restart`).toBe(strip(v));
    }
    expect(await tasteSalt(), 'salt tastes the same after the restart').toMatch(/salty/i);
    await stopOwnedWorld();
  });
});
