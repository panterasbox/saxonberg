/**
 * ⚠ The blow a badly handled animal lands is on the HARM scale (the soak
 * lane, 2026-11-26): a wild cow cracks a rib against the rail, a wild ewe
 * bruises, and neither kills the person handling it. At 0.6 a kilogram a
 * ewe landed 20 and the carcass-chain knacker bled out in his own yard.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ConditionApi } from '@saxonberg/server/mud/api/condition';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { HandledMixin } from '../lib/Handled';

function animal(massKg: number, handling: number) {
  class Body {
    getHandling(): number {
      return handling;
    }
    getReserve(): null {
      return null;
    }
    handlingRisk(): number {
      return (1 - handling) * (1 - handling);
    }
    getMass(): { rawValue(): number } {
      return { rawValue: () => massKg };
    }
    handle(): void {}
    handlingPhrase(): string {
      return 'it will not stand for you';
    }
  }
  const C = HandledMixin(Body as never) as unknown as new () => { workedOver(a: Stuff): unknown };
  return new C();
}

describe('the blow a badly handled animal lands', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a wild cow cracks a rib; a wild ewe bruises — never a killing blow', () => {
    const energies: number[] = [];
    vi.spyOn(ConditionApi, 'inflict').mockImplementation(((_t: unknown, spec: { energy: number }) => {
      energies.push(spec.energy);
      return {} as never;
    }) as never);
    animal(600, 0.25).workedOver({} as Stuff);
    animal(60, 0.25).workedOver({} as Stuff);
    expect(energies).toHaveLength(2);
    const [cow, ewe] = energies as [number, number];
    expect(cow).toBeGreaterThan(5);
    expect(cow).toBeLessThanOrEqual(7); // the strongest authored trap is 6
    expect(ewe).toBeLessThan(1);
  });
});
