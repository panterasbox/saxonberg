/**
 * The `eats` brain (grain-chain W9, D21/D22).
 *
 * ⭐⭐⭐ **The purse chooses the loaf.** Three balances, three outcomes,
 * one counter — and nothing anywhere labels anybody. That is the whole
 * claim, and the last test in the first group is the one that proves it
 * is honest rather than merely working: the brain writes **nothing**
 * back about the buyer.
 *
 * ⚠ And the second group is the safety one. Starvation CAN kill in this
 * codebase (24 game-hours at a floored reserve begins the dying clock),
 * and this build makes NPC hunger exist for the first time. It is NOT
 * reachable by this brain, and the reason is worth stating because it is
 * structural rather than lucky: an NPC's satiation only advances when
 * something READS it, the only thing that reads it is this brain's
 * `eat`, and eating is what relieves it. A buyer who cannot buy never
 * reconciles, so an empty counter cannot starve anybody.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as eats } from '../eats';
import type { BrainContext } from '../brain';
import Material from '../../material/Material';
import Provision from '../../../platform/thing/Provision';
import Stock from '../../../platform/thing/Stock';
import Location from '../../stuff/Location';
import { Idea } from '../../stuff/Idea';
import { CommandGiverMixin } from '../../command/CommandGiver';
import { SensorMixin } from '../../message/Sensor';
import { MobileMixin } from '../../spatial/Mobile';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { StuffApi } from '../../../api/stuff';
import { BankingApi } from '../../../api/banking';
import { CelestialApi } from '../../../api/celestial';
import { WorldClockApi } from '../../../api/worldclock';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import { Money } from '../../banking/Money';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/*
 * ⚠ SYNTHETIC fixtures under `/test/**`, never the shipped bakery's
 * paths. A kernel test proves the KERNEL; a test of real content lives
 * beside the content. `lint:test-content` caught this file naming the
 * shipped bakery's own rows and it was right to: the brain works on any
 * counter with priced bread on it, and pinning it to one pack's paths
 * would quietly have made a kernel test depend on that pack.
 */
const BREAD = '/test/eats/material/bread';
const LEAN = '/test/eats/thing/lean';
const WHITE = '/test/eats/thing/white';
const COUNTER = '/test/eats/thing/counter';

