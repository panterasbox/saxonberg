/**
 * applyTreatment — Treatment → React CSS properties.
 *
 * Given a resolved `StyleTreatment`, produce the inline-style object
 * the renderer can apply to a span. The treatment vocabulary is
 * bounded — unknown properties are ignored at type level. Prefix
 * markers are emitted separately as text content (so they survive
 * flatten / screen-reader paths).
 */

import type { CSSProperties } from 'react';
import type { StyleTreatment } from './types';

export interface TreatmentStyles {
  /** Inline CSS to apply to the span. */
  css: CSSProperties;
  /** Optional prefix string to prepend to the rendered children. */
  prefix: string | undefined;
}

export function applyTreatment(t: StyleTreatment): TreatmentStyles {
  const css: CSSProperties = {};
  if (t.fg) css.color = t.fg;
  if (t.bg) css.background = t.bg;
  if (t.weight) css.fontWeight = t.weight === 'bold' ? 600 : 400;
  if (t.italic) css.fontStyle = 'italic';
  return { css, prefix: t.prefix };
}

/**
 * True when the treatment carries no visible styling rules. Used by
 * the renderer's plain-mode short-circuit so the empty treatment
 * doesn't even produce a wrapper span.
 */
export function isEmptyTreatment(t: StyleTreatment): boolean {
  return (
    !t.fg &&
    !t.bg &&
    !t.weight &&
    !t.italic &&
    !t.prefix &&
    !t.chip &&
    !t.indent
  );
}
