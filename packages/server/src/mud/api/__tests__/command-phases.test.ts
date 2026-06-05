/**
 * `command-phases` substrate tests — exercises the vocabulary,
 * load-time validator (`validatePhaseEffect`), and the effect-
 * collection helper (`collectPhaseEffects`).
 *
 * Runtime-side throws (`consumePhaseEffects` in command.ts) are
 * exercised by the dispatcher tests and `LookController.peek` —
 * here we're verifying the pure-data layer.
 */

import { describe, it, expect } from 'vitest';
import {
  COMMAND_PHASES,
  HOOKABLE_PHASES,
  IMPLEMENTED_REPLACE_HANDLERS,
  REPLACE_HANDLERS,
  collectPhaseEffects,
  validatePhaseEffect,
  type PhaseEffect,
} from '../command-phases';

describe('command-phases vocabulary', () => {
  it('includes the documented phases', () => {
    expect(COMMAND_PHASES).toEqual([
      'focus-update',
      'validate',
      'confirm-prompt',
      'dispatch',
      'emit-scene',
    ]);
  });

  it('focus-update is hookable today; the other phases are placeholders', () => {
    expect(HOOKABLE_PHASES.has('focus-update')).toBe(true);
    expect(HOOKABLE_PHASES.has('dispatch')).toBe(false);
    expect(HOOKABLE_PHASES.has('validate')).toBe(false);
    expect(HOOKABLE_PHASES.has('confirm-prompt')).toBe(false);
    expect(HOOKABLE_PHASES.has('emit-scene')).toBe(false);
  });

  it('replace handlers are documented; none are implemented yet', () => {
    expect(REPLACE_HANDLERS).toEqual(['deferred-dispatch', 'explain-plan']);
    expect(IMPLEMENTED_REPLACE_HANDLERS.size).toBe(0);
  });
});

describe('validatePhaseEffect', () => {
  it('accepts a well-formed skip effect', () => {
    expect(
      validatePhaseEffect({ phase: 'focus-update', action: 'skip' })
    ).toBeNull();
  });

  it('accepts a well-formed replace effect', () => {
    expect(
      validatePhaseEffect({
        phase: 'dispatch',
        action: 'replace',
        with: 'deferred-dispatch',
      })
    ).toBeNull();
  });

  it('rejects unknown phase names', () => {
    const msg = validatePhaseEffect({ phase: 'bogus', action: 'skip' });
    expect(msg).toContain('bogus');
    expect(msg).toContain('not one of');
  });

  it('rejects non-string actions', () => {
    expect(
      validatePhaseEffect({ phase: 'focus-update', action: 42 })
    ).toMatch(/action must be/);
  });

  it('rejects unknown actions', () => {
    expect(
      validatePhaseEffect({ phase: 'focus-update', action: 'wrap' })
    ).toMatch(/action must be 'skip' or 'replace'/);
  });

  it("rejects 'replace' without a 'with' handler name", () => {
    expect(
      validatePhaseEffect({ phase: 'dispatch', action: 'replace' })
    ).toMatch(/requires a string 'with'/);
  });

  it("rejects 'replace' with an unknown handler name", () => {
    expect(
      validatePhaseEffect({
        phase: 'dispatch',
        action: 'replace',
        with: 'made-up-handler',
      })
    ).toMatch(/made-up-handler/);
  });

  it("rejects 'skip' carrying a stray 'with'", () => {
    expect(
      validatePhaseEffect({
        phase: 'focus-update',
        action: 'skip',
        with: 'deferred-dispatch',
      })
    ).toMatch(/'skip' does not accept 'with'/);
  });

  it('rejects non-object values', () => {
    expect(validatePhaseEffect(null)).toMatch(/must be an object/);
    expect(validatePhaseEffect('skip')).toMatch(/must be an object/);
    expect(validatePhaseEffect(undefined)).toMatch(/must be an object/);
  });
});

describe('collectPhaseEffects', () => {
  const peekEffects: PhaseEffect[] = [
    { phase: 'focus-update', action: 'skip' },
  ];

  it('returns matching effects when the option is truthy', () => {
    const out = collectPhaseEffects(
      'focus-update',
      { peek: true },
      { peek: { effects: peekEffects } }
    );
    expect(out).toEqual(peekEffects);
  });

  it('skips effects when the option value is falsy', () => {
    expect(
      collectPhaseEffects(
        'focus-update',
        { peek: false },
        { peek: { effects: peekEffects } }
      )
    ).toEqual([]);
    expect(
      collectPhaseEffects(
        'focus-update',
        { peek: undefined },
        { peek: { effects: peekEffects } }
      )
    ).toEqual([]);
  });

  it('only returns effects whose phase matches the requested phase', () => {
    const mixed: PhaseEffect[] = [
      { phase: 'focus-update', action: 'skip' },
      { phase: 'dispatch', action: 'replace', with: 'explain-plan' },
    ];
    expect(
      collectPhaseEffects(
        'focus-update',
        { multi: true },
        { multi: { effects: mixed } }
      )
    ).toEqual([{ phase: 'focus-update', action: 'skip' }]);
    expect(
      collectPhaseEffects(
        'dispatch',
        { multi: true },
        { multi: { effects: mixed } }
      )
    ).toEqual([{ phase: 'dispatch', action: 'replace', with: 'explain-plan' }]);
  });

  it('walks multiple options independently', () => {
    const out = collectPhaseEffects(
      'focus-update',
      { peek: true, other: true },
      {
        peek: { effects: [{ phase: 'focus-update', action: 'skip' }] },
        other: { effects: [{ phase: 'dispatch', action: 'skip' }] },
      }
    );
    expect(out).toEqual([{ phase: 'focus-update', action: 'skip' }]);
  });

  it('returns an empty array when no option has effects', () => {
    expect(
      collectPhaseEffects(
        'focus-update',
        { peek: true },
        { peek: { effects: [] } }
      )
    ).toEqual([]);
    expect(
      collectPhaseEffects('focus-update', { peek: true }, { peek: {} })
    ).toEqual([]);
  });
});