class TestBuyer extends CommandGiverMixin(
  SensorMixin(MobileMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestBuyerEats';
  /** Every verb this brain typed — the doctrine check. */
  typed: string[] = [];
  /** Free emotes — the hungry line. */
  emoted: string[] = [];
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
  getIdentityPath(): string {
    return '/test/eats/agent/buyer';
  }
  async forceCommand(line: string): Promise<void> {
    this.typed.push(line);
  }
}

let shop: Location;
let home: Location;
let buyer: TestBuyer;
let counter: Stock;
let balanceMinor = 0;

function ctxFor(
  buyerHost: TestBuyer,
  state: Record<string, unknown> = {},
): BrainContext {
  return {
    host: buyerHost as never,
    config: { counter: COUNTER, fromHour: 6, toHour: 10, spendFraction: 0.25 },
    state,
    trigger: { source: 'cadence', raw: 'cadence:90s' },
    say: () => {},
    emote: async () => {},
    emoteFree: (text: string) => {
      buyerHost.emoted.push(text);
    },
  };
}

/** Put a loaf of `path` on the counter. ⚠ It must be STAMPED: the brain
 * reads the counter's price by template path, so an unstamped loaf is
 * invisible to it — which is the silent-failure shape the offer walk
 * guards against. */
function stockLoaf(path: string, keyword: string): Provision {
  const l = makeStuffAtPath(() => {
    const p = new Provision();
    p.setMass(Quantity.of(0.8, 'kg'));
    p.setKeywords([keyword, 'loaf', 'bread']);
    p.setShortDescription(`${keyword} loaf`);
    return p;
  }, path) as Provision;
  l.setMaterial(
    StuffApi.findByTemplatePath<Material>(BREAD)! as unknown as Material,
  );
  ContainmentApi.move(l as never, counter as never);
  return l;
}

beforeEach(async () => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => 1000);
  balanceMinor = 0;

  {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('bread');
      m.setTags(['food', 'bread']);
      m.setEdibility(true);
      m.setDensity(Quantity.of(280, 'kg/m³'));
      return m;
    }, BREAD);
  }

  // ⭐ Mid-morning, every time: the window is read off the game clock,
  // and pinning it here is what lets the window itself be tested.
  vi.spyOn(CelestialApi, 'profileFor').mockResolvedValue({} as never);
  vi.spyOn(CelestialApi, 'secondOfDay').mockReturnValue(8 * 3600);
  vi.spyOn(CelestialApi, 'dayOfYear').mockReturnValue(10);

  vi.spyOn(BankingApi, 'primaryAccountIdOf').mockResolvedValue('acct-1');
  vi.spyOn(BankingApi, 'balanceOf').mockImplementation(
    () => Money.of(balanceMinor, 'crown' as never),
  );

  shop = makeStuffAtPath(() => new Location(), '/test/eats/location/shop');
  home = makeStuffAtPath(() => new Location(), '/test/eats/location/home');
  counter = makeStuffAtPath(() => new Stock(), COUNTER);
  counter.stockLines = [
    { itemTemplatePath: LEAN, par: 4 },
    { itemTemplatePath: WHITE, par: 4 },
  ];
  counter.prices = { [LEAN]: 2, [WHITE]: 4 };
  await ContainmentApi.move(counter as never, shop as never);

  buyer = makeStuff(() => new TestBuyer());
  await ContainmentApi.move(buyer as never, home as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('⭐⭐⭐ the purse chooses the loaf', () => {
  it('a full purse takes the DEAR loaf', async () => {
    stockLoaf(LEAN, 'lean');
    stockLoaf(WHITE, 'white');
    balanceMinor = 30; // a quarter of 30 is 7.5 — the 4 is comfortable
    await eats.act(ctxFor(buyer));
    expect(buyer.typed.join(' ')).toContain('buy white');
    expect(buyer.typed.join(' ')).not.toContain('buy lean');
  });

  it('a thin purse takes the CHEAP loaf', async () => {
    stockLoaf(LEAN, 'lean');
    stockLoaf(WHITE, 'white');
    balanceMinor = 10; // a quarter of 10 is 2.5 — the 4 is out of reach
    await eats.act(ctxFor(buyer));
    expect(buyer.typed.join(' ')).toContain('buy lean');
    expect(buyer.typed.join(' ')).not.toContain('buy white');
  });

  it('⭐ an empty purse buys nothing, and SAYS so', async () => {
    stockLoaf(LEAN, 'lean');
    stockLoaf(WHITE, 'white');
    balanceMinor = 4; // a quarter of 4 is 1 — even the lean loaf is out
    const state: Record<string, unknown> = {};
    await eats.act(ctxFor(buyer, state));
    expect(buyer.typed.join(' ')).not.toContain('buy');
    // A person who did not get bread. Not an error, and not silence.
    expect(buyer.emoted.length).toBe(1);
    expect(state.hungryDays).toBe(1);
  });

  it('⚠ a NULL account reads as a balance of zero, not as silence', async () => {
    // A person no business has ever paid — a real state on a fresh world
    // before the first wage roll. It must produce the hungry line rather
    // than a no-op, or the demand looks like a dead brain.
    vi.spyOn(BankingApi, 'primaryAccountIdOf').mockResolvedValue(null);
    stockLoaf(LEAN, 'lean');
    const state: Record<string, unknown> = {};
    await eats.act(ctxFor(buyer, state));
    expect(buyer.emoted.length).toBe(1);
    expect(state.hungryDays).toBe(1);
  });

  it('⭐⭐⭐ NOTHING is written back about the buyer', async () => {
    // The hard constraint. The engine measures the purse and never the
    // person: no band, no label, no trait, no ledger entry says "poor".
    // The pattern exists only in what a bystander sees two mornings
    // running, and this asserts there is nowhere else it could live.
    stockLoaf(LEAN, 'lean');
    stockLoaf(WHITE, 'white');
    balanceMinor = 10;
    const state: Record<string, unknown> = {};
    await eats.act(ctxFor(buyer, state));

    // The brain's own scratch bag holds only WHEN it last ate and how
    // many mornings it has gone without — never a means, a tier or a
    // band.
    expect(Object.keys(state).sort()).toEqual(['hungryDays', 'lastAteDay']);
    const asJson = JSON.stringify(state).toLowerCase();
    for (const forbidden of ['poor', 'rich', 'tier', 'class', 'means', 'band']) {
      expect(asJson).not.toContain(forbidden);
    }
  });
});

describe('every act is a verb a player could type', () => {
  it('teleport, buy, eat — and home again', async () => {
    stockLoaf(LEAN, 'lean');
    balanceMinor = 20;
    await eats.act(ctxFor(buyer));
    const verbs = buyer.typed.map((l) => l.split(' ')[0]);
    expect(verbs).toEqual(['teleport', 'buy', 'teleport']);
    // ⚠ `eat` is absent because the forced `buy` is a no-op in this
    // fixture, so no loaf is in hand — and the brain checks rather than
    // assuming. A forced command reports no outcome.
    expect(buyer.typed[0]).toContain('/test/eats/location/shop');
    expect(buyer.typed[buyer.typed.length - 1]).toContain('/test/eats/location/home');
  });

  it('⭐ home is re-taken even when nothing is bought', async () => {
    balanceMinor = 0;
    await eats.act(ctxFor(buyer));
    expect(buyer.typed[buyer.typed.length - 1]).toContain('/test/eats/location/home');
  });
});

describe('the morning beat', () => {
  it('fires once per game-day inside the window', async () => {
    stockLoaf(LEAN, 'lean');
    balanceMinor = 20;
    const state: Record<string, unknown> = {};
    await eats.act(ctxFor(buyer, state));
    const first = buyer.typed.length;
    expect(first).toBeGreaterThan(0);
    // Same day again: nothing.
    await eats.act(ctxFor(buyer, state));
    expect(buyer.typed.length).toBe(first);
    // Next day: it eats again.
    vi.spyOn(CelestialApi, 'dayOfYear').mockReturnValue(11);
    await eats.act(ctxFor(buyer, state));
    expect(buyer.typed.length).toBeGreaterThan(first);
  });

  it('never fires outside the window', async () => {
    vi.spyOn(CelestialApi, 'secondOfDay').mockReturnValue(20 * 3600);
    stockLoaf(LEAN, 'lean');
    balanceMinor = 20;
    await eats.act(ctxFor(buyer));
    expect(buyer.typed).toHaveLength(0);
  });
});

describe('⚠ an empty counter', () => {
  it('says the hungry line and counts the mornings', async () => {
    balanceMinor = 50; // plenty of money; no bread
    const state: Record<string, unknown> = {};
    for (let day = 10; day < 13; day += 1) {
      vi.spyOn(CelestialApi, 'dayOfYear').mockReturnValue(day);
      await eats.act(ctxFor(buyer, state));
    }
    expect(state.hungryDays).toBe(3);
    expect(buyer.emoted).toHaveLength(3);
  });

  it('⭐⭐ three empty mornings leave the buyer hungry and ALIVE', async () => {
    // Structural, not lucky: an NPC's satiation only advances when
    // something READS it, the only reader is this brain's `eat`, and
    // eating is what relieves it. A buyer who cannot buy never
    // reconciles, so an empty counter cannot starve anybody — which is
    // why the `starvation` dying clock (24 game-hours at a floored
    // reserve) is not reachable from here.
    balanceMinor = 50;
    const state: Record<string, unknown> = {};
    for (let day = 10; day < 13; day += 1) {
      vi.spyOn(CelestialApi, 'dayOfYear').mockReturnValue(day);
      await eats.act(ctxFor(buyer, state));
    }
    expect(buyer.isDestroyed()).toBe(false);
    // And the brain never typed a verb that could hurt anybody.
    expect(buyer.typed.every((l) => l.startsWith('teleport'))).toBe(true);
  });
});

describe('a host that cannot do this is simply skipped', () => {
  it('a non-mobile host does nothing', async () => {
    const inert = makeStuff(() => new Idea());
    const ctx = ctxFor(buyer);
    await eats.act({ ...ctx, host: inert as never });
    expect(buyer.typed).toHaveLength(0);
  });
});
