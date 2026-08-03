/**
 * DurableMixin.isBroken — the broken state is capability loss, not a new
 * state machine: one threshold dial (`crafting.brokenThreshold`, literal
 * fallback), `ToolMixin.hasCapability` goes dark below it, and repair
 * (`setCondition`) reverses it with no residue.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { AppApi } from '../../../api/app';
import ToolItem from '../../../obj/ToolItem';
import { AppSettingKeys } from '../../config/AppSettings';
import { makeStuff } from '../../security/__tests__/test-setup';
import { StuffApi } from '../../../api/stuff';

function makeShaker(): ToolItem {
  const t = makeStuff(() => new ToolItem());
  t.setCapabilities(['shaker']);
  return t;
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('DurableMixin.isBroken', () => {
  it('breaks at/below the fallback threshold (0.1) and not above', () => {
    const t = makeShaker();
    expect(t.isBroken()).toBe(false);
    t.setCondition(0.11);
    expect(t.isBroken()).toBe(false);
    t.setCondition(0.1);
    expect(t.isBroken()).toBe(true);
    t.setCondition(0);
    expect(t.isBroken()).toBe(true);
  });

  it('reads the crafting.brokenThreshold dial when seeded', () => {
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === AppSettingKeys.craftingBrokenThreshold ? '0.5' : '',
    );
    const t = makeShaker();
    t.setCondition(0.4);
    expect(t.isBroken()).toBe(true);
    t.setCondition(0.6);
    expect(t.isBroken()).toBe(false);
  });

  it('a broken tool offers no capabilities; repair restores them', () => {
    const t = makeShaker();
    expect(t.hasCapability('shaker')).toBe(true);
    t.setCondition(0.05);
    expect(t.isBroken()).toBe(true);
    expect(t.hasCapability('shaker')).toBe(false);
    // Repair (ceiling-free setCondition) reverses the loss.
    t.setCondition(1);
    expect(t.hasCapability('shaker')).toBe(true);
  });

  it('wear() drives a tool into the broken band (use, never the clock)', () => {
    const t = makeShaker();
    for (let i = 0; i < 89; i++) t.wear(0.01);
    expect(t.isBroken()).toBe(false); // 0.11 — still serviceable
    t.wear(0.01);
    expect(t.isBroken()).toBe(true); // 0.10 — at the threshold
  });
});
