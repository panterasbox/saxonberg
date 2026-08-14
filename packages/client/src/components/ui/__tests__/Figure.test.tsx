/**
 * > AC: *the three states are primitives, visually distinct, each
 * > covered by a test — including that the not-wired state renders `╌╌`
 * > and **no** number, and that the empty state renders `—` **plus a
 * > reason**.*
 *
 * "No number" is asserted as the absence of **any digit**, not the
 * absence of one particular value. A test that only checked the figure
 * wasn't `31` would pass on `32`, which is the same bug.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Figure, type FigureState } from '../Figure';

/** Digit-free labels, so `not.toMatch(/\d/)` measures the value. */
const LABEL = 'RENOWN';

function rulesFor(el: Element): string {
  const classes = Array.from(el.classList);
  return Array.from(document.querySelectorAll('style'))
    .map((s) => s.textContent ?? '')
    .join('')
    .split('}')
    .filter((rule) => classes.some((c) => rule.includes(`.${c}`)))
    .join('}');
}

function renderFigure(figure: FigureState, fill?: number) {
  return render(
    <Figure
      label={LABEL}
      figure={figure}
      {...(fill !== undefined ? { fill } : {})}
    />,
  );
}

describe('live — the only state that shows a number', () => {
  it('renders the value and neither placeholder glyph', () => {
    const { container } = renderFigure({ state: 'live', value: '74' });
    expect(container.textContent).toContain('74');
    expect(container.textContent).not.toContain('╌╌');
    expect(container.textContent).not.toContain('—');
  });

  it('carries no reason — a live figure has nothing to explain', () => {
    const { container } = renderFigure({ state: 'live', value: '74' });
    expect(container.textContent).toBe(`${LABEL}74`);
  });

  it('honours fill on the band', () => {
    const { container } = renderFigure({ state: 'live', value: '74' }, 0.5);
    const bar = container.querySelector('i');
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute('style')).toContain('width: 50%');
  });

  it('clamps an out-of-range fill rather than emitting bad CSS', () => {
    const { container } = renderFigure({ state: 'live', value: '9' }, 4);
    expect(container.querySelector('i')!.getAttribute('style')).toContain(
      'width: 100%',
    );
  });
});

describe('empty — a real zero, with a reason', () => {
  const REASON = 'never taken out';

  it('renders the em-dash AND the reason', () => {
    const { container } = renderFigure({ state: 'empty', reason: REASON });
    expect(container.textContent).toContain('—');
    expect(container.textContent).toContain(REASON);
  });

  it('renders no digit — an empty figure is not a zero to read', () => {
    const { container } = renderFigure({ state: 'empty', reason: REASON });
    expect(container.textContent).not.toMatch(/\d/);
  });

  it('renders an empty band, not a hatched one', () => {
    const { container } = renderFigure({ state: 'empty', reason: REASON });
    expect(container.querySelector('i')).toBeNull();
  });
});

describe('unwired — hatched, and holding no number at all', () => {
  const REASON = 'no endpoint yet';

  it('renders ╌╌ and the reason', () => {
    const { container } = renderFigure({ state: 'unwired', reason: REASON });
    expect(container.textContent).toContain('╌╌');
    expect(container.textContent).toContain(REASON);
  });

  it('⭐ renders NO digit — the whole point of the state', () => {
    const { container } = renderFigure({ state: 'unwired', reason: REASON });
    expect(container.textContent).not.toMatch(/\d/);
  });

  it('does not render the empty state’s em-dash', () => {
    // The two must not be confusable: `—` means "answered, with
    // nothing" and `╌╌` means "never asked". Rendering both would say
    // neither.
    const { container } = renderFigure({ state: 'unwired', reason: REASON });
    expect(container.textContent).not.toContain('—');
  });
});

describe('visually distinct — three states, three renderings', () => {
  it('each carries its own data-figure-state', () => {
    const states: FigureState[] = [
      { state: 'live', value: '74' },
      { state: 'empty', reason: 'none yet' },
      { state: 'unwired', reason: 'no endpoint' },
    ];
    const seen = states.map((figure) => {
      const { container } = renderFigure(figure);
      return container.firstElementChild!.getAttribute('data-figure-state');
    });
    expect(seen).toEqual(['live', 'empty', 'unwired']);
    expect(new Set(seen).size).toBe(3);
  });

  it('unwired alone gets a dashed border and a hatched ground', () => {
    // ⚠ Asserted on the EMITTED styled-components CSS, not on resolved
    // colours: jsdom leaves `var()` unsubstituted, so a colour-based
    // comparison here would compare two identical reference strings and
    // pass no matter what.
    const live = renderFigure({ state: 'live', value: '74' });
    const liveCss = rulesFor(live.container.firstElementChild!);
    expect(liveCss).not.toContain('dashed');
    expect(liveCss).not.toContain('repeating-linear-gradient');

    const unwired = renderFigure({
      state: 'unwired',
      reason: 'no endpoint',
    });
    const unwiredCss = rulesFor(unwired.container.firstElementChild!);
    expect(unwiredCss).toContain('dashed');
    expect(unwiredCss).toContain('repeating-linear-gradient');
  });
});

