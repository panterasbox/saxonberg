/**
 * Terminal font-by-register rendering.
 *
 * Covers:
 *  - per-frame font selection by register: a `speech.vocal` frame's
 *    Body resolves to the narrative serif; a `shell.result` frame's
 *    Body resolves to the command mono (8d);
 *  - `<pre>` keeps its element-level monospace inside an otherwise
 *    proportional (serif) frame (8d);
 *  - the global `Courier New` rule is gone from the transcript
 *    container; font is per-frame on `Body` (8d regression guard);
 *  - rhythm anchor is structural: `line-height` lives on the container,
 *    never per-register on `Body` (8g).
 *
 * jsdom doesn't resolve inherited font-family via `getComputedStyle`,
 * so we assert on the styled-components-emitted CSS rule for each
 * element's own generated class (resilient to jsdom cascade limits).
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Terminal } from '../Terminal';
import type { Frame } from '../../store/index';

/** Collect all CSS styled-components has injected into the document —
 *  both the non-speedy `<style>` textContent path (used in test/dev)
 *  and the CSSOM `insertRule` path, for resilience. */
function collectCss(): string {
  let css = '';
  document.querySelectorAll('style').forEach((s) => {
    css += s.textContent ?? '';
  });
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) css += rule.cssText;
    } catch {
      // cross-origin / detached sheet — ignore.
    }
  }
  return css;
}

/** The concatenated declaration blocks of every rule whose selector
 *  names one of `el`'s generated classes. styled-components gives each
 *  distinct prop-set its own hashed class, so this isolates THIS
 *  element's resolved styling from the document-wide accumulation. */
function rulesFor(el: Element): string {
  const css = collectCss();
  let acc = '';
  for (const cls of Array.from(el.classList)) {
    const re = new RegExp(`\\.${cls}\\b[^{]*\\{([^}]*)\\}`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(css)) !== null) acc += m[1];
  }
  return acc;
}

function frame(partial: Partial<Frame> & Pick<Frame, 'topic'>): Frame {
  return {
    id: partial.id ?? partial.topic,
    topic: partial.topic,
    body: partial.body ?? 'body text',
    timestamp: partial.timestamp ?? 0,
    sigil: partial.sigil,
  };
}

function renderTerminal(frames: Frame[]) {
  return render(
    <Terminal frames={frames} onCommandClick={() => {}} onCommandPreview={() => {}} />,
  );
}

/** The transcript container is the root; each FrameRow is a child div;
 *  within it the gutter is a <span> and the Body is the <div> sibling. */
function bodyOfRow(row: Element): Element {
  const body = Array.from(row.children).find((c) => c.tagName === 'DIV');
  if (!body) throw new Error('Body div not found in FrameRow');
  return body;
}

describe('Terminal — per-frame font by register', () => {
  it('a say frame body resolves to the narrative serif', () => {
    const { container } = renderTerminal([frame({ topic: 'speech.vocal' })]);
    const row = container.firstElementChild!.firstElementChild!;
    expect(rulesFor(bodyOfRow(row))).toContain('Newsreader');
  });

  it('a help frame body resolves to the command mono', () => {
    const { container } = renderTerminal([frame({ topic: 'shell.result' })]);
    const row = container.firstElementChild!.firstElementChild!;
    expect(rulesFor(bodyOfRow(row))).toContain('IBM Plex Mono');
  });

  it('<pre> stays monospace inside an otherwise-serif narrative frame', () => {
    const { container } = renderTerminal([
      frame({
        topic: 'sense.survey',
        body: 'You see a sign:\n<pre>  ASCII  </pre>',
      }),
    ]);
    const row = container.firstElementChild!.firstElementChild!;
    // The frame body itself is serif (narrative register)...
    expect(rulesFor(bodyOfRow(row))).toContain('Newsreader');
    // ...but the <pre> element carries its own monospace rule, which
    // wins by element-level specificity over the inherited serif.
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(rulesFor(pre!)).toContain('monospace');
    expect(rulesFor(pre!)).not.toContain('Newsreader');
  });
});

describe('Terminal — removed global mono + rhythm anchor', () => {
  it('the container has no font-family / Courier New rule (regression guard)', () => {
    const { container } = renderTerminal([frame({ topic: 'speech.vocal' })]);
    const containerRule = rulesFor(container.firstElementChild!);
    expect(containerRule).not.toContain('Courier');
    expect(containerRule).not.toContain('font-family');
  });

  it('line-height is the container rhythm anchor, never on Body [8g]', () => {
    const { container } = renderTerminal([frame({ topic: 'speech.vocal' })]);
    const root = container.firstElementChild!;
    const row = root.firstElementChild!;
    // Container owns line-height (shared cross-register rhythm)...
    expect(rulesFor(root)).toContain('line-height');
    // ...and the per-frame Body owns font-family but NOT line-height,
    // so switching register can't jolt the vertical rhythm.
    const bodyRule = rulesFor(bodyOfRow(row));
    expect(bodyRule).toContain('font-family');
    expect(bodyRule).not.toContain('line-height');
  });
});
