/**
 * FocusedMixin field-change firing (Wave 2 of the inspection pane
 * build).
 *
 * Coverage:
 *   - `setFocus(value)` fires `FieldChangedEvent { field: 'focus' }`.
 *   - Equal-old-new `setFocus(value)` after the first call does NOT
 *     fire again (Object.is noop-skip via `fireFieldChange`).
 *   - `clearFocus()` from a drilled fragment fires; `clearFocus()`
 *     from the default `'here'` does not (same noop-skip rule).
 *   - Whitespace-only setFocus collapses to `'here'`; firing semantics
 *     follow the normalized value.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { CommandGiverMixin } from '../CommandGiver';
import { FocusedMixin } from '../Focused';
import { ContainableMixin } from '../../spatial/Containable';
import { SensorMixin } from '../../message/Sensor';
import { NamedMixin } from '../../description/Named';
import { PerceptibleMixin } from '../../description/Perceptible';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { EventApi } from '../../../api/event';
import { FieldChangedEvent } from '../../events/FieldChangedEvent';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestGiver extends FocusedMixin(
  CommandGiverMixin(
    SensorMixin(ContainableMixin(NamedMixin(PerceptibleMixin(Idea)))),
  ),
) {
  protected handleMessage(): void {}
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('FocusedMixin — focus field-change firing', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it("setFocus('apple') fires FieldChangedEvent { field: 'focus' }", async () => {
    await bootRegistry();
    const giver = makeStuff(() => new TestGiver());
    const seen: Array<{
      target: string;
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });

    giver.setFocus('apple');
    await flushMicrotasks();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      target: giver.stuffId,
      field: 'focus',
      oldValue: 'here',
      newValue: 'apple',
    });
  });

  it("equal-old-new setFocus('apple') does NOT fire again", async () => {
    await bootRegistry();
    const giver = makeStuff(() => new TestGiver());
    giver.setFocus('apple');
    await flushMicrotasks();

    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });

    giver.setFocus('apple');
    await flushMicrotasks();

    expect(seen).toEqual([]);
    expect(giver.getFocus()).toBe('apple');
  });

  it("clearFocus() from 'apple' fires; from 'here' does not", async () => {
    await bootRegistry();
    const giver = makeStuff(() => new TestGiver());
    giver.setFocus('apple');
    await flushMicrotasks();

    const seen: Array<{
      target: string;
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });

    giver.clearFocus();
    await flushMicrotasks();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      target: giver.stuffId,
      field: 'focus',
      oldValue: 'apple',
      newValue: 'here',
    });

    // Second clearFocus from 'here' is a no-op.
    seen.length = 0;
    giver.clearFocus();
    await flushMicrotasks();
    expect(seen).toEqual([]);
  });

  it('whitespace-only setFocus collapses to "here"; fires only on real change', async () => {
    await bootRegistry();
    const giver = makeStuff(() => new TestGiver());
    const seen: unknown[] = [];
    EventApi.on(FieldChangedEvent, (e) => {
      seen.push(e.payload);
    });

    // 'here' → 'here' (whitespace collapses) — no fire.
    giver.setFocus('   ');
    await flushMicrotasks();
    expect(seen).toEqual([]);
    expect(giver.getFocus()).toBe('here');

    // 'here' → 'apple' — one fire.
    giver.setFocus('apple');
    await flushMicrotasks();
    expect(seen).toHaveLength(1);

    // 'apple' → 'here' (whitespace collapses to 'here') — one fire.
    seen.length = 0;
    giver.setFocus('   ');
    await flushMicrotasks();
    expect(seen).toHaveLength(1);
    expect(giver.getFocus()).toBe('here');
  });
});