describe('accessibility — the honesty reaches a screen reader', () => {
  // A dashed border and a `╌╌` glyph are visual conventions. To a
  // screen reader `╌╌` is noise, so the state has to be in words.
  it('live states the value', () => {
    const { container } = renderFigure({ state: 'live', value: '74' });
    expect(
      container.firstElementChild!.getAttribute('aria-label'),
    ).toBe(`${LABEL}: 74`);
  });

  it('empty states "none" and the reason', () => {
    const { container } = renderFigure({
      state: 'empty',
      reason: 'never taken out',
    });
    expect(container.firstElementChild!.getAttribute('aria-label')).toBe(
      `${LABEL}: none — never taken out`,
    );
  });

  it('unwired says "not wired" in words, plus the reason', () => {
    const { container } = renderFigure({
      state: 'unwired',
      reason: 'no endpoint yet',
    });
    const label = container.firstElementChild!.getAttribute('aria-label')!;
    expect(label).toContain('not wired');
    expect(label).toContain('no endpoint yet');
    expect(label).toContain(LABEL);
  });

  it('is a labelled group, so the label and value are read together', () => {
    const { container } = renderFigure({ state: 'live', value: '74' });
    expect(container.firstElementChild!.getAttribute('role')).toBe('group');
  });
});

/**
 * ⚠⚠ **The chip's `title` was a SECOND copy of the sentence, and it
 * said the wrong thing.** It hardcoded `not wired` for every non-live
 * state, so an `empty` chip — a figure the server DID answer, with
 * nothing — told a pointer user it had no endpoint. `empty` and
 * `unwired` are the two states the convention says must look nothing
 * alike, and on a chip the tooltip is the ONLY place either reason
 * appears; the visible glyphs (`—` vs `╌╌`) do not spell it out.
 *
 * ⭐ Found by rendering the design mock and reading the live chrome
 * beside it, not by the suite: the aria-label tests above cover all
 * three states correctly, and nothing read the other attribute. **Two
 * descriptions of one thing is the bug** — so these assert the title
 * IS the accessible name rather than re-asserting its words, which is
 * the form that cannot drift.
 */
describe('the chip tooltip is the accessible name, not a second copy', () => {
  function chipTitles(figure: FigureState) {
    const { container } = render(
      <Figure label={LABEL} figure={figure} variant="chip" />,
    );
    const el = container.firstElementChild!;
    return {
      title: el.getAttribute('title'),
      aria: el.getAttribute('aria-label'),
    };
  }

  it('empty says "none", never "not wired"', () => {
    const { title, aria } = chipTitles({
      state: 'empty',
      reason: 'no renown recorded yet',
    });
    expect(title).toBe(aria);
    expect(title).toBe(`${LABEL}: none — no renown recorded yet`);
    expect(title).not.toContain('not wired');
  });

  it('unwired says "not wired"', () => {
    const { title, aria } = chipTitles({
      state: 'unwired',
      reason: 'no subscribable field yet',
    });
    expect(title).toBe(aria);
    expect(title).toContain('not wired');
  });

  it('live carries no tooltip — there is nothing to explain', () => {
    expect(chipTitles({ state: 'live', value: '74' }).title).toBeNull();
  });
});

describe('⭐ type-level — the union IS the deliverable', () => {
  it('a value on the unwired state does not compile', () => {
    // The compiler's refusal is part of the test surface. If `unwired`
    // ever grew a `value` field, "never render a figure the server did
    // not send" would go back to being a rule someone has to remember,
    // and this line would stop erroring — which is the failure.
    const bad = {
      state: 'unwired',
      // @ts-expect-error — `unwired` has no `value`; a not-wired figure
      // cannot carry a number, by construction rather than by review.
      value: '31',
      reason: 'no endpoint yet',
    } satisfies FigureState;
    expect(bad.state).toBe('unwired');
  });

  it('a state without its reason does not compile', () => {
    // @ts-expect-error — `empty` requires a reason; "a real zero
    // deserves a reason, not a stamp".
    const bad: FigureState = { state: 'empty' };
    expect(bad.state).toBe('empty');
  });
});
