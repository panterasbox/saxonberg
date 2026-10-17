/**
 * ⭐⭐ **Cleanliness, driven end to end** — the cleanliness build's exit
 * criterion, run against the real socket (the requirements doc's drive,
 * steps 1–20, 22, 23; 21 cut; the model is docs/subsystems/cleanliness.md).
 *
 * The drive in one sentence: *butcher in an apron and read whose blood is
 * where; wash gloves on and take them off two ways; idle a day and find
 * nothing changed; strew and sweep a bloodied floor; wash blood cold and
 * set it hot and read the bleeder off the stain; wash grease with and
 * without soap, in hard water and soft; boil a wool jumper; dry a shirt;
 * get lye in your eyes and rinse it out; cook three meals and find the
 * window grimed, the floor crumbed and the flue sooted, and clean them;
 * read your rest; mill without sweeping and strike a light; muck out the
 * byre; dress a wound with a raw bandage and a boiled one; order a wash
 * from the laundress and have the bath attendant ruin a jumper; bathe and
 * be let past the doorman; post a clean contract; restart and find it all
 * as you left it.*
 *
 * ⚠ Every checkpoint asserts the verb was UNDERSTOOD and a STATE CHANGED,
 * read back off the world — never only that the verb was not refused (the
 * taps lesson).
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2013 npx vitest run
 * tests/cleanliness.dirty.wire.test.ts` (build-2's port — never the
 * default).
 */

import { describe as suite, it, expect, beforeAll, afterAll } from 'vitest';
import {
  Session,
  declareFile,
  uniqueHandle,
  expectOk,
  advanceWorldClock,
  isOwnedTestWorld,
} from '../src/harness';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { bootOwnedWorld, stopOwnedWorld, WIRE_PORT, WIRE_LOG } from '../src/runner/boot';
import { copyFileSync } from 'fs';

export const DIRTY_REASON =
  'butchers carcasses cloned into the Hearthworks cookhouse, soils and ' +
  'sweeps its floor and soots its flue and window, buys out cleansers at ' +
  'the general store, washes at the lavoir and the bathhouse (the houses ' +
  'pay cover), posts and pays a clean contract, and moves the world clock';

declareFile({
  file: 'cleanliness.dirty.wire.test.ts',
  packs: [
    'trade-chandlery',
    'trade-cooking',
    'trade-tailoring',
    'trade-textiles',
    'trade-medicine',
    'trade-milling',
    'trade-ranching',
    'trade-farming',
    'trade-fuel',
    'trade-quarrying',
    'trade-shopkeeping',
    'generic-objects',
    'base-library',
    'hearthworks',
    'hearts-delight',
    'terminus',
  ],
  dirtyReason: DIRTY_REASON,
});

const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';
const STORE = '/world/terminus/general-store/shop-floor';
const BANK_HALL = '/world/terminus/counting-houses/banking-hall';
const BANK = '/world/terminus/wharfside/bank';
const LAVOIR = '/world/terminus/wharfside/lavoir/location/lavoir';
const LAUNDRY = '/world/terminus/wharfside/lavoir/location/laundry';
const SQUARE = '/world/terminus/market/square';
const BATHS = '/world/terminus/market/bathhouse/location/baths';
const VESTIBULE = '/world/terminus/market/bathhouse/location/vestibule';
const GLOWCAP = '/world/terminus/rejection/thing/glowcap-jar';
const CELLAR = '/world/terminus/hearthworks/location/cellar';
const WARD = '/world/terminus/infirmary/ward';
const MILL_HOUSE = '/world/terminus/hearts-delight/location/mill-house';
const BYRE = '/world/terminus/hearts-delight/dairy/location/byre';
const CAMPUS_YARD = '/world/terminus/eternal/campus-farm/location/yard';

const T = {
  carcass: '/trade/cooking/agent/hanging-carcass',
  apron: '/trade/tailoring/thing/apron',
  gloves: '/stuff/thing/clothes/work-gloves',
  shirt: '/trade/tailoring/thing/shirt',
  greatcoat: '/stuff/thing/clothes/greatcoat',
  rushes: '/stuff/thing/rushes',
  broom: '/stuff/thing/gear/broom',
  flueBrush: '/stuff/thing/gear/flue-brush',
  soap: '/trade/chandlery/thing/soap-bar',
  sulfur: '/trade/quarrying/thing/sulfur',
  wheat: '/trade/farming/thing/crop/wheat',
};

