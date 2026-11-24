/**
 * ⭐ The stream-arrival drive (blocking) — the server's half of the path from
 * a carrier's stream into the game, and the instruments a broadcaster drives
 * it with. Every step is `instant` except the two restarts (`staged`).
 *
 *  0  a program: filed, titled, scheduled, three feeds PROVEN by the
 *     attacher's own linked accounts; a stranger refused; a stated channel
 *     that is not yours refused; featured; on air and off; a restart keeps
 *     the program, its feeds, the runner's pointer and the setting
 *  1  `/api/front` answers the named program only where it has that feed
 *  2  a newcomer from Twitch: no aspiration, the plain outfit, the deed
 *  3  … confirmed `--watch` while live: the FIRST snapshot is watch mode
 *     with the program's Twitch feed
 *  4  plain `play` → explore; `play --watch … --youtube` → watch; a
 *     nonsense program → refused, still at the roster; off air → explore
 *  5  a guest with the two socket words arrives watching
 *  6  a restart: the newcomer's outfit kept, mode explore
 *  7  instruments: no `rodney`, no `program`, no `stream` for a fresh body;
 *     the app gives both anywhere; a phone switched off refuses with its
 *     row, the desk runs it; the desk gives both with no app; the sign is
 *     lit only while somebody in its place is on air; a restart keeps the
 *     app, the program and the sign's truth
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  SERVER_URL,
  expectOk,
  restartWorld,
  PLAZA,
  HUT,
  EXITS,
} from '../src/harness';

declareFile({
  file: 'stream-arrival.wire.test.ts',
  packs: ['platform', 'test-fixtures', 'generic-objects'],
});

const PM = 'prime-minister';
const tag = Date.now().toString(36);
/** Program short names: lower-case, unique per run. */
const P0 = `cafe-${tag}`;
const P1 = `kick-${tag}`;
const P2 = `quiet-${tag}`;
const PC = `desk-${tag}`;

/** Linked carrier accounts: each a channel a player PROVES is theirs. */
const ADA = { twitch: `ada${tag}`, kick: `adak${tag}`, youtube: `UCada${tag}` };
const BO = { twitch: `bo${tag}`, kick: `bok${tag}` };

interface Listing {
  name: string;
  title: string;
  live: boolean;
  feeds: Record<string, string>;
  nextShow?: string;
}

async function front(query = ''): Promise<{ show?: Listing }> {
  const res = await fetch(`${SERVER_URL()}/api/front${query}`);
  expect(res.status, `GET /api/front${query}`).toBe(200);
  expect(res.headers.get('set-cookie'), 'the front read sets no cookie').toBeNull();
  return (await res.json()) as { show?: Listing };
}

/** The refusal reason a dispatch carried, if any. */
function reasonOf(r: { notes: unknown[] }): string | null {
  for (const n of r.notes as Array<{ kind?: string; reason?: string }>) {
    if (n.kind === 'refused' || n.kind === 'command-rejected' || n.kind === 'controller-rejected') {
      return n.reason ?? null;
    }
  }
  return null;
}

/** Whether a verb is one the session HAS (an unknown verb is "not a verb you have"). */
async function hasVerb(s: Session, line: string): Promise<boolean> {
  const r = await s.cmd(line);
  return !JSON.stringify(r.notes).includes('unknown-verb');
}

let ada: Session;
let bo: Session;
let pm: Session;
let adaHandle: string;

