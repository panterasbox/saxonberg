import "../../../test-bootstrap";
import { StuffApi } from '../../api/stuff';
import { describe, it, expect, beforeEach } from 'vitest';
import Door from '../thing/Door';
import { seedKernelContentStore } from '../../lib/security/__tests__/test-setup';

/** A door's smell is a row of its channel table, gated on isOpen. */
describe('Door — smell through the channel table', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  it('closed door blocks smell (transmissivity 0) both ways', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setOpen(false);
    expect(door.transmissivity('smell', 'A', 'B')).toBe(0);
    expect(door.transmissivity('smell', 'B', 'A')).toBe(0);
  });

  it('open door transmits smell (transmissivity 1)', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setOpen(true);
    expect(door.transmissivity('smell', 'A', 'B')).toBe(1);
  });

  it('a row may let a little smell under a shut door', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setChannels({ shut: { smell: 0.2 } });
    expect(door.transmissivity('smell', 'A', 'B')).toBe(0.2);
  });
});
