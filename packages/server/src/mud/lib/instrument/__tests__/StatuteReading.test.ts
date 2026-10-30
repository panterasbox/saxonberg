/**
 * The one statute-measure rule (review R2-D9): the innermost polity that
 * declares a standard is whose it is, and off standard is one 5 % line.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import StatuteReading from '../StatuteReading';
import type { GovernmentDescriptor } from '../../../api/government';
import { makeStuff } from '../../security/__tests__/test-setup';

class Probe extends StatuteReading {
  static _mixinName = 'TestStatuteProbe';
  public declared(chain: GovernmentDescriptor[], keys: string[], units?: string[]) {
    return this.declaredStandard(chain, keys, units);
  }
  public stand(measured: number, standard: number) {
    return this.standing(measured, standard);
  }
}

const gov = (name: string, standards: { key: string; value: number; unit: string }[]) =>
  ({ key: name, name, seats: [], standards }) as unknown as GovernmentDescriptor;

describe('StatuteReading', () => {
  const probe = makeStuff(() => new Probe());

  it('the innermost polity that declares EVERY key, in one unit, is whose standard it is', () => {
    const city = gov('the City', [{ key: 'brick-length', value: 8, unit: 'in' }]); // incomplete
    const realm = gov('the Realm', [
      { key: 'brick-length', value: 9, unit: 'in' },
      { key: 'brick-width', value: 4.5, unit: 'in' },
    ]);
    const s = probe.declared([city, realm], ['brick-length', 'brick-width'], ['in', 'cm']);
    expect(s).toEqual({ values: { 'brick-length': 9, 'brick-width': 4.5 }, unit: 'in', where: 'the Realm' });
    expect(probe.declared([city], ['brick-length', 'brick-width'])).toBeNull();
    expect(probe.declared([gov('x', [{ key: 'cask', value: 25, unit: 'gal' }])], ['cask'], ['L'])).toBeNull();
  });

  it('off standard is one 5 % line', () => {
    expect(probe.stand(25, 25)).toBe('true');
    expect(probe.stand(26.2, 25)).toBe('true');
    expect(probe.stand(26.5, 25)).toBe('over');
    expect(probe.stand(23.5, 25)).toBe('short');
  });
});