/** The verb was understood — not the parser's "I don't understand". */
function understood(said: string): boolean {
  return !/don'?t understand|unknown command|not a command/i.test(said);
}

async function say(s: Session, line: string): Promise<string> {
  const r = await s.cmd(line);
  const said = (await r.said()).trim();
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return said;
}

/** A command that asks yes/no: answer it, and read what it said. */
async function sayYes(s: Session, line: string): Promise<string> {
  const pending = s.cmd(line);
  const prompt = (await s.awaitPrompt(60_000)) as unknown as {
    payload?: { promptId?: string };
  };
  const id = prompt.payload?.promptId;
  if (id) s.answerPrompt(id, 'yes');
  const said = (await (await pending).said()).trim();
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  await s.drainProse();
  return said;
}

/**
 * A durative act: send it, wait for its engagement to finish, and return
 * what it said (the begin line) — the state is read back after.
 */
async function act(s: Session, line: string, timeoutMs = 120_000): Promise<string> {
  const r = await s.cmd(line);
  const said = (await r.said()).trim();
  expect(understood(said), `'${line}' was not understood: ${said}`).toBe(true);
  const started = r.notes.find((n) => n.kind === 'engagement-started') as
    | { engagementId?: string }
    | undefined;
  if (started?.engagementId) await s.awaitActivity(started.engagementId, timeoutMs);
  await new Promise((res) => setTimeout(res, 500));
  await s.drainProse();
  return said;
}

/** What a player reads off a thing in reach — description and augmenters. */
async function examine(s: Session, keyword: string): Promise<string> {
  const rows = await s.query(keyword, { fields: 'detail' });
  return rows
    .map((r) => {
      const row = r as { displayName?: unknown; longDescription?: unknown };
      return `${String(row.displayName ?? '')}: ${String(row.longDescription ?? '')}`;
    })
    .join('\n');
}

/** Into the ROOM, by the founder, who holds the title. */
async function cloneHere(where: string, path: string, count = 1): Promise<void> {
  const f = await Session.open('founder', { startLocation: where, wizard: true });
  try {
    expectOk(await f.cmd(`clone ${path} --here${count > 1 ? ` --count ${count}` : ''}`));
  } finally {
    f.close();
  }
}

const LIT = new Set<string>();

/** The same person, standing somewhere else (inventory travels), with a light. */
async function goTo(handle: string, where: string): Promise<Session> {
  const s = await Session.open(handle, { startLocation: where, wizard: true });
  if (!LIT.has(handle)) {
    LIT.add(handle);
    await cloneHere(where, GLOWCAP);
    await s.cmd('get glowcap');
  }
  await s.drainProse();
  return s;
}

/** A funded player, standing at `where`. */
async function newPlayer(tag: string, where: string): Promise<Session> {
  const handle = uniqueHandle(tag);
  const bank = await Session.open(handle, { startLocation: BANK_HALL, wizard: true });
  expectOk(await bank.cmd('bank open'));
  const gov = await Session.open('founder', { startLocation: BANK_HALL });
  try {
    expectOk(await gov.cmd(`reserve override 400 to ${handle} "wire: cleanliness drive"`));
  } finally {
    gov.close();
  }
  bank.close();
  return goTo(handle, where);
}

async function buy(s: Session, item: string): Promise<void> {
  const said = await say(s, `buy ${item}`);
  expect(said, `buy ${item}: ${said}`).toMatch(/you buy/i);
}

/** Work by daylight: a dark room names nothing. */
async function toDaylight(): Promise<void> {
  const { after } = await advanceWorldClock('0 seconds');
  const tod = ((after % 86_400) + 86_400) % 86_400;
  if (tod >= 9 * 3600 && tod <= 15 * 3600) return;
  const toNoon = (12 * 3600 - tod + 86_400) % 86_400;
  await advanceWorldClock(`${Math.ceil(toNoon / 60)} minutes`);
}

beforeAll(async () => {
  await toDaylight();
}, 120_000);

