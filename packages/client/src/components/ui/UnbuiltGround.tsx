/**
 * The hatched ground — "the server cannot answer this yet".
 *
 * One visual convention, exported on its own because the honesty rule
 * has two scales. `Figure` hatches a single value (convention preference
 * order #1: *ship the surface, hatch the value*), but sometimes the
 * whole card is unbuilt and hatching one number inside an otherwise
 * confident panel would understate it. Then the card wraps in this.
 *
 * Dashed border + a 135° hatch, from `Unbuilt States.dc.html`. The
 * reference art composes the hatch with `color-mix(in oklab, var(--info)
 * 7%, transparent)`; we use a **precomputed** `--sx-hatch` per ground
 * instead. Three reasons, in order of weight:
 *
 * 1. **It keeps the hatch honest per ground.** A marble hatch is not an
 *    ink hatch tinted lighter — `color-mix` against a transparent stop
 *    composites over whatever is behind, which on a light ground is a
 *    different blend problem than on a dark one. Precomputing means each
 *    theme states what its hatch actually looks like.
 * 2. It sidesteps a browser-support question for one decorative effect.
 * 3. It is readable in jsdom, so the hatch is testable rather than
 *    merely intended.
 *
 * ⚠ **No stamp.** The reference art's `live` / `empty` / `not wired`
 * chips are documentation labels for its three example cards, not
 * shipped chrome — `CONVENTIONS.md` #1 says the empty state deserves "a
 * reason, **not a stamp**", and a stamp on the hatched state would be
 * inventing the thing the convention argues against. The hatch IS the
 * stamp; the reason is the words.
 */

import styled from 'styled-components';
import { tokens } from './tokens';

export const UnbuiltGround = styled.div`
  position: relative;
  border: 1px dashed ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  background-image: repeating-linear-gradient(
    135deg,
    ${tokens.color.hatch} 0 6px,
    transparent 6px 12px
  );
`;
