import "../../../test-bootstrap";
import { StuffApi } from '../../api/stuff';
import { describe, it, expect, beforeEach } from 'vitest';
import Window from '../thing/Window';
import { seedKernelContentStore } from '../../lib/security/__tests__/test-setup';

/** A window's smell reads the glass like light does: base × grime, nothing shut. */
describe('Window — smell through the glass', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  it('closed shutter blocks smell', async () => {
    const w = await StuffApi.create(() => new Window());
    w.close();
    expect(w.transmissivity('smell', 'A', 'B')).toBe(0);
  });

  it('open shutter transmits smell (mirrors light transmissivity)', async () => {
    const w = await StuffApi.create(() => new Window());
    w.open();
    w.setBaseTransmissivity(0.7);
    expect(w.transmissivity('smell', 'A', 'B')).toBeCloseTo(0.7);
    expect(w.transmissivity('light', 'A', 'B')).toBeCloseTo(0.7);
  });
});