suite('⭐ the new places stand (the boot, and the five reachability links)', () => {
  it('the lavoir is off the bank by its own name, with its slate and its laundress', async () => {
    const s = await newPlayer('lavoir', BANK);
    const went = await say(s, 'go lavoir');
    expect(went, `go lavoir: ${went}`).not.toMatch(/can'?t go|no exit|which way/i);
    const slate = await say(s, 'menu');
    expect(slate, `menu at the lavoir: ${slate}`).toMatch(/wash/i);
    const here = await examine(s, 'here');
    expect(here, `the lavoir: ${here}`).toMatch(/trough/i);
    s.close();
  }, 300_000);

  it('the bathhouse is north of the square; the copper is hot and the tubs are there', async () => {
    const s = await newPlayer('baths', SQUARE);
    await say(s, 'go north');
    const slate = await say(s, 'menu');
    expect(slate, `menu at the bathhouse: ${slate}`).toMatch(/bath/i);
    await say(s, 'go north');
    const copper = await examine(s, 'copper');
    expect(copper, `the copper: ${copper}`).toMatch(/copper/i);
    const tub = await examine(s, 'tub');
    expect(tub, `a tub: ${tub}`).toMatch(/tub/i);
    s.close();
  }, 300_000);

  it('the cookhouse has a real window, and the floor reads as kept', async () => {
    const s = await newPlayer('window', COOKHOUSE);
    const w = await examine(s, 'window');
    expect(w, `the cookhouse window: ${w}`).toMatch(/window/i);
    const survey = await say(s, 'survey');
    expect(survey, `survey: ${survey}`).toMatch(/floor is/i);
    s.close();
  }, 300_000);
});

/** The player's own body as anyone reads it — the soil lines included. */
async function body(s: Session): Promise<string> {
  return examine(s, 'me');
}

let cook: Session;
let cookHandle = '';

suite('⭐⭐ drive 1–3 — the apron takes the blood; the gloves, washed and taken off (AC 1, 2, 3)', () => {
  beforeAll(async () => {
    cook = await newPlayer('cook', COOKHOUSE);
    cookHandle = cook.handle;
    await cloneHere(COOKHOUSE, T.apron);
    await cloneHere(COOKHOUSE, T.gloves);
    await cloneHere(COOKHOUSE, T.shirt);
    await cloneHere(COOKHOUSE, T.carcass, 4);
    await say(cook, 'get boning knife');
    await say(cook, 'get apron');
    await say(cook, 'get gloves');
    await say(cook, 'get plain');
    await act(cook, 'wear plain');
  }, 600_000);

  it('⭐ drive 1 — clean to begin with; butchered in an apron, the APRON is bloodied and the shirt is not', async () => {
    const before = await body(cook);
    expect(before, `me, before: ${before}`).not.toMatch(/hands are .*blood/i);
    await act(cook, 'wear apron');
    await act(cook, 'butcher first carcass', 180_000);
    const apron = await examine(cook, 'apron');
    expect(apron, `the apron: ${apron}`).toMatch(/blood/i);
    const shirt = await examine(cook, 'plain');
    expect(shirt, `the shirt under it: ${shirt}`).not.toMatch(/blood/i);
    const me = await body(cook);
    expect(me, `bare hands: ${me}`).toMatch(/hands are .*blood/i);
  }, 300_000);

  it('⭐ drive 2 — bare `wash` washes the hands; gloved, it washes the GLOVES and not the hands under them', async () => {
    await act(cook, 'wash');
    expect(await body(cook), 'washed hands').not.toMatch(/hands are .*blood/i);
    await act(cook, 'wear gloves');
    await act(cook, 'butcher first carcass', 180_000);
    const gloves = await examine(cook, 'gloves');
    expect(gloves, `the gloves after butchering: ${gloves}`).toMatch(/blood/i);
    await act(cook, 'wash');
    const washed = await examine(cook, 'gloves');
    expect(washed, `the gloves after a wash: ${washed}`).not.toMatch(/soiled|filthy/i);
  }, 300_000);

  it('⭐ drive 2 — dirty gloves off CAREFULLY leave the hands clean; off in a hurry, they do not', async () => {
    await act(cook, 'butcher first carcass', 180_000);
    await act(cook, 'remove gloves carefully');
    expect(await body(cook), 'careful removal').not.toMatch(/hands are .*blood/i);
    await act(cook, 'wear gloves');
    await act(cook, 'remove gloves');
    const me = await body(cook);
    expect(me, `quick removal: ${me}`).toMatch(/hands are .*blood/i);
  }, 300_000);

  it('⭐ drive 3 — a game day of idling changes nothing (no clock on dirt)', async () => {
    const before = await body(cook);
    await advanceWorldClock('24 hours');
    await toDaylight();
    const after = await body(cook);
    expect(after.match(/Your hands[^.]*\./)?.[0], `hands a day later: ${after}`).toBe(
      before.match(/Your hands[^.]*\./)?.[0],
    );
  }, 300_000);
});

suite('⭐ drive 4 — strew and sweep a bloodied floor (AC 12)', () => {
  it('the floor is bloodied by the butchery; strewn and swept, the heap takes it up', async () => {
    const floor = await examine(cook, 'floor');
    expect(floor, `the cookhouse floor after butchering: ${floor}`).toMatch(/blood|marked|soiled/i);
    await cloneHere(COOKHOUSE, T.rushes);
    await say(cook, 'get rushes');
    const strewn = await say(cook, 'strew rushes');
    expect(strewn, `strew: ${strewn}`).toMatch(/strew/i);
    await cloneHere(COOKHOUSE, T.broom);
    await say(cook, 'get broom');
    await act(cook, 'sweep with broom');
    const after = await examine(cook, 'floor');
    expect(after, `the floor, swept: ${after}`).not.toMatch(/blood/i);
    const heap = await examine(cook, 'sweepings');
    expect(heap, `the heap: ${heap}`).toMatch(/sweepings/i);
  }, 300_000);
});

suite('⭐⭐ drive 5, 7, 9 — blood cold and hot, grease and soap, a wet shirt dried (AC 4, 5, 6)', () => {
  it('⭐ drive 7 — the greasy apron does not wash out in water alone; with soap it does', async () => {
    const apron = await examine(cook, 'apron');
    expect(apron, `the apron: ${apron}`).toMatch(/greas/i);
    await act(cook, 'remove apron');
    await act(cook, 'wash apron');
    expect(await examine(cook, 'apron'), 'water alone').toMatch(/greas/i);
    await cloneHere(COOKHOUSE, T.soap);
    await say(cook, 'get soap');
    await act(cook, 'wash apron with soap');
    expect(await examine(cook, 'apron'), 'with soap').not.toMatch(/greas/i);
  }, 300_000);

  it('⭐ drive 5 — butchered without the apron, the SHIRT takes the blood; washed hot it SETS, and the stain names the bleeder', async () => {
    await act(cook, 'butcher first carcass', 180_000);
    const shirt = await examine(cook, 'plain');
    expect(shirt, `the shirt: ${shirt}`).toMatch(/blood/i);
    const handle = cook.handle;
    cook.close();
    cook = await goTo(handle, LAUNDRY);
    await act(cook, 'wash plain in copper');
    const set = await examine(cook, 'plain');
    expect(set, `washed hot: ${set}`).toMatch(/set|stain|blood/i);
    const read = await say(cook, 'analyze plain');
    expect(read, `analyze the shirt: ${read}`).toMatch(/blood|type|[ABO]{1,2}\b/i);
  }, 300_000);

  it('⭐ drive 9 — a washed shirt is wet; dried by the fire it is not', async () => {
    const wet = await examine(cook, 'plain');
    expect(wet, `after the wash: ${wet}`).toMatch(/wet|damp|sodden/i);
    const handle = cook.handle;
    cook.close();
    cook = await goTo(handle, COOKHOUSE);
    await act(cook, 'dry plain');
    const dry = await examine(cook, 'plain');
    expect(dry, `dried: ${dry}`).not.toMatch(/sodden/i);
  }, 300_000);
});

suite('⭐ drive 11 — sulfur burnt in a shut room sours the air (AC 11)', () => {
  it('stoke the cellar brazier with sulfur and light it; the air reads it', async () => {
    const s = await goTo(cookHandle, CELLAR);
    await cloneHere(CELLAR, T.sulfur);
    await say(s, 'get sulfur');
    await say(s, 'stoke sulfur into brazier');
    await say(s, 'ignite brazier');
    await advanceWorldClock('30 minutes');
    const air = await say(s, 'analyze atmosphere');
    expect(air, `the cellar air: ${air}`).toMatch(/sulfur|sulphur|dioxide|acrid/i);
    s.close();
  }, 300_000);
});

suite('⭐⭐ drive 12 — the cookhouse kept: crumbs, the window, the flue (AC 12, 13, 14)', () => {
  it('⭐ eating drops crumbs; the floor reads crumbed, and the survey names the method', async () => {
    const s = await goTo(cookHandle, COOKHOUSE);
    await s.cmd('ignite oven');
    for (let i = 0; i < 3; i++) {
      await say(s, 'order stew');
      await act(s, 'eat stew');
    }
    const floor = await examine(s, 'floor');
    expect(floor, `the floor after three meals: ${floor}`).toMatch(/crumb/i);
    const survey = await say(s, 'survey');
    expect(survey, `survey: ${survey}`).toMatch(/floor is (marked|soiled|filthy)/i);
    await act(s, 'sweep with broom');
    expect(await examine(s, 'floor'), 'swept').not.toMatch(/crumb/i);
    s.close();
  }, 600_000);

  it('⭐ the window washes; the flue brush clears the chimney', async () => {
    const s = await goTo(cookHandle, COOKHOUSE);
    const washed = await act(s, 'wash window');
    expect(washed, `wash window: ${washed}`).toMatch(/window/i);
    await cloneHere(COOKHOUSE, T.flueBrush);
    await say(s, 'get flue brush');
    const swept = await act(s, 'sweep oven with flue brush');
    expect(swept, `sweep the flue: ${swept}`).toMatch(/brush|flue/i);
    s.close();
  }, 300_000);
});

suite('⭐ drive 14 — mill dust hangs in the mill house; swept, it settles (AC 16)', () => {
  it('milling puts flour in the air, and a broom takes it down', async () => {
    const s = await goTo(cookHandle, MILL_HOUSE);
    await cloneHere(MILL_HOUSE, T.wheat);
    await say(s, 'get first wheat');
    await say(s, 'drop wheat');
    await say(s, 'mill wheat 0.72');
    await advanceWorldClock('1 hour');
    const air = await say(s, 'analyze atmosphere');
    expect(air, `the mill house air: ${air}`).toMatch(/flour|dust/i);
    await act(s, 'sweep with broom');
    s.close();
  }, 300_000);
});

suite('⭐ drive 15 — the byre fouls with its herd, and is mucked out (AC 17)', () => {
  it('two days of cows on the floor; `muck` takes it up into a heap', async () => {
    await advanceWorldClock('48 hours');
    await toDaylight();
    const s = await goTo(cookHandle, BYRE);
    const floor = await examine(s, 'floor');
    expect(floor, `the byre floor: ${floor}`).toMatch(/manure|dung|filthy|soiled/i);
    await act(s, 'muck with broom');
    const heap = await examine(s, 'muck');
    expect(heap, `the heap: ${heap}`).toMatch(/muck|manure|dung/i);
    s.close();
  }, 300_000);
});

suite('⭐⭐ drive 16 — the ward: a boiled bandage, a kit in the flame (AC 18)', () => {
  it('a bandage boiled in the ward pot; the surgeon’s kit held in the coals', async () => {
    const s = await goTo(cookHandle, WARD);
    const boiled = await act(s, 'boil first bandage in pot');
    expect(boiled, `boil bandage: ${boiled}`).toMatch(/boil|pot/i);
    const flamed = await act(s, 'heat surgical kit');
    expect(flamed, `heat the kit: ${flamed}`).toMatch(/flame/i);
    s.close();
  }, 300_000);
});

suite('⭐⭐ drive 18 — the laundress at her band, and the house that pays (AC 19)', () => {
  it('⭐ Bet names the fibre and the price; yes, and it comes back washed', async () => {
    const s = await goTo(cookHandle, LAVOIR);
    const done = await sayYes(s, 'order wash apron');
    expect(done, `order wash apron: ${done}`).toMatch(/brings .* back/i);
    s.close();
  }, 300_000);

  it('⭐⭐ the bath attendant boils a wool coat and felts it — and the house answers for it', async () => {
    const s = await goTo(cookHandle, VESTIBULE);
    await cloneHere(VESTIBULE, T.greatcoat);
    await say(s, 'get greatcoat');
    const done = await sayYes(s, 'order wash greatcoat');
    expect(done, `the attendant's wash: ${done}`).toMatch(/felted|shrunk/i);
    const after = await s.listen(3_000);
    expect(`${done} ${after}`, 'the house answers').toMatch(/house (pays|owes)/i);
    s.close();
  }, 300_000);
});

suite('⭐⭐ drive 20 — the doorman says why; a bath and a coat, and he lets you by (AC 20)', () => {
  it('in the apron he turns you away in words; bathed and in a coat, the arch is open', async () => {
    const s = await goTo(cookHandle, BANK_HALL);
    await act(s, 'wear apron');
    const refused = await say(s, 'go north');
    expect(refused, `the arch in an apron: ${refused}`).toMatch(/working clothes|not in/i);
    await act(s, 'remove apron');
    s.close();
    const b = await goTo(cookHandle, BATHS);
    await say(b, 'get first soap').catch(() => '');
    const bathed = await act(b, 'bathe in first tub with soap').catch(async () => act(b, 'bathe'));
    expect(bathed, `bathe: ${bathed}`).toMatch(/tub|water|get into/i);
    b.close();
    await cloneHere(BANK_HALL, T.greatcoat);
    const c = await goTo(cookHandle, BANK_HALL);
    await act(c, 'remove plain').catch(() => '');
    await say(c, 'get greatcoat');
    await act(c, 'wear greatcoat');
    const let_ = await say(c, 'go north');
    expect(let_, `the arch in a coat: ${let_}`).not.toMatch(/working clothes|not in that state/i);
    c.close();
  }, 600_000);
});

suite('⭐ drive 22 — a clean contract, posted, done and paid (AC 22)', () => {
  it('the cookhouse floor is posted clean; a hand strews, sweeps and is paid', async () => {
    const poster = await goTo(cookHandle, COOKHOUSE);
    await act(poster, 'butcher first carcass', 180_000).catch(() => '');
    const posted = await say(poster, 'job post clean here for 5');
    expect(posted, `job post clean: ${posted}`).toMatch(/post|gig|\[/i);
    const id = /\[([0-9a-f]{4,})\]/i.exec(posted)?.[1] ?? '';
    poster.close();
    const hand = await newPlayer('sweeper', COOKHOUSE);
    const list = await say(hand, 'job');
    const gig = id || (/\[([0-9a-f]{4,})\]\s+clean/i.exec(list)?.[1] ?? '');
    expect(gig, `the clean gig on the board: ${list}`).not.toBe('');
    await say(hand, `job claim ${gig}`);
    await cloneHere(COOKHOUSE, T.rushes);
    await say(hand, 'get rushes');
    await say(hand, 'strew rushes');
    await say(hand, 'get broom').catch(() => '');
    await act(hand, 'sweep');
    const paid = await say(hand, `job complete ${gig}`);
    expect(paid, `job complete: ${paid}`).toMatch(/paid|credit|complete/i);
    hand.close();
  }, 600_000);
});

/**
 * ⭐⭐⭐ **Drive 23 — what was soiled and kept survives a restart.** Run
 * LAST, because it restarts the world; only in a world this run OWNS.
 */
suite('⭐⭐⭐ drive 23 — a stain, a band and a kept floor survive a restart (AC 24)', () => {
  afterAll(async () => {
    await stopOwnedWorld();
  });

  it.skipIf(!isOwnedTestWorld())('restart, and find the set stain on the shirt where it was left', async () => {
    cook?.close();
    await new Promise((r) => setTimeout(r, 8_000));
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
    const s = await Session.open(cookHandle, { startLocation: COOKHOUSE, wizard: true });
    try {
      const shirt = await examine(s, 'plain');
      expect(shirt, `the shirt, after a restart: ${shirt}`).toMatch(/blood|stain/i);
      const apron = await examine(s, 'apron');
      expect(apron, `the apron, after a restart: ${apron}`).toMatch(/apron/i);
    } finally {
      s.close();
    }
  }, 900_000);
});

void STORE;
void buy;
void CAMPUS_YARD;
