/**
 * ⭐⭐ **The intake's own extensibility, asserted.**
 *
 * The char-gen payload is now a generic field list projected from the
 * server's `FIELDS` table, so the client no longer knows which fields
 * exist. That buys a great deal — a new concept is one server table
 * entry — but it creates a failure mode the closed union could not
 * have:
 *
 *   a field the client's screen config does not mention could be
 *   silently DROPPED, while still gating `enroll confirm` through
 *   `missing` — leaving the player on a Continue button that never
 *   enables, with nothing on screen explaining why.
 *
 * These are the two rules that close it. They are not decoration: they
 * are what makes "lineage becomes additive" true in practice rather
 * than only on paper.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { CharGenFieldState, CharGenStatePayload } from '@saxonberg/types';
import { CharGenStage } from '../CharGenStage';
import { useStore } from '../../store/index';

function field(over: Partial<CharGenFieldState>): CharGenFieldState {
  return {
    field: 'species',
    kind: 'choose-one',
    label: 'species',
    applicable: true,
    options: [{ value: 'human', label: 'Human' }],
    ...over,
  };
}

function seed(payload: Partial<CharGenStatePayload>): void {
  act(() => {
    useStore.setState({
      charGenState: {
        fields: [],
        missing: [],
        ...payload,
      } as CharGenStatePayload,
    });
  });
}

function renderStage() {
  return render(
    <CharGenStage
      onSendCommand={vi.fn()}
      frames={[]}
      onSendPromptResponse={vi.fn()}
      onCancelPrompt={vi.fn()}
      onCommandClick={vi.fn()}
      onCommandPreview={vi.fn()}
    />,
  );
}

describe('char-gen renders what the server sends', () => {
  beforeEach(() => {
    act(() => {
      useStore.setState({ charGenState: null });
    });
  });

  /**
   * ⭐ Rule 1. `SCREEN_HINTS` names species / sex / pronouns / name /
   * aspiration. A sixth field belongs to no hint — and must still be
   * reachable.
   */
  it('renders a field no screen config mentions', () => {
    seed({
      fields: [
        field({}),
        field({
          field: 'favourite_colour',
          label: 'favourite colour',
          options: [{ value: 'red', label: 'Red' }],
        }),
      ],
      missing: ['favourite_colour'],
    });
    renderStage();

    // It gets its own screen, appended after the hinted ones, so it is
    // not on screen 0 — but it IS in the screen set, which is what the
    // Back/Next nav walks. Walk to it the way a player would.
    const next = screen.getByTestId('chargen-next');
    // Species is unset, so Continue is disabled — set it the way the
    // server would report it, then advance.
    seed({
      fields: [
        field({ value: 'human' }),
        field({
          field: 'favourite_colour',
          label: 'favourite colour',
          options: [{ value: 'red', label: 'Red' }],
        }),
      ],
      missing: ['favourite_colour'],
    });
    act(() => {
      next.click();
    });

    expect(screen.getByTestId('chargen-option-red')).toBeTruthy();
  });

  /**
   * ⭐ Rule 2. An unknown renderer `kind` hatches with its reason and
   * points at the command line — the affordance a client that cannot
   * draw the field still has.
   *
   * ⚠ The failure this prevents is silent: a dropped field looks like
   * nothing at all, and the player's only symptom is a dead button.
   */
  it('hatches a field whose kind it cannot draw, rather than dropping it', () => {
    seed({
      fields: [
        field({
          field: 'budget',
          kind: 'point-budget' as CharGenFieldState['kind'],
          label: 'point budget',
          options: undefined,
        }),
      ],
      missing: ['budget'],
    });
    renderStage();

    const hatched = screen.getByTestId('chargen-unknown-kind-budget');
    expect(hatched).toBeTruthy();
    // It names the field and the escape hatch, so the player is never
    // stuck without a way to set it.
    expect(hatched.textContent).toMatch(/point budget/);
    expect(hatched.textContent).toMatch(/enroll budget/);
  });

  /**
   * ⚠ An inapplicable field renders NOWHERE — that is different from
   * an unknown one. The server said it does not apply (a non-sexed
   * species has no sex), which is a real answer rather than a gap.
   */
  it('omits an inapplicable field entirely', () => {
    seed({
      fields: [
        field({}),
        field({ field: 'sex', label: 'sex', applicable: false, options: undefined }),
      ],
      missing: [],
    });
    renderStage();
    expect(screen.queryByTestId('chargen-unknown-kind-sex')).toBeNull();
  });

  /**
   * ⭐ The confirm gate reads the server's `missing` and nothing else.
   * A client-side list of required fields would re-encode which fields
   * exist and in what order — the coupling the projected payload was
   * built to remove.
   */
  it('gates confirm on the server missing list, verbatim', () => {
    seed({
      fields: [field({ value: 'human' })],
      missing: ['aspiration'],
    });
    renderStage();
    act(() => {
      screen.getByTestId('chargen-next').click();
    });
    const confirm = screen.getByTestId('chargen-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(screen.getByTestId('chargen-missing').textContent).toMatch(
      /aspiration/,
    );
  });
});
