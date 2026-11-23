/**
 * ⭐⭐ The test-world-lifecycle drive (requirements § The drive, steps 5a, 6
 * and 8; plan D9). Steps 1 and 7 are the fixture pack's own drive
 * (`packages/content/test-fixtures/wire/scaffold.wire.test.ts`); steps 2–5
 * are runs of the runner and live in `tools/wire-indifference`.
 *
 *   5a  the Governor retires money from an account: the balance and the
 *       supply fall by it, the dashboard shows it, the holder is told, and
 *       more than the account holds is refused;
 *   6   a loaded world stops and comes back: players stand in the scaffold
 *       holding things, the harness restarts the world, the stop waited for
 *       the save and reported it, the new world carries the heap flag, and
 *       each player is where they stood, holding what they held;
 *   8   the rule holds: a drive that names a locality is refused at the gate,
 *       and the count is reported under its ceiling.
 *
 * Runs twice on one world: everything it consumes it stages.
 */

import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { describe as suite, it, expect, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  isOwnedTestWorld,
  hand,
  restartWorld,
  listenerPidOf,
  fundedAccount,
  standIn,
  uniqueHandle,
  BANK,
  HALL,
  PLAZA,
  SHOP,
  NOTEBOOK,
  ROPE,
} from '../src/harness';

declareFile({ file: 'test-world-lifecycle.wire.test.ts', packs: ['platform', 'test-fixtures'] });

const squash = (t: string): string => t.replace(/\s+/g, ' ').trim();
const SERVER = fileURLToPath(new URL('../../server', import.meta.url));
const GOVERNOR = 'central-bank-governor';

const open: Session[] = [];
afterAll(() => {
  for (const s of open) s.close();
});

/** The money supply `reserve supply` reports, in minor units. */
async function supply(gov: Session): Promise<number> {
  const said = squash(await gov.prose('reserve supply'));
  const m = /supply[^0-9]*(\d+)/i.exec(said);
  if (!m) throw new Error(`reserve supply said ${JSON.stringify(said.slice(0, 400))}`);
  return Number(m[1]);
}

suite.skipIf(!isOwnedTestWorld())('5a — the Governor retires money to the reserve', () => {
  it('⭐ the balance and the supply fall by it, the record shows it, the holder is told; too much is refused', async () => {
    const handle = uniqueHandle('holder');
    await fundedAccount(handle, 500, 'lifecycle 5a');
    const holder = await Session.open(handle, { startLocation: BANK });
    open.push(holder);
    const gov = await standIn(BANK, 'gov', { offices: [GOVERNOR] });
    open.push(gov);
    try {
      const before = await supply(gov);
      await holder.drainProse();
      const r = squash(await gov.prose(`reserve retire 200 from ${handle} "a mistaken mint"`));
      expect(r, 'the governor is told').toMatch(/retires 200 zorkmids from .*a mistaken mint/i);
      expect(squash(await holder.listen(4_000, { sinceDrain: true })), 'the holder is told').toMatch(
        /retired 200 zorkmids from your account.*a mistaken mint/i,
      );
      expect(squash(await holder.prose('bank')), 'the balance fell by it').toMatch(/\b300\b/);
      expect(await supply(gov), 'the supply fell by it').toBe(before - 200);
      expect(squash(await gov.prose('reserve')), 'the dashboard line').toMatch(/retired on the record: *\d+ zorkmids/i);

      const refused = squash(await gov.prose(`reserve retire 1000 from ${handle} "too much"`));
      expect(refused, 'more than the account holds').toMatch(/holds 300 zorkmids; the reserve can't retire 1000 zorkmids/i);
      expect(squash(await holder.prose('bank')), 'nothing was taken').toMatch(/\b300\b/);
    } finally {
      gov.close();
      const founder = await Session.open('founder', { startLocation: BANK });
      await founder.cmd(`office vacate ${GOVERNOR}`);
      founder.close();
    }
  });
});

suite.skipIf(!isOwnedTestWorld())('6 — a loaded world stops and comes back', () => {
  it('⭐ the stop waits for the save; the heap flag is armed; everyone is where they stood, holding what they held', async () => {
    const stands: Array<{ handle: string; place: string; holds: string; word: string }> = [
      { handle: uniqueHandle('stayer'), place: PLAZA, holds: NOTEBOOK, word: 'notebook' },
      { handle: uniqueHandle('stayer'), place: HALL, holds: ROPE, word: 'rope' },
      { handle: uniqueHandle('stayer'), place: SHOP, holds: NOTEBOOK, word: 'notebook' },
      { handle: uniqueHandle('stayer'), place: BANK, holds: ROPE, word: 'rope' },
    ];
    const sessions: Session[] = [];
    const where = new Map<string, string>();
    for (const st of stands) {
      const s = await Session.open(st.handle, { startLocation: st.place });
      sessions.push(s);
      await hand(s, st.holds);
      expect(await s.prose('inventory')).toMatch(new RegExp(st.word, 'i'));
      where.set(st.handle, String((await s.queryOne('here', 'ref'))?.displayName ?? ''));
    }

    // Connected through the stop: the shutdown save is what captures them.
    const stop = await restartWorld();
    for (const s of sessions) s.drop();
    expect(stop, 'something was listening').not.toBeNull();
    expect(stop!.killed, `killed at the grace after ${stop!.exitedMs} ms`).toBe(false);
    expect(stop!.report, 'the world wrote its shutdown report').not.toBeNull();
    expect(stop!.report!.failed ?? 0, 'hosts that failed to save').toBe(0);
    expect(stop!.report!.captured, 'hosts captured').toBeGreaterThanOrEqual(stands.length);

    const pid = listenerPidOf();
    expect(pid, 'the new world listens').not.toBeNull();
    // The listener is node under tsx: the flag is on its own command line.
    const cmdline = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').join(' ');
    expect(cmdline, 'the heap diagnostic is armed').toMatch(/--heapsnapshot-near-heap-limit=1/);

    for (const st of stands) {
      // No startLocation: the body comes back where it stood.
      const back = await Session.open(st.handle);
      open.push(back);
      const here = await back.queryOne('here', 'ref');
      expect(String(here?.displayName ?? ''), `${st.handle} stood in ${st.place}`).toBe(where.get(st.handle));
      expect(await back.prose('inventory'), `${st.handle} held a ${st.word}`).toMatch(new RegExp(st.word, 'i'));
    }
  }, 1_500_000);
});

suite('8 — the rule holds', () => {
  const run = (...extra: string[]) =>
    spawnSync('npx', ['tsx', 'scripts/check-wire-content.ts', ...extra], {
      cwd: SERVER,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '' },
    });

  it('⭐ a drive that names a locality is refused at the gate', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wire-content-'));
    const planted = join(dir, 'planted.wire.test.ts');
    writeFileSync(planted, "const SQUARE = '/world/" + "terminus/market/square';\n");
    const r = run(planted);
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stderr).toMatch(/ROSE above its ceiling/);
  });

  it('the count is reported, and is at or under its ceiling', () => {
    const r = run();
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const m = /(\d+) wire file\(s\) name placeholder content \(ceiling (\d+)/.exec(r.stdout);
    expect(m, r.stdout).not.toBeNull();
    expect(Number(m![1])).toBeLessThanOrEqual(Number(m![2]));
  });
});
