/**
 * ⭐⭐ The crowded-rooms timing drive (crowded-rooms W6/W7, D11/D12) — the
 * blocking drive's TIMED steps, which are honest only on a quiet box.
 *
 * Runs only with `WIRE_QUIET=1` (and `WIRE_BOOT=1`); otherwise every step
 * reports itself skipped, by name. The procedure is in docs/testing.md §
 * The quiet box. The file's first act is the precheck: a busy box is a
 * refusal by name, never a slow green.
 *
 * Steps (requirements § The drive): 1 the idle world · 2 thirty arrive ·
 * 3 one speaks · 4 in turn, then at once · 5 no freeze (the worker-thread
 * `/healthz` sampler across 2–4 and 6–9) · 6 a card you can see · 7 a card
 * you cannot see · 8 a mould in the crowd · 9 thirty leave · 10 a restart ·
 * 11 one hundred, reported.
 */
import { describe as suite, it, expect } from 'vitest';
import {
  declareFile,
  runCrowd,
  CROWD_PLACE,
  Session,
  uniqueHandle,
  hand,
  SERVER_URL,
  quietBoxRefusal,
  foreignMeter,
  restartWorld,
} from '../src/harness';
import type { CrowdRecord } from '../src/harness';
import { APPROACH, listenerPidOf } from '../src/harness';

// ⭐ Stands in the scaffold's plaza (test-world-lifecycle D8): fresh
// characters each run, so it runs twice on one world. ⚠ Its timing bounds
// were first measured among Terminus's cast; the plaza holds one greeter, so
// a reading here is not comparable with a pre-migration record.
declareFile({
  file: 'crowd-timing.wire.test.ts',
  packs: ['platform', 'test-fixtures', 'trade-dairying'],
});

const QUIET = process.env.WIRE_QUIET === '1';
const STAGING = APPROACH;

interface Stats {
  cpu?: { user: number; system: number };
  uptime?: number;
}
async function stats(): Promise<Stats | null> {
  const res = await fetch(`${SERVER_URL()}/stats`).catch(() => null);
  return res?.ok ? ((await res.json()) as Stats) : null;
}
function p95(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)] ?? 0;
}
const listenerPid = listenerPidOf;
/** What the drive found, appended by each step and printed at the end. */
const found: string[] = [];
const say = (line: string): void => {
  found.push(line);
  console.log(`crowd-timing: ${line}`);
};

