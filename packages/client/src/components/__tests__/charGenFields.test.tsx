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
   * ⭐ Every applicable field renders, in server order, on one page.
   *
   * The predecessor paginated, which meant a field no screen config
   * named could be silently dropped — so this test used to have to walk
   * Back/Continue to prove the field was reachable. On a single page
   * there is nowhere for one to hide, and the assertion collapses to
   * "it is on the screen".
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

    expect(screen.getByTestId('chargen-option-red')).toBeTruthy();
    // And its server-supplied label heads it, since there is no screen
    // title to lean on.
    expect(document.body.textContent).toMatch(/favourite colour/);
  });

  /**
   * ⚠ Order is the SERVER's. A client that sorted or grouped these
   * would be re-encoding a sequence the substrate deliberately does not
   * have.
   */
  it('renders fields in the order the server sent them', () => {
    seed({
      fields: [
        field({ field: 'aspiration', label: 'aspiration', options: [{ value: 'healer', label: 'Healer' }] }),
        field({ field: 'species', label: 'species' }),
      ],
      missing: [],
    });
    renderStage();
    const text = document.body.textContent ?? '';
    expect(text.indexOf('aspiration')).toBeLessThan(text.indexOf('species'));
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
   * ⭐ An inapplicable field renders DIMMED with the server's reason —
   * it does not vanish.
   *
   * ⚠ Filtering them out made the form JUMP as fields appeared, and
   * left the player guessing why a control they had just seen was gone.
   * The reason is the server's words, never composed here: this client
   * does not know why a field is unavailable and must not invent one.
   */
  it('shows an inapplicable field dimmed, with the server reason', () => {
    seed({
      fields: [
        field({}),
        field({
          field: 'name',
          kind: 'text',
          label: 'name',
          applicable: false,
          options: undefined,
          hint: 'Pick a species first — names come from its name banks.',
        }),
      ],
      missing: [],
    });
    renderStage();

    const blocked = screen.getByTestId('chargen-blocked-name');
    expect(blocked.textContent).toMatch(/pick a species first/i);
    // Its input is not offered — the field is present, not usable.
    expect(screen.queryByTestId('chargen-given-input')).toBeNull();
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
    const confirm = screen.getByTestId('chargen-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(screen.getByTestId('chargen-missing').textContent).toMatch(
      /aspiration/,
    );
  });

  /**
   * ⭐ The still-missing line is present THROUGHOUT, not only at the
   * end. It used to appear on a review screen you had to page to, which
   * meant the one surface telling you what was left was the one you
   * could not see while filling the form.
   */
  it('shows what is still missing while the form is being filled', () => {
    seed({ fields: [field({})], missing: ['species', 'aspiration'] });
    renderStage();
    const line = screen.getByTestId('chargen-missing').textContent ?? '';
    expect(line).toMatch(/species/);
    expect(line).toMatch(/aspiration/);
  });
});