suite('stream arrival — the program, the arrival, the instruments', () => {
  beforeAll(async () => {
    adaHandle = uniqueHandle('sa-ada');
    ada = await Session.open(adaHandle, { startLocation: PLAZA, linked: ADA });
    bo = await Session.open(uniqueHandle('sa-bo'), { startLocation: PLAZA, linked: BO });
    pm = await Session.open(uniqueHandle('sa-pm'), { startLocation: PLAZA, offices: [PM] });
    // Neither has an instrument yet: the store's Broadcast app is theirs to install.
    expectOk(await ada.cmd('apps install broadcast'));
    expectOk(await bo.cmd('apps install broadcast'));
  }, 180_000);

  afterAll(async () => {
    await pm?.cmd(`config set stream.featuredProgram ""`).catch(() => undefined);
  });

  it('step 0 — a program filed, its feeds proven, featured, on air and off', async () => {
    expectOk(await ada.cmd(`program create ${P0} --title "The Cafe Hour"`));
    expectOk(await ada.cmd(`program schedule ${P0} Saturdays 10am Eastern`));
    for (const c of ['twitch', 'kick', 'youtube']) expectOk(await ada.cmd(`program channel ${P0} ${c}`));
    const about = await (await ada.cmd(`program about ${P0}`)).said();
    expect(about).toContain('The Cafe Hour');
    expect(about).toContain(ADA.twitch);
    expect(about).toContain(ADA.kick);
    expect(about).toContain(ADA.youtube);

    // A stranger with their own Twitch cannot feed somebody's program…
    const stranger = await bo.cmd(`program channel ${P0} twitch`);
    expect(reasonOf(stranger)).toBe('not-your-program');
    // …and cannot claim somebody's channel on their OWN.
    expectOk(await bo.cmd(`program create ${P1}`));
    const notTheirs = await bo.cmd(`program channel ${P1} twitch ${ADA.twitch}`);
    expect(reasonOf(notTheirs)).toBe('not-your-channel');
    expectOk(await bo.cmd(`program channel ${P1} kick`));
    expectOk(await bo.cmd(`program create ${P2}`));

    expectOk(await pm.cmd(`config set stream.featuredProgram ${P0}`));
    let page = await front();
    expect(page.show?.name).toBe(P0);
    expect(page.show?.live).toBe(false);
    expect(page.show?.nextShow).toContain('Saturdays');
    expect(page.show?.feeds).toEqual({ twitch: ADA.twitch, kick: ADA.kick, youtube: ADA.youtube });

    // `rodney` refuses with no program; after `program run` it drives it.
    expect(reasonOf(await ada.cmd('rodney start'))).not.toBeNull();
    expectOk(await ada.cmd(`program run ${P0}`));
    expectOk(await ada.cmd('rodney start'));
    expectOk(await ada.cmd('rodney live'));
    page = await front();
    expect(page.show?.live).toBe(true);
    expectOk(await ada.cmd('rodney off'));
    expect((await front()).show?.live).toBe(false);
  }, 180_000);

  it('step 0 (staged) — a restart keeps the program, its feeds, the pointer and the setting', async () => {
    await restartWorld();
    ada = await Session.open(adaHandle, { startLocation: PLAZA, linked: ADA });
    const page = await front();
    expect(page.show?.name).toBe(P0);
    expect(page.show?.feeds).toEqual({ twitch: ADA.twitch, kick: ADA.kick, youtube: ADA.youtube });
    // No `program run` again: the body still runs it.
    expectOk(await ada.cmd('rodney start'));
    expectOk(await ada.cmd('rodney live'));
    expect((await front()).show?.live).toBe(true);
  }, 300_000);

  it('step 1 — a link names a program only where it has that feed', async () => {
    expect((await front(`?watch=${P1}&carrier=kick`)).show?.name).toBe(P1);
    expect((await front(`?watch=${P1}&carrier=twitch`)).show?.name).toBe(P0);
    expect((await front(`?watch=${P2}&carrier=kick`)).show?.name).toBe(P0);
    expect((await front(`?watch=nope-${tag}&carrier=kick`)).show?.name).toBe(P0);
    expect((await front(`?watch=Not%20A%20Name&carrier=kick`)).show?.name).toBe(P0);
    const bad = await fetch(`${SERVER_URL()}/api/front?channel=${ADA.twitch}`);
    expect(bad.status).toBe(400);
  });

  let newcomerHandle: string;

  it('steps 2–3 — a newcomer from Twitch: the plain outfit, no aspiration, and confirmed --watch arrives watching', async () => {
    newcomerHandle = uniqueHandle('sa-new');
    const newcomer = await Session.embody(newcomerHandle, { name: 'Newcomer' }, {
      from: 'twitch',
      confirm: ` --watch ${P0} --twitch`,
    });
    const state = newcomer.connectionClientState();
    expect(state?.['cockpit.mode'], 'the FIRST snapshot is watch').toBe('watch');
    expect(state?.['cockpit.watch']).toEqual({ platform: 'twitch', channel: ADA.twitch });
    const inv = await (await newcomer.cmd('inventory')).said();
    for (const g of ['shirt', 'trousers', 'shoes']) expect(inv.toLowerCase()).toContain(g);
    const score = await (await newcomer.cmd('score')).said();
    expect(score).not.toMatch(/aspir/i);
    const chronicle = await (await newcomer.cmd('chronicle')).said();
    expect(chronicle).toContain('Embodied as Newcomer');
  }, 180_000);

  it('step 4 — play plainly, play watching on YouTube, a nonsense program refused at the roster', async () => {
    const plain = await Session.openAtRoster(newcomerHandle);
    await plain.session.play(plain.playerId);
    expect(plain.session.connectionClientState()?.['cockpit.mode']).not.toBe('watch');

    const yt = await Session.openAtRoster(newcomerHandle);
    await yt.session.play(yt.playerId, ` --watch ${P0} --youtube`);
    expect(yt.session.connectionClientState()?.['cockpit.mode']).toBe('watch');
    expect(yt.session.connectionClientState()?.['cockpit.watch']).toEqual({ platform: 'youtube', channelId: ADA.youtube });

    const bad = await Session.openAtRoster(newcomerHandle);
    const refused = await bad.session.cmd(`play ${bad.playerId} --watch nonsense --twitch`);
    expect(refused.status).not.toBe('ok');
    expect(await hasVerb(bad.session, 'look'), 'still at the roster').toBe(false);
  }, 180_000);

  it('step 5 — a guest with the two words arrives watching', async () => {
    const guest = await Session.guest({ from: 'kick', watch: P0, carrier: 'kick' });
    expect(guest.connectionClientState()?.['cockpit.mode']).toBe('watch');
    expect(guest.connectionClientState()?.['cockpit.watch']).toEqual({ platform: 'kick', channel: ADA.kick });
    const inv = await (await guest.cmd('inventory')).said();
    expect(inv.toLowerCase()).toContain('shirt');
  }, 120_000);

  it('step 4 (off air) — `--watch` while the program is off the air arrives as usual', async () => {
    expectOk(await ada.cmd('rodney off'));
    const off = await Session.openAtRoster(newcomerHandle);
    await off.session.play(off.playerId, ` --watch ${P0} --twitch`);
    expect(off.session.connectionClientState()?.['cockpit.mode']).not.toBe('watch');
  }, 120_000);

  it('step 6 (staged) — a restart keeps the newcomer dressed, in the usual mode', async () => {
    await restartWorld();
    const back = await Session.openAtRoster(newcomerHandle);
    await back.session.play(back.playerId);
    expect(back.session.connectionClientState()?.['cockpit.mode']).not.toBe('watch');
    const inv = await (await back.session.cmd('inventory')).said();
    for (const g of ['shirt', 'trousers', 'shoes']) expect(inv.toLowerCase()).toContain(g);
  }, 300_000);

  it('step 7 — the instruments: the app, the phone off, the desk, the sign', async () => {
    const cHandle = uniqueHandle('sa-cal');
    const cal = await Session.open(cHandle, { startLocation: PLAZA, linked: { twitch: `cal${tag}` } });
    expect(await hasVerb(cal, 'rodney'), 'no rodney without an instrument').toBe(false);
    expect(await hasVerb(cal, 'program'), 'no program without an instrument').toBe(false);
    expect(await hasVerb(cal, 'stream'), 'stream is no verb for anyone').toBe(false);
    const store = await (await cal.cmd('apps')).said();
    expect(store).toMatch(/broadcast/i);
    expectOk(await cal.cmd('apps install broadcast'));
    expectOk(await cal.cmd(`program create ${PC}`));
    expectOk(await cal.cmd(`program channel ${PC} twitch`));
    expectOk(await cal.cmd(`program run ${PC}`));
    expectOk(await cal.cmd('rodney start'));
    expectOk(await cal.cmd('rodney live'));
    // Anywhere: walk to the approach.
    expectOk(await cal.cmd(`go ${EXITS.plaza.approach}`));
    expectOk(await cal.cmd('rodney away 5m'));
    // The phone off: the verb stays, typing it says why.
    expectOk(await cal.cmd('switch phone off'));
    const off = await cal.cmd('rodney back');
    expect(reasonOf(off)).toBe('aether-off');
    // At the desk (the hut), it runs — the other offer.
    expectOk(await cal.cmd(`go ${EXITS.approach.hut}`));
    expectOk(await cal.cmd('rodney back'));
    const lit = await (await cal.cmd('look sign')).said();
    expect(lit).toMatch(/LIT/);

    // A second character with no app, at the desk: both verbs, not this program.
    const dee = await Session.open(uniqueHandle('sa-dee'), { startLocation: HUT });
    expect(await hasVerb(dee, 'program')).toBe(true);
    expect(reasonOf(await dee.cmd(`program run ${PC}`))).toBe('not-your-program');

    // Walking out on air: still on air, and the window goes dark behind them.
    expectOk(await cal.cmd(`go ${EXITS.hut.approach}`));
    const dark = await (await dee.cmd('look sign')).said();
    expect(dark).toMatch(/dark/i);
    expectOk(await cal.cmd('switch phone on'));
    expectOk(await cal.cmd('rodney off'));

    // A restart: the app still installed, the program intact.
    await restartWorld();
    const again = await Session.open(cHandle, { startLocation: HUT, linked: { twitch: `cal${tag}` } });
    expect(await hasVerb(again, 'rodney')).toBe(true);
    expectOk(await again.cmd(`go ${EXITS.hut.approach}`));
    expect(await hasVerb(again, 'rodney'), 'the app came back with the phone').toBe(true);
    const about = await (await again.cmd(`program about ${PC}`)).said();
    expect(about).toContain(`cal${tag}`);
    const sign = await Session.open(uniqueHandle('sa-eve'), { startLocation: HUT });
    expect(await (await sign.cmd('look sign')).said()).toMatch(/dark/i);
  }, 420_000);
});
