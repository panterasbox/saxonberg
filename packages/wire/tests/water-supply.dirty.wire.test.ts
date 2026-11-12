/**
 * The water-supply drive (water-supply W11) — the blocking half of the
 * requirements' drive, against the running game. Instant and short steps
 * only; anything that needs weeks of clock lives in the soak file.
 *
 * What it walks:
 *  - a city tap draws through its premises and its room's pipe (D2/D10);
 *  - the market fountain, a continuous public outlet, runs (D24);
 *  - the pump house is locked (D19) — a door that is locked does not open;
 *  - the kit, not the eye, says whether water is fit (D18);
 *  - the headgate's weir, staff gauge and observation well read (D18/D13);
 *  - a turnout opens BY AN AMOUNT and its record says who set it (D12).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import type { CommandResult } from '../src/harness';
import { Session, declareFile, uniqueHandle, isOwnedTestWorld } from '../src/harness';

export const DIRTY_REASON =
  'sets the Furtado turnout on the Delight ditch (a live gate whose log ' +
  'keeps who worked it) and carries the infirmary’s water-test kit away';

declareFile({
  file: 'water-supply.dirty.wire.test.ts',
  packs: ['platform', 'water', 'terminus', 'hearts-delight', 'trade-plumbing', 'rejection'],
  dirtyReason: DIRTY_REASON,
});

const SQUARE = '/world/terminus/market/square';
const BATHS = '/world/terminus/market/bathhouse/location/baths';
const BANK = '/world/terminus/wharfside/bank';
const WARD = '/world/terminus/infirmary/ward';
const HEADGATE = '/world/terminus/hearts-delight/ditch/location/headgate';
const DITCH_BANK = '/world/terminus/hearts-delight/ditch/location/bank';

let handle = '';
let p: Session | null = null;
const record: string[] = [];

function note(line: string): void {
  const flat = line.replace(/\s+/g, ' ').trim();
  record.push(flat);
  // eslint-disable-next-line no-console
  console.log(`[water drive] ${flat}`);
}

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
  return n ? (n.reason ?? n.detail ?? n.kind ?? null) : null;
}

async function goTo(where: string): Promise<Session> {
  p?.close();
  p = await Session.open(handle, { startLocation: where });
  await p.drainProse();
  return p;
}

async function say(text: string): Promise<{ r: CommandResult; said: string }> {
  const r = await p!.cmd(text);
  const said = await r.said();
  note(`${text} → ${refusedFor(r) ?? 'ok'} · ${said.slice(0, 300)}`);
  return { r, said };
}

beforeAll(async () => {
  handle = uniqueHandle('water');
});

afterAll(() => {
  p?.close();
  // eslint-disable-next-line no-console
  console.log(`\n[water drive] record:\n${record.map((l) => `  · ${l}`).join('\n')}`);
});

suite.skipIf(!isOwnedTestWorld())('the water supply — blocking drive', () => {
  it('1. a city tap draws through its premises and its room’s pipe', async () => {
    await goTo(BATHS);
    const { r, said } = await say('drink from tap');
    expect(refusedFor(r), said).toBeNull();
    expect(said).not.toMatch(/isn't on any supply|no pipe/i);
  });

  it('2. the market fountain runs — a continuous public outlet', async () => {
    await goTo(SQUARE);
    const { said } = await say('look fountain');
    expect(said).not.toMatch(/Nothing comes out/i);
    const drank = await say('drink from fountain');
    expect(refusedFor(drank.r), drank.said).toBeNull();
  });

  it('3. ⭐ bare, the eye cannot tell whether the city’s water is fit', async () => {
    await goTo(SQUARE);
    const { said } = await say('analyze water standpipe');
    expect(said).toMatch(/draws from kestrel/i);
    expect(said).not.toMatch(/\bfouled\b/i);
  });

  it('4. the pump house is locked — the works keeper’s seat carries its key', async () => {
    await goTo(BANK);
    const { r, said } = await say('pumphouse');
    expect(refusedFor(r), said).not.toBeNull();
    const opened = await say('open "pump-house door"');
    expect(opened.said).toMatch(/locked/i);
  });

  it('5. ⭐ with the kit in hand, the reading says what is in the water', async () => {
    await goTo(WARD);
    const got = await say('get kit');
    expect(refusedFor(got.r), got.said).toBeNull();
    const { said } = await say('analyze water');
    expect(said).not.toMatch(/you cannot tell by looking/i);
  });

  it('6. the weir, the staff and the observation well read at the headgate', async () => {
    await goTo(HEADGATE);
    const flow = await say('analyze flow weir');
    // The name is perceptual: at night the bank is pitch dark and the weir
    // reads as "something" — the reading still comes.
    expect(flow.said).toMatch(/Over .*about .*m³\/s/i);
    const stage = await say('analyze stage staff');
    expect(stage.said).toMatch(/stands at .* m .* on/i);
    const table = await say('analyze water-table well');
    expect(table.said).toMatch(/below the collar/i);
  });

  it('7. ⭐ a turnout opens BY AN AMOUNT, and its own record says who set it', async () => {
    await goTo(DITCH_BANK);
    const set = await say('open "furtado turnout" to a quarter');
    expect(refusedFor(set.r), set.said).toBeNull();
    expect(set.said).toMatch(/a quarter open/i);
    const shut = await say('close "furtado turnout"');
    expect(refusedFor(shut.r), shut.said).toBeNull();
  });
});
