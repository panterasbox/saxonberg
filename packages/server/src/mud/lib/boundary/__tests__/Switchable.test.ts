import { describe, it, expect } from 'vitest';
import { SwitchableMixin } from '../Switchable';
import { Idea } from '../../stuff/Idea';
import { MixinApi } from '../../../api/mixin';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestSwitchable extends SwitchableMixin(Idea) {}

describe('SwitchableMixin', () => {
  it('defaults to off', () => {
    const s = makeStuff(() => new TestSwitchable());
    expect(s.isOn()).toBe(false);
  });

  it('switchOn() and switchOff() flip state idempotently', () => {
    const s = makeStuff(() => new TestSwitchable());
    s.switchOn();
    expect(s.isOn()).toBe(true);
    s.switchOn();
    expect(s.isOn()).toBe(true);
    s.switchOff();
    expect(s.isOn()).toBe(false);
    s.switchOff();
    expect(s.isOn()).toBe(false);
  });

  it('setOn flips state and rejects non-boolean', () => {
    const s = makeStuff(() => new TestSwitchable());
    s.setOn(true);
    expect(s.isOn()).toBe(true);
    s.setOn(false);
    expect(s.isOn()).toBe(false);
    expect(() => s.setOn(1 as unknown as boolean)).toThrow(TypeError);
  });

  it('MixinApi.isSwitchable narrows correctly', () => {
    const s = makeStuff(() => new TestSwitchable());
    expect(MixinApi.isSwitchable(s)).toBe(true);
  });

  it('declares persistent field "on" (noun form)', () => {
    expect(
      (TestSwitchable as unknown as { persistentFields?: string[] })
        .persistentFields
    ).toContain('on');
  });
});
