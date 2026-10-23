/**
 * TestHooks.nourishCharacter — the meals between a drive's checkpoints.
 * A route for the clock's reason: a parcel-bound `eval` may not read the
 * biome a body's reconcile reads (the ceramics drives, run 18).
 */

import '../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestHooks } from '../TestHooks';
import { PlayerApi } from '../../mud/api/player';
import { MixinApi } from '../../mud/api/mixin';
import { Quantity } from '../../mud/lib/quantity';
import type Avatar from '../../mud/lib/character/Avatar';

/** A body with the three reserves a meal tops up, at `level` of a 100 % capacity. */
function body(level: number) {
  const reserves: Record<string, number> = { satiation: level, hydration: level, 'vitamin-c': level };
  return {
    getReserve: (k: string) =>
      k in reserves
        ? { capacity: Quantity.of(100, '%'), current: Quantity.of(reserves[k]!, '%') }
        : undefined,
    adjustReserve: (k: string, d: Quantity<'%'>) => {
      reserves[k] = Math.min(100, (reserves[k] ?? 0) + d.rawValue());
    },
  };
}

describe('TestHooks.nourishCharacter', () => {
  beforeEach(() => {
    process.env.AUTH_MODE = 'test';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.env.AUTH_MODE = 'test';
  });

  it('⭐ tops satiation, hydration and vitamin C up to capacity (scurvy killed a drive, run 20)', () => {
    vi.spyOn(PlayerApi, 'findAvatarByName').mockReturnValue(body(12) as unknown as Avatar);
    vi.spyOn(MixinApi, 'isReserved').mockReturnValue(true);
    expect(TestHooks.nourishCharacter('wire-potter')).toEqual({ satiation: 100, hydration: 100, 'vitamin-c': 100 });
  });

  it('⭐ tends an open burn with its own resolution — not a dressed one (run 27 bled out of a scald)', () => {
    const b = body(50) as ReturnType<typeof body> & {
      getConditions(): unknown[];
      applyTreatment: ReturnType<typeof vi.fn>;
    };
    const burn = { kind: 'trauma', type: 'burn', site: 'body.hand', severity: 2, dressed: false };
    const cut = { kind: 'trauma', type: 'laceration', site: 'body.arm', severity: 1, dressed: true };
    b.getConditions = () => [burn, cut];
    b.applyTreatment = vi.fn();
    vi.spyOn(PlayerApi, 'findAvatarByName').mockReturnValue(b as unknown as Avatar);
    vi.spyOn(MixinApi, 'isReserved').mockReturnValue(true);
    vi.spyOn(MixinApi, 'isVitals').mockReturnValue(true);
    TestHooks.nourishCharacter('wire-caster');
    expect(b.applyTreatment).toHaveBeenCalledTimes(1);
    expect(b.applyTreatment).toHaveBeenCalledWith(burn, { by: 'fluid', efficacy: 1 });
  });

  it('⭐ dries the body and what it WEARS — never what it carries (runs 26 and 28 died sodden)', () => {
    const coat = { wet: vi.fn() };
    const b = body(50) as ReturnType<typeof body> & {
      wet: ReturnType<typeof vi.fn>;
      wornStack(): unknown[];
    };
    b.wet = vi.fn();
    b.wornStack = () => [coat];
    vi.spyOn(PlayerApi, 'findAvatarByName').mockReturnValue(b as unknown as Avatar);
    vi.spyOn(MixinApi, 'isReserved').mockReturnValue(true);
    vi.spyOn(MixinApi, 'isWet').mockReturnValue(true);
    vi.spyOn(MixinApi, 'isAttired').mockReturnValue(true);
    TestHooks.nourishCharacter('wire-brickmaker');
    expect(b.wet).toHaveBeenCalledWith(-1);
    expect(coat.wet).toHaveBeenCalledWith(-1);
  });

  it('⚠ says so when nobody answers to the handle', () => {
    vi.spyOn(PlayerApi, 'findAvatarByName').mockReturnValue(undefined);
    expect(() => TestHooks.nourishCharacter('nobody')).toThrow(/no resident character/i);
  });

  it('⛔ refuses outright when AUTH_MODE is not test', () => {
    delete process.env.AUTH_MODE;
    expect(() => TestHooks.nourishCharacter('wire-potter')).toThrow(/test-only/i);
  });
});
