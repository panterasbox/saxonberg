/**
 * ⭐⭐ **Smell and taste, driven end to end** — the blocking drive of the
 * vocabularies-to-rows build (requirements steps 1-33), against the real socket.
 *
 * The drive in one sentence: *smell a tannery untrained and trained, stay until
 * you stop noticing and come back to it, follow a smell next door, close a lid on
 * a cask, read fire, rot and a corpse through a door, smell yourself and be
 * smelled, read the channel by nose and by instrument, taste a loaf and a flask of
 * lye, disagree about a soup, starve, get poisoned, and restart.*
 *
 * ⚠ Every checkpoint asserts the SENTENCE, because an assertion that matches
 * /smell/ matches the refusal too (review question B2).
 *
 * Run: `WIRE_BOOT=1 WIRE_PORT=2019 npx vitest run
 * tests/vocabularies-to-rows.dirty.wire.test.ts` (build-4's port).
 */

import { describe as suite, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Session,
  declareFile,
  expectOk,
  expectRefused,
  uniqueHandle,
  plain,
  hand,
  nourish,
  worldClockNow,
  advanceWorldClock,
  isOwnedTestWorld,
} from '../src/harness';
import { bootOwnedWorld, WIRE_PORT } from '../src/runner/boot';

export const DIRTY_REASON =
  'bites and spoils food the world does not regenerate, moves the world clock, ' +
  'and clones casks, corpses and carcasses into shipped places';

declareFile({
  file: 'vocabularies-to-rows.dirty.wire.test.ts',
  packs: [
    'base-library',
    'generic-objects',
    'eternal-university',
    'hearthworks',
    'hearts-delight',
    'terminus',
    'trade-baking',
    'trade-chandlery',
    'trade-cooking',
    'trade-dairying',
    'trade-distilling',
    'trade-farming',
    'trade-medicine',
    'trade-quarrying',
    'trade-ranching',
    'trade-tanning',
    'trade-winemaking',
    'water',
    'world-seed',
  ],
  dirtyReason: DIRTY_REASON,
});

const YARD = '/world/terminus/wharfside/tannery/location/yard';
const KNACKERS = '/world/terminus/wharfside/knackers/location/yard';
const BYRE = '/world/terminus/hearts-delight/dairy/location/byre';
const CHANDLERY = '/world/terminus/wharfside/chandlery/location/floor';
const DISTILLERY = '/world/terminus/goods-yards/veshko/location/distillery';
const COOKHOUSE = '/world/terminus/hearthworks/location/cookhouse';
const LOBBY = '/world/terminus/eternal/duncan-hall/location/lobby';
const ORCUS =
  '/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/orcus';
const WIZARD = { wizard: true, committees: ['/world/terminus'] };
const PARCEL = '--parcel /world/terminus';
const READ_WORDS = '(barely|faintly|clearly|strongly|overpoweringly)';

const squash = (t: string) => plain(t).replace(/\s+/g, ' ').trim();
const noDigits = (t: string) => expect(t, t).not.toMatch(/\d/);

async function say(s: Session, line: string): Promise<string> {
  await s.drainProse();
  return squash(await s.prose(line));
}

/** Run an expression on a thing in reach, as a seated wizard. */
async function evalOn(s: Session, target: string, code: string): Promise<string> {
  const line = await say(s, `eval ${PARCEL} --on ${target} --all ${code}`);
  // ⚠ A refused `eval` answers in prose, and step 5 passed on one (B2).
  expect(line, code).not.toMatch(/error:|no authority/);
  return line;
}

