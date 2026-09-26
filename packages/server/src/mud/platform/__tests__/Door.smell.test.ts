import "../../../test-bootstrap";
import { StuffApi } from '../../api/stuff';
import { describe, it, expect , beforeEach } from 'vitest';
import Door from '../thing/Door';
import {
  makeStuff,
  seedKernelContentStore,
} from '../../lib/security/__tests__/test-setup';
import type { SmellConduit } from '../../lib/boundary/SmellConduit';

describe('Door — SmellConduit gating', () => {
  beforeEach(() => {
    seedKernelContentStore();
  });

  it('exposes a smell conduit alongside the other three', async () => {
    const door = await StuffApi.create(() => new Door());
    const conduits = door.getConduits();
    const smell = conduits.find((c) => c.conduitKind === 'smell') as
      | SmellConduit
      | undefined;
    expect(smell).toBeDefined();
  });

  it('closed door blocks smell (transmissivity 0)', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setOpen(false);
    const smell = door
      .getConduits()
      .find((c) => c.conduitKind === 'smell') as SmellConduit;
    expect(smell.transmissivity('A', 'B')).toBe(0);
    expect(smell.transmissivity('B', 'A')).toBe(0);
  });

  it('open door transmits smell (transmissivity 1)', async () => {
    const door = await StuffApi.create(() => new Door());
    door.setOpen(true);
    const smell = door
      .getConduits()
      .find((c) => c.conduitKind === 'smell') as SmellConduit;
    expect(smell.transmissivity('A', 'B')).toBe(1);
  });
});
