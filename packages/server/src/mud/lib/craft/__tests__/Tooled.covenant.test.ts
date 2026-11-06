/**
 * ⭐ The epoch covenant's reader: a region that admits nothing
 * later than medieval refuses the printer and admits the pen; a tool with no
 * epoch, or a region with no covenant, is admitted everywhere.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import Good from '../../stuff/Good';
import { ToolMixin } from '../Tooled';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

class Instrument extends ToolMixin(Good) {
  static _mixinName = 'CovenantTestInstrument';
}

afterEach(() => StuffApi.clearAll());

function placeUnder(through: string | null): Stuff {
  return { getZone: () => ({ lookupField: async () => through }) } as unknown as Stuff;
}

function tool(epoch: 'medieval' | 'industrial' | 'modern' | null): Instrument {
  return makeStuff(() => {
    const t = new Instrument();
    t.setEpoch(epoch);
    return t;
  });
}

describe('⭐ admittedAt', () => {
  it('a medieval covenant refuses the printer, naming the covenant, and admits the pen', async () => {
    const quarter = placeUnder('medieval');
    expect(await tool('modern').admittedAt(quarter)).toMatch(/admits nothing later than medieval/);
    expect(await tool('industrial').admittedAt(quarter)).toMatch(/medieval/);
    expect(await tool('medieval').admittedAt(quarter)).toBeNull();
  });

  it('no covenant, or no stamp, admits everything', async () => {
    expect(await tool('modern').admittedAt(placeUnder(null))).toBeNull();
    expect(await tool(null).admittedAt(placeUnder('medieval'))).toBeNull();
  });
});