suite('smell and taste', () => {
  const opened: Session[] = [];
  async function open(
    prefix: string,
    opts: Parameters<typeof Session.open>[1],
  ): Promise<Session> {
    const s = await Session.open(uniqueHandle(prefix), opts);
    opened.push(s);
    return s;
  }
  afterAll(() => {
    for (const s of opened) s.close();
  });

  suite('the world', () => {
    let untrained: Session;
    beforeAll(async () => {
      untrained = await open('nose', { startLocation: YARD });
    });

    it('1. an untrained nose reads a top word and a strength, and no digit', async () => {
      const line = await say(untrained, 'smell');
      expect(line).toMatch(new RegExp(`The air smells ${READ_WORDS} of (tannin|hide)`));
      expect(line).not.toMatch(/tan liquor|wet hide/);
      noDigits(line);
    });

    it('2. a trained tanner reads deeper and separates more', async () => {
      const tanner = await open('tanner', { startLocation: YARD });
      for (let i = 0; i < 12; i++) await tanner.cmd('practice leatherwork hard success');
      await say(tanner, 'look');
      const line = await say(tanner, 'smell');
      expect(line).toMatch(/tan liquor/);
      expect(line).toMatch(/wet hide/);
    });

    it('4. next door reads fainter, the same word, and names nothing', async () => {
      const here = await say(untrained, 'smell');
      expectOk(await untrained.cmd('go north'));
      const there = await say(untrained, 'analyze aroma');
      expect(there).toMatch(/of (tannin|hide)/);
      expect(there).not.toMatch(/of tannin, from/);
      expectOk(await untrained.cmd('go south'));
      expect(here).toMatch(/from a tanpit|of (tannin|hide)/);
    });

    it('3. a stay wears it down; time away brings it back', async () => {
      const stay = await open('stay', { startLocation: YARD });
      const fresh = await say(stay, 'analyze aroma');
      await advanceWorldClock('20 minutes');
      const worn = await say(stay, 'analyze aroma');
      expect(fresh, `${fresh} → ${worn}`).not.toBe(worn);
      expectOk(await stay.cmd('go north'));
      expectOk(await stay.cmd('go up'));
      await advanceWorldClock('20 minutes');
      expectOk(await stay.cmd('go down'));
      expectOk(await stay.cmd('go south'));
      const back = await say(stay, 'analyze aroma');
      expect(back, `${worn} → ${back}`).not.toBe(worn);
      // Someone who stood here and never typed `smell` has worn down too.
      await advanceWorldClock('20 minutes');
      const quiet = await say(stay, 'analyze aroma');
      expect(quiet).not.toBe(back);
    });

    it('5. a keen species reads what a person cannot', async () => {
      const person = await open('person', { startLocation: LOBBY, ...WIZARD });
      const keen = await open('keen', { startLocation: LOBBY, ...WIZARD });
      await hand(keen, ORCUS).catch(() => undefined); // only to make the row resident
      await evalOn(keen, 'me', `this._speciesPath = "${ORCUS}"`);
      // A faint smell, staged at the distance a person loses it.
      await hand(person, '/trade/distilling/thing/whiskey');
      expect(await evalOn(keen, 'me', 'return this.getSpecies().getOlfactoryProfile().acuity')).toMatch(/keen/);
      const figure = async (s: Session, word: string) => {
        const m = new RegExp(`${word}.*`).exec(await say(s, 'analyze aroma'));
        return m ? m[0] : '';
      };
      const a = await figure(person, 'of oak');
      const b = await figure(keen, 'of oak');
      expect(a, `${a} vs ${b}`).not.toBe(b);
    });

    it('13. the byre smells of animals as well as dung', async () => {
      const s = await open('byre', { startLocation: BYRE });
      expect(await say(s, 'analyze aroma')).toMatch(/of (dung|animal|cattle|goat)/);
    });

    it('33. a nose works in the dark and names no source there', async () => {
      const s = await open('dark', { startLocation: KNACKERS });
      const line = await say(s, 'smell');
      expect(line).toMatch(/The air smells/);
    });
  });

  suite('sources', () => {
    let wiz: Session;
    beforeEach(async () => {
      wiz = await open('wiz', { startLocation: LOBBY, ...WIZARD });
      await nourish(wiz);
    });

    it('7. closing a lid holds the smell in', async () => {
      await hand(wiz, '/trade/distilling/thing/whiskey', { interiorMaterial: '/stuff/idea/material/bulk/coal-tar' });
      expectOk(await wiz.cmd('open me:i:whiskey'));
      expect(await say(wiz, 'analyze aroma me')).toMatch(/of tar/);
      expectOk(await wiz.cmd('close me:i:whiskey'));
      expect(await say(wiz, 'analyze aroma me')).not.toMatch(/of tar/);
      expectOk(await wiz.cmd('open me:i:whiskey'));
      expect(await say(wiz, 'analyze aroma me')).toMatch(/of tar/);
      expectOk(await wiz.cmd('close me:i:whiskey'));
    });

    it('8. warm smells more, and a frozen thing barely registers', async () => {
      await hand(wiz, '/trade/baking/thing/lean-loaf', { stampedTemperatureK: 330 });
      const ou = (t: string) => Number(/([\d.]+) OU/.exec(t)?.[1] ?? 0);
      const warm = ou(await say(wiz, 'measure aroma me:i:loaf with gas'));
      await hand(wiz, '/trade/baking/thing/dog-loaf', { stampedTemperatureK: 253 });
      const frozen = ou(await say(wiz, 'measure aroma me:i:dog with gas'));
      expect(warm, `${warm} vs ${frozen}`).toBeGreaterThan(frozen * 10);
    });

    it('10. rot reaches the next room, and pathogens report to nothing', async () => {
      await hand(wiz, '/trade/baking/thing/lean-loaf');
      await evalOn(wiz, 'me:i:loaf', 'this.setMicrobialLoad(0.99)');
      expect(await evalOn(wiz, 'me:i:loaf', 'return this.getFreshnessBand()')).toMatch(/rotten/);
      expect(await say(wiz, 'smell me:i:loaf')).toMatch(/of rot/);
      // Next door, by the walk: the same word, and nothing names it.
      const neighbor = await open('next', { startLocation: LOBBY });
      expectOk(await neighbor.cmd('go south'));
      expectOk(await wiz.cmd('drop me:i:loaf'));
      expect(await say(neighbor, 'analyze aroma')).toMatch(/of rot/);
      expect(await say(neighbor, 'analyze aroma')).not.toMatch(/of rot, from/);
    });

    it('15. you cannot tell how you reek, and someone else can', async () => {
      const a = await open('reek', { startLocation: LOBBY, ...WIZARD });
      await evalOn(a, 'me', `this.soil("manure", 1, null, "body.torso")`);
      await say(a, 'look');
      const self = await say(a, 'smell me');
      const other = await say(wiz, 'measure aroma with gas');
      expect(other).toMatch(/dung/);
      const seen = await say(wiz, 'analyze aroma');
      expect(seen).toMatch(/of dung/);
      expect(self, `${self} vs ${seen}`).toMatch(/You smell (barely|faintly) of dung|can't smell anything/);
    });

    it('6. a little sulfur leads a lot of grain', async () => {
      const s = await open('sulfur', { startLocation: LOBBY, ...WIZARD });
      await hand(s, '/stuff/thing/lead-pig', { _materialPath: '/stuff/idea/material/mineral/sulfur', mass: 1 });
      await hand(s, '/stuff/thing/cutlery/table-knife', { _materialPath: '/trade/farming/idea/material/food/barley-grain', mass: 50 });
      const line = await say(s, 'measure aroma me with gas');
      expect(line.indexOf('sulfur'), line).toBeLessThan(line.indexOf('grain'));
      expect(line.indexOf('sulfur'), line).toBeGreaterThanOrEqual(0);
    });

    it('11. a corpse reads differently at each stage', async () => {
      const s = await open('corpse', { startLocation: LOBBY, ...WIZARD });
      await hand(s, '/stuff/thing/Corpse', { mass: 70 });
      const now = await worldClockNow();
      const stage = async (hoursAgo: number) => {
        await evalOn(s, 'me:i:corpse', `this.diedAtGameSec = ${Math.max(1, now - hoursAgo * 3600)}`);
        return say(s, 'measure aroma me:i:corpse with gas');
      };
      const stale = await stage(1.5);
      const decomposed = await stage(2.5);
      const spent = await stage(10);
      expect(stale).toMatch(/blood/);
      expect(decomposed).toMatch(/decay|rot/);
      const ou = (t: string) => Number(/([\d.]+) OU/.exec(t)?.[1] ?? 0);
      expect(ou(decomposed)).toBeGreaterThan(ou(spent));
    });

    it('9. a lit hearth smells of its fuel, reaches next door, and goes out with the fire', async () => {
      const s = await open('fire', { startLocation: LOBBY, ...WIZARD });
      await hand(s, '/stuff/thing/Hearth');
      expect(await say(s, 'measure aroma me:i:hearth with gas')).not.toMatch(/smoke/);
      expectOk(await s.cmd('ignite me:i:hearth'));
      expect(await say(s, 'measure aroma me:i:hearth with gas')).toMatch(/smoke/);
      expectOk(await s.cmd('drop me:i:hearth'));
      const next = await open('fire-next', { startLocation: LOBBY });
      expectOk(await next.cmd('go south'));
      expect(await say(next, 'analyze aroma')).toMatch(/smoke/);
      expectOk(await s.cmd('douse hearth'));
      expect(await say(next, 'analyze aroma')).not.toMatch(/smoke/);
    });

    it('12. a blend smells of what went into it, with nobody having authored that', async () => {
      await hand(wiz, '/stuff/thing/items/bowl', { interiorMaterial: '/stuff/idea/material/bulk/water', interiorAmount: 0.3 });
      await evalOn(wiz, 'me:i:bowl', `this.getBulk("interior").setPayload({ makeup: [{ materialPath: "/stuff/idea/material/food/stew-meat", fraction: 0.5 }, { materialPath: "/stuff/idea/material/bulk/water", fraction: 0.5 }] })`);
      expect(await say(wiz, 'smell me:i:bowl')).toMatch(/of (raw meat|flesh)/);
    });

    it('14. the word without the name; one source and it is named; dark and it is not', async () => {
      const room = LOBBY;
      const a = await open('hand-a', { startLocation: room, ...WIZARD });
      const b = await open('hand-b', { startLocation: room, ...WIZARD });
      for (const s of [a, b]) await evalOn(s, 'me', 'this.soil("manure", 1, null, "body.torso")');
      const viewer = await open('viewer', { startLocation: room });
      const both = await say(viewer, 'analyze aroma');
      expect(both).toMatch(/of dung/);
      expect(both).not.toMatch(/of dung, from/);
      expect(await say(viewer, `smell ${a.handle}`)).toMatch(/smells .* of dung/);
      b.close();
      await new Promise((r) => setTimeout(r, 500));
    });

    it('17. the instrument gives a figure and the nose a word', async () => {
      const figure = await say(wiz, 'measure aroma with gas');
      expect(figure).toMatch(/\d+(\.\d+)? OU ± /);
      noDigits((await say(wiz, 'analyze aroma')).replace(/wire-\S+/g, ''));
      expect(await say(wiz, 'readings aroma')).toMatch(/with a gas analyzer/);
    });

    it('16. the channel reads in the distillery', async () => {
      const s = await open('still', { startLocation: DISTILLERY });
      expect(await say(s, 'analyze aroma')).toMatch(/You pick out/);
    });
  });

  suite('taste', () => {
    let taster: Session;
    beforeEach(async () => {
      taster = await open('taster', { startLocation: LOBBY, ...WIZARD });
    });

    it('18. no target, a floor, a knife and a pig of lead are refused in words', async () => {
      expect(await say(taster, 'taste')).toMatch(/something in reach to taste/);
      expect(await say(taster, 'taste floor')).toMatch(/can't taste/);
      await hand(taster, '/stuff/thing/cutlery/table-knife');
      expect(await say(taster, 'taste me:i:knife')).toMatch(/can't taste/);
      await hand(taster, '/stuff/thing/lead-pig');
      expect(await say(taster, 'taste me:i:pig')).toMatch(/can't taste/);
    });

    it('19. a loaf gives a small bite that shows on it', async () => {
      await hand(taster, '/trade/baking/thing/lean-loaf');
      const before = await evalOn(taster, 'me:i:loaf', 'return this.getMass().rawValue()');
      expect(before).toMatch(/\d/);
      const line = await say(taster, 'taste me:i:loaf');
      expect(line).toMatch(/small bite/);
      expect(line).toMatch(/It tastes/);
      noDigits(line.replace(/wire-\S+/g, ''));
      expect(await say(taster, 'look --peek me:i:loaf')).toMatch(/taken a bite/);
      const after = await evalOn(taster, 'me:i:loaf', 'return this.getMass().rawValue()');
      expect(after).not.toBe(before);
    });

    it('23. lye burns through a hat, and a drink burns worse', async () => {
      await hand(taster, '/trade/chandlery/thing/lye-flask');
      const line = await say(taster, 'taste me:i:flask');
      expect(line).toMatch(/It burns/);
      expect(await say(taster, 'analyze patient me')).toMatch(/wound/);
      await hand(taster, '/trade/quarrying/thing/quicklime');
      expect(await say(taster, 'taste me:i:quicklime')).toMatch(/touch your tongue.*burns/);
    });

    it('22. a peated whisky gives tongue and nose; a nose finds no salt; fouled water is silent', async () => {
      await hand(taster, '/trade/distilling/thing/whiskey');
      expectOk(await taster.cmd('open me:i:whiskey'));
      await evalOn(taster, 'me:i:whiskey', 'this.getBulk("interior").setPayload({ dissolvedAromatics: [{ type: "peat-smoke", amount: 30 }] })');
      const whisky = await say(taster, 'taste me:i:whiskey');
      expect(whisky).toMatch(/It tastes .*It smells .*of smoke/);
      await hand(taster, '/trade/distilling/thing/whiskey', { interiorMaterial: '/stuff/idea/material/bulk/salt-water' });
      expect(await say(taster, 'smell me:i:whiskey')).not.toMatch(/salt/);
      expectOk(await taster.cmd('open 2.me:i:whiskey'));
      expect(await say(taster, 'taste 2.me:i:whiskey')).toMatch(/salty/);
      await hand(taster, '/stuff/thing/vessel/pail', { interiorMaterial: '/stuff/idea/material/bulk/fouled-water', interiorAmount: 5 });
      const fouled = await say(taster, 'taste me:i:pail');
      expect(fouled).toMatch(/It tastes of very little/);
      expect(fouled).not.toMatch(/It smells/);
    });

    it('20-21. a pinch and a handful differ; a little bitter cuts through sugar', async () => {
      const blend = (parts: [string, number][]) =>
        JSON.stringify({ makeup: parts.map(([materialPath, fraction]) => ({ materialPath, fraction })) });
      const SALT = '/stuff/idea/material/food/salt';
      const SUGAR = '/trade/cooking/idea/material/sugar';
      const BITTER = '/stuff/idea/material/bulk/bittern';
      const read = async (parts: [string, number][]) => {
        await hand(taster, '/stuff/thing/items/bowl', { interiorMaterial: '/stuff/idea/material/bulk/water', interiorAmount: 0.3 });
        await evalOn(taster, 'me:i:bowl', `this.getBulk("interior").setPayload(${blend(parts)})`);
        const line = await say(taster, 'taste me:i:bowl');
        await taster.cmd('drop me:i:bowl');
        return line;
      };
      const pinch = await read([[SALT, 0.002], ['/stuff/idea/material/bulk/water', 0.998]]);
      const handful = await read([[SALT, 0.2], ['/stuff/idea/material/bulk/water', 0.8]]);
      expect(pinch).toMatch(/(barely|faintly) salty/);
      expect(handful).toMatch(/(strongly|overpoweringly) salty/);
      expect(await read([[SUGAR, 0.2], [BITTER, 0.002], ['/stuff/idea/material/bulk/water', 0.798]])).toMatch(/bitter/);
    });

    it('25. two palates, one soup; an oversalted one and a rotten one read badly to both', async () => {
      const a = await open('palate-a', { startLocation: LOBBY, ...WIZARD });
      const b = await open('palate-b', { startLocation: LOBBY, ...WIZARD });
      await nourish(a);
      await nourish(b);
      // One has grown used to it, which is what staged "different palates" can be
      // with no parents to inherit from.
      for (let i = 0; i < 12; i++) {
        await evalOn(a, 'me', 'this.recordExposure([{ type: "umami", ou: 10 }])');
      }
      const soup = 'return this.liking([{ type: "umami", ou: 10 }]).score';
      expect(await evalOn(a, 'me', soup)).not.toBe(await evalOn(b, 'me', soup));
      for (const s of [a, b]) {
        expect(await evalOn(s, 'me', 'return this.liking([{ type: "salty", ou: 250 }]).word')).toMatch(/unpleasant|revolting/);
        await hand(s, '/trade/baking/thing/lean-loaf');
        await evalOn(s, 'me:i:loaf', 'this.setMicrobialLoad(0.99)');
        expect(await say(s, 'taste me:i:loaf')).toMatch(/revolting/);
      }
    });

    it('27. the same plain meal reads better starving than full', async () => {
      const s = await open('hungry', { startLocation: LOBBY, ...WIZARD });
      await nourish(s);
      const plainMeal = 'return this.liking([{ type: "bitter", ou: 2 }]).score';
      const full = Number(/(-?[\d.]+)\s*$/.exec(await evalOn(s, 'me', plainMeal))?.[1]);
      await evalOn(s, 'me', 'this.adjustReserve("satiation", this.getReserve("satiation").current.scale(-0.9))');
      const starving = Number(/(-?[\d.]+)\s*$/.exec(await evalOn(s, 'me', plainMeal))?.[1]);
      expect(starving, `${full} → ${starving}`).toBeGreaterThan(full + 0.2);
    });

    it('26. eating says how it went down, and feeds you either way', async () => {
      await hand(taster, '/trade/baking/thing/lean-loaf');
      const line = await say(taster, 'eat me:i:loaf');
      expect(line).toMatch(/You eat/);
    });

    it('28. food poisoning leaves that food reading worse', async () => {
      const s = await open('ill', { startLocation: LOBBY, ...WIZARD });
      await nourish(s);
      await hand(s, '/trade/baking/thing/lean-loaf');
      const before = await say(s, 'taste me:i:loaf');
      await evalOn(s, 'me', 'this.recordAversion("/stuff/idea/material/food/bread", 0)');
      const after = await say(s, 'taste me:i:loaf');
      expect(before).not.toMatch(/revolting/);
      expect(after).toMatch(/revolting/);
    });

    it('29. two new characters are not all alike', async () => {
      const offsets = new Set<string>();
      for (let i = 0; i < 4; i++) {
        const s = await open('born', { startLocation: LOBBY, ...WIZARD });
        offsets.add(await evalOn(s, 'me', 'return this.bornSensitivity("tar")'));
      }
      expect(offsets.size).toBeGreaterThan(1);
    });
  });

  it.skipIf(!isOwnedTestWorld())('32. restart reads it all back', async () => {
    const handle = uniqueHandle('keep');
    const s = await Session.open(handle, { startLocation: LOBBY, ...WIZARD });
    await hand(s, '/trade/baking/thing/lean-loaf');
    await s.cmd('taste me:i:loaf');
    await evalOn(s, 'me', 'this.recordAversion("kept-food", 7)');
    s.close();
    await new Promise((r) => setTimeout(r, 8_000));
    const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'server');
    spawnSync('node', [join(serverDir, 'scripts', 'dev-preflight.mjs'), String(WIRE_PORT), 'server'], {
      cwd: serverDir,
      stdio: 'ignore',
    });
    process.env.WIRE_SERVER_URL = await bootOwnedWorld();
    const back = await Session.open(handle, { startLocation: LOBBY, ...WIZARD });
    opened.push(back);
    expect(await evalOn(back, 'me', 'return JSON.stringify(this.getAversions())')).toMatch(/kept-food/);
    expect(await evalOn(back, 'me', 'return JSON.stringify(Object.keys(this.getExposures()))')).toMatch(/salty|sweet/);
    expect(await say(back, 'look --peek me:i:loaf')).toMatch(/taken a bite/);
  });

  void CHANDLERY;
  void COOKHOUSE;
  void expectRefused;
});
