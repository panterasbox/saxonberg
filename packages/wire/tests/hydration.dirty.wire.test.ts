/**
 * Hydration — ⭐⭐ **the drive.**
 *
 * The requirements' script is nine steps. What a socket can settle is
 * here; what it cannot is named below with where it lives instead,
 * because **a drive that quietly skips a step is worse than one that says
 * it skipped it.**
 *
 * ⭐ The sentence the build exists for: *filling a thing in is two
 * different jobs wearing one name.* **Authored** — what a row says, keyed
 * on a template path, no capture side — and **remembered** — what the
 * world kept about this instance, keyed on its identity, with a capture
 * counterpart. Every assertion here is one half of that: an author can
 * SEE what a row will apply and what an instance will remember (step 2),
 * and an ordinary clone still arrives filled in (the regression step).
 *
 * ⚠ What a socket cannot settle, and where each piece lives instead:
 *
 *  - ⚠⚠ **steps 1 and 3 — authoring a row WITH DATA.** `write -c`'s
 *    `data` is a structured **payload**, not a command-line option, and
 *    this harness's `cmd()` sends `{ text }` only — there is no payload
 *    channel on the socket at all. So neither "create a row full of data
 *    and clone it" nor "write a key nobody applies and be told" is
 *    reachable from here, and extending the harness to send payloads is
 *    its own change rather than this build's. Settled at the mechanism:
 *    `StudioLogic.test.ts` (the create's `committed` message names what
 *    the row will apply), `WriteController.test.ts`, and
 *    `api/__tests__/template.describeFill.test.ts` for the three lists.
 *    The protowizard's class-less-child door is
 *    `TemplateLogic.codeGate.test.ts`. Both are browser walks.
 *  - **steps 4, 5, 9's real RESTART** — one boot per wire run, by
 *    design. `belief/__tests__/persistence.test.ts` drives the shape a
 *    reboot produces for a singleton: destruct, re-mint, and the regard
 *    comes back from the collection with **no record and no hook**. The
 *    kept animal's half is `KeptAnimalPersistence.test.ts`, unchanged in
 *    behaviour by this build — which is exactly the point of step 5.
 *    Relog-after-restart is the browser walk.
 *  - ⚠⚠ **step 8, the coin's CMS go-live** — a REST write plus a
 *    go-live, two subsystems away from a socket. It is the MONEY step,
 *    so it is driven at the mechanism through the real
 *    `restoreFromTemplate`: `api/__tests__/template.snapshotRestore.test.ts`
 *    puts a live stack at 500, takes a row authoring 1 live, and asserts
 *    500 — while an ordinary edit on the same row still lands.
 *  - **step 7's restart between clones** — same one-boot limit. The
 *    ledger-owned once-ness is `TemplateApplier.seedOnce.test.ts`.
 *
 * ⭐ What IS here is the author-facing read, and it is the step worth
 * driving over a socket: `cat` answers *what will fill this row's
 * instances in* — which keys apply, which nobody applies, which field is
 * birth-only, and what the instance will remember from a source the row
 * never mentions. None of that was answerable before.
 *
 * ⚠ DIRTY only because a wizard session exists; it writes no content.
 * (The file keeps the `.dirty.` name and a reason rather than claiming
 * to be clean on a technicality — a wizard in the world is a fact the
 * next run can see.)
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  plain,
} from '../src/harness';

export const DIRTY_REASON =
  'opens a wizard session (a character with code trust in the world); ' +
  'writes no content';

declareFile({
  file: 'hydration.dirty.wire.test.ts',
  packs: ['saxonberg-lounge', 'terminus', 'generic-objects', 'world-seed'],
  dirtyReason: DIRTY_REASON,
});

const open: Session[] = [];
let wiz: Session;

async function say(s: Session, cmd: string): Promise<string> {
  return plain(await (await s.cmd(cmd)).said());
}

beforeAll(async () => {
  wiz = await Session.open(uniqueHandle('hyd-wiz'), { wizard: true });
  open.push(wiz);
});

afterAll(async () => {
  for (const s of open) await s.close();
});

suite('step 2 — an author reads what will fill a row in', () => {
  it('⭐⭐ `cat` names the keys that APPLY, and the birth-only one', async () => {
    const said = (await say(wiz, 'cat /stuff/thing/Coin')).toLowerCase();
    // ⚠ The assertion that can fail, and the one worth the whole line.
    // Before this build `cat` printed the author's keys plus a
    // `hydratorClass:` line — a strategy name with one value
    // project-wide — and said nothing about which keys actually land.
    expect(said).toContain('applies:');
    expect(said).toContain('keywords');
    expect(said).toContain('quantity');
    // ⭐⭐ And `quantity` is marked, because that mark is the money fix:
    // a row's authored count is right for a stack being MINTED and
    // catastrophic for a live one. Going live on this row used to reset
    // every coin stack in the world to one.
    expect(said).toMatch(/quantity \(birth-only\)/);
    // The retired field is gone from the surface entirely.
    expect(said).not.toContain('hydratorclass');
  });

  it('⭐⭐ and names what an instance will REMEMBER, which the row never mentions', async () => {
    // The half an author had no way to see at all. A player body's
    // beliefs live in the `beliefs` collection because its composition
    // says so — nothing in the row does.
    const said = (await say(wiz, 'cat /platform/agent/PrimaryAvatar')).toLowerCase();
    expect(said).toContain('remembers:');
    expect(said).toContain('beliefs');
  });

  it('⭐ “nothing” reads as nothing, out loud', async () => {
    // An absent line is indistinguishable from a surface that forgot to
    // print one, which is the failure shape this whole build is about.
    // The applier's own row is the honest example: `data: {}`, no
    // sources, nothing to say — so it says that.
    const said = (await say(wiz, 'cat /platform/idea/TemplateApplier')).toLowerCase();
    expect(said).toMatch(/fills:\s+nothing/);
  });
});

suite('the regression step — nothing about an ordinary clone moved', () => {
  it('⭐ a lounge room still arrives with its authored prose and its floor', async () => {
    // 1,528 rows lost a line in this build. The cheapest honest check
    // that the content step still runs is that an ordinary authored room
    // still reads as itself — its `data` applied, its floor minted by
    // `Location.onCreate`, both through the renamed applier.
    const player = await Session.open(uniqueHandle('hyd-play'), {
      startLocation: '/world/lounge/location/bar',
    });
    open.push(player);
    const said = (await say(player, 'look')).toLowerCase();
    expect(said.length).toBeGreaterThan(40);
    for (const fixture of ['back-bar', 'rack']) {
      expect(said, fixture).toContain(fixture);
    }
    // The floor: a place with no floor is a place you cannot stand.
    const floor = (await say(player, 'look floor')).toLowerCase();
    expect(floor.length).toBeGreaterThan(10);
  });
});
