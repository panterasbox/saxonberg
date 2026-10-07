/**
 * ⭐⭐ The three noxious trades at the city's edge — **the realm's first
 * LULU cluster shipped on purpose.**
 *
 * A knacker, a tannery and a chandlery, chained so that each one's
 * product is the next one's feedstock, downstream of the city's intake
 * and past its outfall. Which is where every real tannery in history
 * sat, and for exactly these reasons.
 *
 * This file proves the rows are **well-formed and cross-referencing** —
 * the premises, the businesses, the exits and the parcels point at each
 * other — and it proves the one thing that is easy to get silently
 * wrong: **three vacancies that a `look` can actually read.** A business
 * with an empty roster and no boot entry is a vacancy nobody can see,
 * which is the shape that cost the campus farm a whole build.
 *
 * ⭐ And it pins the seat LADDER, which is the district's content: one
 * seat anybody can take and two you have to have earned, with the wages
 * running the other way.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const CONTENT = fileURLToPath(new URL('../../content/', import.meta.url));
const WHARFSIDE = `${CONTENT}world/terminus/wharfside`;
const PACK = fileURLToPath(new URL('../../pack.yaml', import.meta.url));

interface Doc {
  class: string;
  data: Record<string, unknown>;
}

function doc(file: string): Doc {
  return YAML.parse(readFileSync(file, 'utf8')) as Doc;
}

interface Position {
  key: string;
  wageRate: number;
  requires?: { discipline?: string; band?: string; gigs?: number };
}

function outfit(premises: string): Doc & {
  data: { positions: Position[]; rosterSlots: unknown[] };
} {
  return doc(`${WHARFSIDE}/${premises}/idea/outfit.yaml`) as Doc & {
    data: { positions: Position[]; rosterSlots: unknown[] };
  };
}

const PREMISES = ['knackers', 'tannery', 'chandlery'] as const;

describe('three premises, and all three are VACANT', () => {
  it('⭐⭐ every one rosters nobody — the work is there and nobody is doing it', () => {
    for (const p of PREMISES) {
      const o = outfit(p);
      expect(o.class, p).toBe('/platform/idea/Business');
      expect(o.data.rosterSlots, p).toEqual([]);
      expect(o.data.positions.length, p).toBe(1);
    }
  });

  it('⚠⚠ and every one is a BOOT PRODUCER, or the vacancy is invisible', () => {
    // The derived help-wanted sign reads LIVE businesses only (a `look`
    // may not stand a house up), and a business advertises into a ROOM —
    // so both halves need warming or `look` shows nothing. This is the
    // exact pairing `lint:openings` holds, and the exact shape that cost
    // the campus farm a build.
    const pack = readFileSync(PACK, 'utf8');
    for (const p of PREMISES) {
      expect(pack, `${p} outfit`).toContain(
        `/world/terminus/wharfside/${p}/idea/outfit, role: producer`,
      );
    }
    expect(pack).toContain(
      '/world/terminus/wharfside/knackers/location/yard, role: producer',
    );
    expect(pack).toContain(
      '/world/terminus/wharfside/tannery/location/yard, role: producer',
    );
    expect(pack).toContain(
      '/world/terminus/wharfside/chandlery/location/floor, role: producer',
    );
  });
});

describe('the seat ladder — one you can take, two you must earn', () => {
  it('⭐⭐ the CHANDLER has no requirement at all', () => {
    // The pack mints no Discipline, because dipping a wick in fat is not
    // a skill and what is hard is buying the right fat at the right
    // price. So this is the seat a player who has just arrived can sit
    // in — and the one the drive takes, because it proves `apply` works
    // end to end without first proving a Discipline.
    const chandler = outfit('chandlery').data.positions[0]!;
    expect(chandler.key).toBe('chandler');
    expect(chandler.requires).toBeUndefined();
  });

  it('⭐ the TANNER needs leatherwork at novice — the Discipline this build mints', () => {
    const tanner = outfit('tannery').data.positions[0]!;
    expect(tanner.key).toBe('tanner');
    expect(tanner.requires?.discipline).toBe('leatherwork');
    expect(tanner.requires?.band).toBe('novice');
  });

  it('⭐ the KNACKER needs butchery at novice — the most reachable of the two', () => {
    // The kitchen's `butcher` credits it, so anybody who has ever
    // dressed a rabbit has begun. Which makes this the first gated seat a
    // player can actually reach.
    const knacker = outfit('knackers').data.positions[0]!;
    expect(knacker.key).toBe('knacker');
    expect(knacker.requires?.discipline).toBe('butchery');
    expect(knacker.requires?.band).toBe('novice');
  });

  it('⭐⭐ and the WAGES run the other way — unpleasant work pays', () => {
    // The knacker's 6 beats the tanner's 5 beats the chandler's 4. A
    // trade that stinks and that everybody needs is a trade that pays,
    // which is the honest economics of a LULU and the first thing a
    // player notices about the district.
    const wage = (p: (typeof PREMISES)[number]): number =>
      outfit(p).data.positions[0]!.wageRate;
    expect(wage('knackers')).toBeGreaterThan(wage('tannery'));
    expect(wage('tannery')).toBeGreaterThan(wage('chandlery'));
  });
});

describe('the chain — each one\'s product is the next one\'s feedstock', () => {
  it('⭐⭐ ONE exit off the bank, and the three chain from the knacker', () => {
    // Better geography than three spokes: a player who follows the goods
    // walks the supply chain in the order it runs.
    const bank = doc(`${WHARFSIDE}/bank.yaml`);
    const exits = bank.data['exits'] as Record<
      string,
      { destination: string }
    >;
    expect(exits['down']!.destination).toBe(
      '/world/terminus/wharfside/knackers/location/yard',
    );
    const ways = Object.values(exits).map((e) => e.destination);
    expect(ways).not.toContain(
      '/world/terminus/wharfside/tannery/location/yard',
    );
    expect(ways).not.toContain(
      '/world/terminus/wharfside/chandlery/location/floor',
    );
  });

  it('⭐ the knacker reaches both, and both reach back', () => {
    const yard = doc(`${WHARFSIDE}/knackers/location/yard.yaml`);
    const out = Object.values(
      yard.data['exits'] as Record<string, { destination: string }>,
    ).map((e) => e.destination);
    expect(out).toContain('/world/terminus/wharfside/tannery/location/yard');
    expect(out).toContain(
      '/world/terminus/wharfside/chandlery/location/floor',
    );
    expect(out).toContain('/world/terminus/wharfside/bank');

    for (const p of ['tannery/location/yard', 'chandlery/location/floor']) {
      const back = Object.values(
        doc(`${WHARFSIDE}/${p}.yaml`).data['exits'] as Record<
          string,
          { destination: string }
        >,
      ).map((e) => e.destination);
      expect(back, p).toContain(
        '/world/terminus/wharfside/knackers/location/yard',
      );
    }
  });

  it('⚠ every edge carries `media` and `edgeMinutes` — or no hauler can be routed', () => {
    // A floor the lane graph cannot see is a floor goods cannot reach,
    // and a knacker who cannot be reached by a cart is a knacker with no
    // trade.
    for (const p of [
      'knackers/location/yard',
      'tannery/location/yard',
      'chandlery/location/floor',
    ]) {
      const exits = doc(`${WHARFSIDE}/${p}.yaml`).data['exits'] as Record<
        string,
        { media?: string[]; edgeMinutes?: number }
      >;
      for (const [dir, e] of Object.entries(exits)) {
        expect(e.media, `${p} ${dir}`).toContain('ground');
        expect(e.edgeMinutes, `${p} ${dir}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('the premises have what the trades need', () => {
  it('⭐ the tanyard has pits and running water', () => {
    const props = doc(`${WHARFSIDE}/tannery/location/yard.yaml`).data[
      'props'
    ] as string[];
    expect(props).toContain('/trade/tanning/thing/tanpit');
    expect(props).toContain('/world/terminus/wharfside/tannery/thing/leat');
  });

  it('⭐⭐ the knacker has the SHIPPED block and pot — no new rows', () => {
    // A knacker is a venue and a seat, not a third pack: the mechanism
    // is already shipped, so what the yard needs is cooking's own block
    // and pot. *Trade is the mechanism; locality is the expression.*
    const props = doc(`${WHARFSIDE}/knackers/location/yard.yaml`).data[
      'props'
    ] as string[];
    expect(props).toContain('/trade/cooking/thing/butcher-block');
    expect(props).toContain('/trade/cooking/thing/tallow-crock');
    // ⭐ And the works-board, because a 70 kg carcass cannot be carried:
    // a knacker does not fetch, he posts a job and somebody brings it.
    expect(props).toContain('/trade/haulage/thing/works-board');
  });

  it('⭐ the chandlery has the pot and the district\'s only shop front', () => {
    const props = doc(`${WHARFSIDE}/chandlery/location/floor.yaml`).data[
      'props'
    ] as string[];
    expect(props).toContain('/trade/chandlery/thing/dip-pot');
    expect(props).toContain(
      '/world/terminus/wharfside/chandlery/thing/counter',
    );
    const counter = doc(`${WHARFSIDE}/chandlery/thing/counter.yaml`);
    expect(counter.class).toBe('/trade/shopkeeping/thing/Stock');
    const lines = counter.data['stockLines'] as {
      itemTemplatePath: string;
    }[];
    expect(lines.map((l) => l.itemTemplatePath)).toEqual([
      '/trade/chandlery/thing/candle',
    ]);
  });

  it('⚠ all three are titled INDUSTRIAL inside the industrial district', () => {
    // `settlement-model`'s own test for industrial is *what LEAVES*.
    const pack = readFileSync(PACK, 'utf8');
    for (const p of PREMISES) {
      const line = pack
        .split('\n')
        .find((l) => l.includes(`extent: /world/terminus/wharfside/${p},`));
      expect(line, p).toBeDefined();
      expect(line!, p).toContain('landUse: industrial');
      expect(line!, p).toContain('parentParcel: /world/terminus/wharfside');
    }
  });
});