(QUIET ? suite : suite.skip)(
  QUIET ? 'the crowded-rooms timing drive (quiet box)' : 'the crowded-rooms timing drive — SKIPPED: set WIRE_QUIET=1 on a quiet box (docs/testing.md)',
  () => {
    let thirty: CrowdRecord | null = null;
    /** The mould's looks by one player alone in the plaza: "empty-room time". */
    let emptyLookP95 = 0;

    /** Ten looks at and ten into a hoop dropped by `s`, each timed. */
    async function mouldLooks(s: Session): Promise<number[]> {
      await hand(s, '/trade/dairying/thing/hoop');
      await s.cmd('drop hoop');
      const looks: number[] = [];
      for (let i = 0; i < 10; i++) {
        for (const text of ['look hoop', 'look in hoop']) {
          const t = performance.now();
          await s.cmd(text);
          looks.push(performance.now() - t);
        }
      }
      return looks;
    }
    const handles: string[] = [];
    const placeBefore = new Map<string, string>();

    it('precheck: the box is quiet', () => {
      const refusal = quietBoxRefusal(listenerPid());
      expect(refusal, `box not quiet: ${refusal}`).toBeNull();
    });

    it('1 — an empty world idles under 20% of a core over ten minutes (owner ruling 6)', async () => {
      const foreign = foreignMeter();
      const a = await stats();
      await new Promise((r) => setTimeout(r, 600_000));
      const b = await stats();
      expect(a?.cpu && b?.cpu).toBeTruthy();
      const cores = (b!.cpu!.user + b!.cpu!.system - a!.cpu!.user - a!.cpu!.system) / 1e6 / ((b!.uptime ?? 0) - (a!.uptime ?? 0));
      const f = await foreign();
      say(`idle: ${cores.toFixed(3)} cores; foreign ${f}`);
      expect(f ?? 0, 'inconclusive: more than half a core of foreign CPU').toBeLessThanOrEqual(0.5);
      // ⭐ Owner ruling 6 (2026-11-17): 0.17 of a core accepted against the
      // requirement's 0.15 — the rest is the cast's own work at content's
      // cadence on the call-security floor. The gate holds the ruling.
      expect(cores).toBeLessThan(0.2);

      // ⭐ The baseline step 8 is measured against: the same looks, by one
      // player alone in the plaza ("empty-room time", the requirement's own
      // words). Taken here, before anyone else logs in.
      const alone = await Session.open(uniqueHandle('timing-alone'), { startLocation: CROWD_PLACE });
      emptyLookP95 = p95(await mouldLooks(alone));
      await alone.cmd('get hoop');
      alone.close();
      say(`8 (baseline): look at / into the hoop alone p95 ${Math.round(emptyLookP95)} ms`);
    }, 800_000);

    it('2–9 — thirty arrive, speak, watch a card, look at a mould, leave', async () => {
      thirty = await runCrowd('timing-30', {
        size: 30,
        during: async (crowd) => {
          for (const s of crowd) handles.push(s.handle);
          // Where each stands, read as a player reads it — FIRST, so step 10
          // has its comparison whatever a later step finds.
          for (const s of crowd) {
            const where = await s.queryOne('here', 'ref');
            placeBefore.set(s.handle, String(where?.displayName ?? ''));
          }
          // ── 6: a card you can see. `look` leaves the `here` card live. ──
          const watcher = crowd[0]!;
          await watcher.cmd('look');
          const here = watcher.lastCard<{ instanceId: string; key: string }>('card-opened')
            ?? watcher.lastCard<{ instanceId: string; key: string }>('card-touched');
          const hereId = here?.instanceId ?? '';
          const hereKey = here?.key ?? 'look';
          expect(hereId, 'the here card').not.toBe('');
          const walker = await Session.open(uniqueHandle('timing-walker'), { startLocation: STAGING });
          watcher.clearCaptures();
          const t0 = performance.now();
          await walker.cmd('go southwest');
          const caught6 = await watcher
            .awaitEnvelope<{ subscriptionId: string }>('subscription-delta', (e) => e.subscriptionId === hereId, 2_000)
            .then(() => true, () => false);
          say(`6: on-screen card ${caught6 ? `caught up in ${Math.round(performance.now() - t0)} ms` : 'did NOT catch up within 2 s'}`);
          expect.soft(caught6, '6: an on-screen card shows a change within 2 s').toBe(true);

          // ── 7: a card you cannot see. Minimize it, say so as a client does. ──
          await watcher.cmd(`client-card minimize ${hereKey}`);
          watcher.pauseSubscription(hereId);
          await new Promise((r) => setTimeout(r, 500));
          watcher.clearCaptures();
          for (let i = 0; i < 5; i++) {
            await walker.cmd('go northeast');
            await walker.cmd('go southwest');
          }
          await new Promise((r) => setTimeout(r, 1_000));
          const leaked = watcher
            .envelopesOf<{ subscriptionId?: string }>('subscription-delta')
            .concat(watcher.envelopesOf<{ subscriptionId?: string }>('subscription-result'))
            .filter((e) => e.subscriptionId === hereId);
          expect.soft(leaked, '7: a hidden card receives nothing').toEqual([]);
          const t1 = performance.now();
          watcher.resumeSubscription(hereId);
          const caught7 = await watcher
            .awaitEnvelope<{ subscriptionId: string }>('subscription-result', (e) => e.subscriptionId === hereId, 2_000)
            .then(() => true, () => false);
          say(`7: hidden card received ${leaked.length} envelopes; ${caught7 ? `caught up ${Math.round(performance.now() - t1)} ms after shown` : 'did NOT catch up within 2 s of being shown'}`);
          expect.soft(caught7, '7: a hidden card is current within 2 s of being shown').toBe(true);
          await watcher.cmd(`client-card restore ${hereKey}`);
          walker.close();

          // ── 8: a mould in the crowd — look at it and into it, timed. ──
          const looks = await mouldLooks(crowd[1]!);
          say(`8: look at / into the hoop in the crowd p95 ${Math.round(p95(looks))} ms (alone: ${Math.round(emptyLookP95)} ms)`);
          // "In empty-room time": within half again of the same looks alone.
          expect.soft(p95(looks), '8: a mould looked at in empty-room time').toBeLessThanOrEqual(Math.max(1, emptyLookP95) * 1.5);

          // ── the five logins into the FULL square. ──
          const into: number[] = [];
          for (let i = 0; i < 5; i++) {
            const t = performance.now();
            const s = await Session.open(uniqueHandle(`timing-late${i}`), { startLocation: CROWD_PLACE });
            into.push(performance.now() - t);
            s.close();
          }
          say(`logins into the full plaza: p95 ${Math.round(p95(into))} ms`);
          expect.soft(p95(into), 'logins into the full plaza').toBeLessThan(2_000);
        },
      });
      const r = thirty;
      say(`record: ${JSON.stringify({ logins: r.logins, sayOne: r.sayOne, sayRound: r.sayRound, sayBurst: r.sayBurst, loop: r.loop, foreign: r.foreignCores })}`);
      expect(r.foreignCores ?? 0, 'inconclusive: foreign CPU').toBeLessThanOrEqual(0.5);
      // 3–4: speech.
      expect(r.sayOne.p95).toBeLessThan(250);
      expect(r.sayRound.p95).toBeLessThan(250);
      // 5: no freeze over 100 ms, by the owner's own measure.
      expect(r.loop.over100).toBe(0);
      // 2: logins.
      expect(r.logins.p95).toBeLessThan(2_000);
      // D27's count still holds.
      for (const [speaker, most] of Object.entries(r.greetedOwnMax)) {
        expect(most, `${speaker} greeted one arriver ${most} times`).toBe(1);
      }
    }, 1_800_000);

    it('10 — after a restart thirty log in under 2 s p95 and stand where they quit', async () => {
      expect(handles.length).toBe(30);
      await restartWorld();
      const times: number[] = [];
      const back: Session[] = [];
      for (const h of handles) {
        const t = performance.now();
        back.push(await Session.open(h, {}));
        times.push(performance.now() - t);
      }
      for (const s of back) {
        const here = await s.queryOne('here', 'ref');
        expect(String(here?.displayName ?? ''), `${s.handle} stands where they quit`).toBe(placeBefore.get(s.handle) ?? '?');
      }
      say(`10: logins after restart p95 ${Math.round(p95(times))} ms`);
      for (const s of back) s.close();
      expect(p95(times)).toBeLessThan(2_000);
    }, 1_200_000);

    it('11 — one hundred: the record exists, the load beside it (reported, not gated)', async () => {
      try {
        const r = await runCrowd('timing-100', { size: 100 });
        say(`11: ${JSON.stringify({ logins: r.logins, sayOne: r.sayOne, sayBurst: r.sayBurst, loop: r.loop, box: r.box, foreign: r.foreignCores })}`);
      } catch (err) {
        say(`11: the hundred failed — ${err instanceof Error ? err.message : String(err)}`);
      }
      console.log(`\n── crowd-timing record ──\n${found.join('\n')}\n`);
    }, 3_600_000);
  },
);
