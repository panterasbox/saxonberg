/**
 * The Saxonberg seal — and the one rule that governs it.
 *
 * ⚠ These are structural assertions, not colour ones: jsdom substitutes
 * no `var()`, so the *resolved* red and white are e2e territory. What is
 * assertable here is that the rim EXISTS and that the artwork sits
 * inside it — which is the part a refactor would silently drop.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Seal } from '../Seal';

function svg(): SVGElement {
  const el = document.querySelector('svg');
  if (!el) throw new Error('no seal rendered');
  return el as unknown as SVGElement;
}

describe('Seal', () => {
  it('is named for a screen reader when given a title', () => {
    render(<Seal title="Saxonberg" />);
    expect(screen.getByLabelText('Saxonberg')).toBeTruthy();
  });

  it('is decorative — and silent — without one', () => {
    render(<Seal />);
    expect(svg().getAttribute('aria-hidden')).toBe('true');
    expect(svg().getAttribute('role')).toBe('presentation');
  });

  /*
   * ⚠⚠ **The flag rule.** *Red never touches blue; white is the
   * separator.* The bar's ground is navy, so the seal MUST carry a white
   * rim — and the source SVG does not have one (both its white rules are
   * inset, leaving bare red at the outer edge). The rim is added here as
   * the outermost element at full radius, with the artwork scaled inside
   * it.
   *
   * A first cut of the top bar drew a red block with a red border
   * straight onto the navy, which is exactly what this forbids. If a
   * refactor drops the rim, that regression comes back silently — the
   * mark still looks like a seal.
   */
  it('⚠⚠ carries the white rim, at full radius, OUTSIDE the red field', () => {
    render(<Seal />);
    const rim = svg().querySelector('.sx-seal-rim');
    const field = svg().querySelector('.sx-seal-field');
    expect(rim, 'the seal has no rim — red would touch blue').toBeTruthy();
    expect(field).toBeTruthy();

    // The rim spans the whole viewBox…
    expect(rim!.getAttribute('r')).toBe('50');
    // …the field is strictly inside it…
    expect(Number(field!.getAttribute('r'))).toBeLessThan(50);
    // …and the rim is painted FIRST, so the field sits on top of it
    // rather than the other way round.
    const painted: Element[] = Array.from(svg().querySelectorAll('circle'));
    expect(painted.indexOf(rim!)).toBe(0);

    // The artwork is scaled down inside the rim — without this the
    // field's own edge would reach the rim and the separation vanishes.
    const scaled = svg().querySelector('g[transform*="scale(0.949)"]');
    expect(scaled, 'the artwork is not inset inside the rim').toBeTruthy();
    expect(scaled!.contains(field as Node)).toBe(true);
  });

  /*
   * ⭐ The casing is STRUCTURAL. Each ring carries a field-coloured
   * stroke beneath its ink stroke; that casing is what interrupts the
   * ring passing underneath. Drop it and three same-coloured rings
   * simply stack, no crossing reads, and the Borromean claim — no two
   * linked, yet all three hold — becomes false.
   */
  it('⭐ every ring has a casing under its ink, and the link is redrawn', () => {
    render(<Seal />);
    const casings = svg().querySelectorAll('.sx-seal-casing');
    const inks = svg().querySelectorAll('.sx-seal-ink');
    // Three rings, plus the clip-path redraw that puts one back on top.
    expect(casings).toHaveLength(4);
    expect(inks).toHaveLength(4);

    // The redraw is what makes the link Borromean rather than stacked.
    const clipped = svg().querySelectorAll('[clip-path]');
    expect(clipped.length, 'the over/under redraw is missing').toBe(2);
  });

  it('scopes its clip-path id so two seals cannot collide', () => {
    render(
      <>
        <Seal id="a" />
        <Seal id="b" />
      </>,
    );
    const ids = Array.from(document.querySelectorAll('clipPath')).map((c) =>
      c.getAttribute('id'),
    );
    expect(ids).toEqual(['a-over', 'b-over']);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
