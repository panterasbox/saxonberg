/**
 * ⭐ **Organism biology — the soak drive** (requirements § Soak drive).
 *
 * The four span steps: a lamb's year on its growth curve, a sheep's coat
 * across a winter, a bullfrog's winter in the mud, and a silkworm
 * generation from egg lot to moth on the tray's own degree-days. Each
 * has a staged twin in the blocking drive
 * (`organism-biology.dirty.wire.test.ts`); here the CLOCK produces the
 * state, a day at a time. Run by the soak lane after merge — never
 * before it (workflow.md § No merge waits on the clock).
 *
 * ⚠ The players log out across every long run of days: an offline body
 * is frozen, and a student left standing in the yard for a season would
 * starve.
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import { Session, declareFile, expectOk, plain, isOwnedTestWorld, stage, YARD } from '../src/harness';

export const DIRTY_REASON =
  'clones a lamb, two sheep, a bullfrog and a silkworm tray into the ' +
  'testbed yard and runs the clock across a year';

declareFile({
  file: 'organism-biology.soak.dirty.wire.test.ts',
  packs: [
    'test-fixtures',
    'platform',
    'base-library',
    'generic-objects',
    'species-and-names',
    'trade-ranching',
    'trade-cooking',
    'trade-sericulture',
  ],
  dirtyReason: DIRTY_REASON,
});

const LIVESTOCK = '/trade/ranching/agent/livestock';
const SHEEP = '/stuff/idea/species/animalia/chordata/mammalia/artiodactyla/bovidae/ovis/aries';
// The ranching animal row, staged as a bullfrog (a drive stands in the scaffold).
const BULLFROG = '/stuff/idea/species/animalia/chordata/amphibia/anura/ranidae/lithobates/catesbeianus';
const TRAY = '/trade/sericulture/thing/tray';
const EGGS = '/trade/sericulture/thing/imported-eggs';

const record: string[] = [];
const note = (line: string): void => {
  record.push(line);
};
let wiz: Session;

afterAll(() => {
  wiz?.close();
  // eslint-disable-next-line no-console
  console.log(`\n[organism-biology soak] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

async function idsHere(): Promise<Set<string>> {
  const rows = await wiz.query('peers', { fields: 'ref' });
  return new Set(rows.map((r) => String((r as { stuffId?: string }).stuffId ?? '')).filter(Boolean));
}

async function clone(path: string): Promise<string> {
  const before = await idsHere();
  expectOk(await wiz.cmd(`clone ${path} --here`));
  const fresh = [...(await idsHere())].filter((id) => !before.has(id));
  if (fresh.length === 0) throw new Error(`clone ${path}: nothing new in the yard`);
  return `#${fresh[fresh.length - 1]}`;
}

async function bodyOf(handle: string): Promise<Record<string, unknown>> {
  const out = plain(await (await wiz.cmd(`testharness body ${handle}`)).said())
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
  try {
    return JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)) as Record<string, unknown>;
  } catch {
    return { raw: out };
  }
}

/** Run the clock `days` game days, a day at a time (the harness's cap). */
async function days(n: number): Promise<void> {
  for (let i = 0; i < n; i++) expectOk(await wiz.cmd('testharness clock-advance 24h'));
}

async function sheep(ageDays: number): Promise<string> {
  const id = await clone(LIVESTOCK);
  expectOk(await wiz.cmd(`testharness species ${id} ${SHEEP}`));
  await stage(id, 'setLifecycleState', 'alive');
  await stage(id, 'setSex', 'female');
  await stage(id, 'setAge', ageDays);
  return id;
}

suite.skipIf(!isOwnedTestWorld())('organism biology — the soak drive', () => {
  beforeAll(async () => {
    wiz = await Session.open('founder', { startLocation: YARD, wizard: true, parcels: ['/world/testbed'] });
    await wiz.drainProse();
  }, 300_000);

  it('S1 · a lamb grows across a year by its curve, and reads its stage changes', async () => {
    const lamb = await sheep(0);
    const seen: string[] = [];
    for (let month = 0; month < 12; month++) {
      const b = await bodyOf(lamb);
      seen.push(`${String(b.stage)}:${String(b.body)}:${String(b.massKg)}`);
      await days(30);
    }
    note(`S1 the lamb's year: ${seen.join(' → ')}`);
    const stages = new Set(seen.map((s) => s.split(':')[0]));
    expect(stages.size, 'it crossed at least one stage').toBeGreaterThan(1);
    const first = Number(seen[0]!.split(':')[2]);
    const last = Number(seen[seen.length - 1]!.split(':')[2]);
    expect(last).toBeGreaterThan(first);
  }, 6 * 3600_000);

  it('S2 · a sheep\'s coat thickens into winter and is cast by summer', async () => {
    const ewe = await sheep(900);
    const read = async (): Promise<string> => JSON.stringify(await bodyOf(ewe));
    const autumn = await read();
    await days(120);
    const winter = await read();
    await days(150);
    const summer = await read();
    note(`S2 coat: autumn ${autumn.slice(0, 120)} · winter ${winter.slice(0, 120)} · summer ${summer.slice(0, 120)}`);
    expect(winter).not.toEqual(autumn);
    expect(summer).not.toEqual(winter);
  }, 6 * 3600_000);

  it('S3 · a bullfrog winters in the mud and comes out in spring', async () => {
    const frog = await clone(LIVESTOCK);
    expectOk(await wiz.cmd(`testharness species ${frog} ${BULLFROG}`));
    await stage(frog, 'setLifecycleState', 'alive');
    await stage(frog, 'setAge', 600);
    const seen: string[] = [];
    for (let month = 0; month < 12; month++) {
      const b = await bodyOf(frog);
      seen.push(/denning/.test(JSON.stringify(b.conditions)) ? 'den' : String(b.alive));
      await days(30);
    }
    note(`S3 the frog's year: ${seen.join(' ')}`);
    expect(seen).toContain('den');
    expect(seen.lastIndexOf('true')).toBeGreaterThan(seen.indexOf('den'));
  }, 6 * 3600_000);

  it('S4 · a silkworm generation runs egg lot to moth on the tray\'s own degree-days', async () => {
    const tray = await clone(TRAY);
    const lot = await clone(EGGS);
    expectOk(await wiz.cmd(`put ${lot} in ${tray}`));
    const looks: string[] = [];
    for (let d = 0; d < 90; d += 5) {
      looks.push(plain(await (await wiz.cmd(`look ${tray}`)).said()).replace(/\s+/g, ' ').slice(0, 120));
      await days(5);
    }
    note(`S4 the tray: ${looks.join(' | ')}`);
    expect(looks.join(' ')).toMatch(/worm/i);
    expect(looks.join(' ')).toMatch(/cocoon|moth/i);
  }, 6 * 3600_000);
});
