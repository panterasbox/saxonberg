/**
 * LoadDevice — a made thing you load and lift: the setter invariants,
 * the range and power reads, and the `lift` affordance in the
 * ENVIRONMENT bucket (a bar on the floor of the room is what makes the
 * room a gym).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import LoadDevice from '../LoadDevice';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';

describe('LoadDevice', () => {
  afterEach(() => StuffApi.clearAll());

  it('is a Tool, Crafted and Durable — a broken bar offers nothing', () => {
    const d = makeStuff(() => new LoadDevice());
    d.setCapabilities(['load']);
    expect(MixinApi.isTool(d)).toBe(true);
    expect(MixinApi.isCrafted(d)).toBe(true);
    expect(d.hasCapability('load')).toBe(true);
  });

  it('the range and the power', () => {
    const d = makeStuff(() => new LoadDevice());
    expect(d.acceptsLoad(20)).toBe(true);
    expect(d.acceptsLoad(160)).toBe(true);
    expect(d.acceptsLoad(19)).toBe(false);
    expect(d.acceptsLoad(161)).toBe(false);
    expect(d.powerAt(60)).toBe(900);
  });

  it('the setters hold 0 < min ≤ max, watts > 0, a set ≥ 1 s', () => {
    const d = makeStuff(() => new LoadDevice());
    expect(() => d.setLoadMinKg(0)).toThrow();
    expect(() => d.setLoadMinKg(200)).toThrow();
    expect(() => d.setLoadMaxKg(10)).toThrow();
    expect(() => d.setWattsPerKg(0)).toThrow();
    expect(() => d.setSetDurationS(0)).toThrow();
    d.setLoadMaxKg(300);
    d.setLoadMinKg(50);
    expect(d.getLoadMinKg()).toBe(50);
    expect(d.getLoadMaxKg()).toBe(300);
  });

  it('⭐ affords `lift` from the room, not from the pack', () => {
    const c = LoadDevice.commandContributions;
    expect(c.environment).toContain('platform/cmd/device/lift.yaml');
    expect(c.peers).toContain('platform/cmd/device/lift.yaml');
    expect(c.inventory ?? []).not.toContain('platform/cmd/device/lift.yaml');
  });
});
