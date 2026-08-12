/**
 * `Figure` — a labelled number that cannot lie about where it came from.
 *
 * `CONVENTIONS.md` #1: **never render a figure the server did not send.**
 * The demo wipes nightly, which buys latitude on persistence and none on
 * figures — a plausible fake is indistinguishable from a bug, and this
 * game's central claim is that its numbers are real. Three states must
 * look nothing alike:
 *
 * | state     | what it means            | how it reads                  |
 * |-----------|--------------------------|-------------------------------|
 * | `live`    | the server answered      | a number. no decoration.      |
 * | `empty`   | answered, with nothing   | `—` plus a reason             |
 * | `unwired` | no endpoint yet          | hatched, dashed, `╌╌`         |
 *
 * ## ⭐ The union is the deliverable
 *
 * One component with a **required discriminated `figure` prop**, rather
 * than three components or an optional `value`. The difference is what
 * the compiler can refuse:
 *
 * - You cannot render a figure without naming its state.
 * - `empty` cannot omit its reason; neither can `unwired`.
 * - `unwired` has **no `value` field at all**, so "never render a figure
 *   the server did not send" is enforced by the type checker rather than
 *   by vigilance at every call site.
 *
 * Three separate components would leave `<span>{n}</span>` as the path of
 * least resistance, and the fourth state the convention warns about —
 * a plausible fake — is exactly what the path of least resistance
 * produces.
 *
 * ## ⚠ Ships with no consumer
 *
 * Deliberately. Applying the honest states to a surface is a non-goal of
 * this build; Build B's widget shelf (whose catalogue is mostly
 * not-wired) is the first real consumer. That a primitive with no
 * consumer can drift is the accepted risk in the Wave 1 cut, and the
 * mitigation is that B follows immediately.
 *
 * ## Two voices, never three
 *
 * Per DESIGN-SYSTEM § Type. The label is the engraved display voice
 * (Spectral, uppercase, wide tracking), the value is the machine voice
 * (Plex Mono) because a measurement is a machine's answer, and the
 * reason rides the chrome face at the small step — chrome being the
 * default body voice rather than a third claim.
 */

import React from 'react';
import styled from 'styled-components';
import { tokens } from './tokens';
import { UnbuiltGround } from './UnbuiltGround';

/**
 * Which honest state a figure is in. Discriminated on `state`, and
 * `unwired` deliberately carries no `value` — see the ⭐ note above.
 */
export type FigureState =
  | { readonly state: 'live'; readonly value: string }
  | { readonly state: 'empty'; readonly reason: string }
  | { readonly state: 'unwired'; readonly reason: string };

export interface FigureProps {
  /** Engraved label — rendered uppercase in the display voice. */
  label: string;
  /** Which honest state this figure is in. Not optional — ever. */
  figure: FigureState;
  /** 0–1 band fill. Honoured in `live` only; ignored otherwise. */
  fill?: number;
  className?: string;
}

/** The glyph that stands where a value would be, per state. */
const UNWIRED_GLYPH = '╌╌';
const EMPTY_GLYPH = '—';

const Box = styled.div`
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surface};
  padding: ${tokens.space.sm} ${tokens.space.md};
`;

/** The hatched variant. Same box metrics; dashed + hatched ground. */
const UnbuiltBox = styled(UnbuiltGround)`
  padding: ${tokens.space.sm} ${tokens.space.md};
`;

const Label = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  font-weight: 500;
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.fgMuted};
`;

const Value = styled.div<{ $tone: 'live' | 'empty' | 'unwired' }>`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.title};
  line-height: 1.2;
  color: ${(p) =>
    p.$tone === 'live'
      ? tokens.color.accent
      : p.$tone === 'unwired'
        ? tokens.color.info
        : tokens.color.fgMuted};
`;

const Band = styled.div`
  height: 4px;
  margin-top: ${tokens.space.xs};
  background: ${tokens.color.surfaceSunken};
  overflow: hidden;
`;

const BandFill = styled.i`
  display: block;
  height: 100%;
  background: ${tokens.color.accent};
`;

/**
 * The not-wired band. A hatched stripe rather than an empty track: an
 * empty track reads as "zero", which is the `empty` state's meaning and
 * would collide with it.
 */
const HatchBand = styled.div`
  height: 4px;
  margin-top: ${tokens.space.xs};
  background-image: repeating-linear-gradient(
    135deg,
    ${tokens.color.hatchStrong} 0 4px,
    ${tokens.color.surfaceSunken} 4px 8px
  );
`;

const Reason = styled.div`
  margin-top: ${tokens.space.xs};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

/**
 * Build the screen-reader label. The honesty has to reach a reader who
 * cannot see the hatch — a dashed border and a `╌╌` glyph are visual
 * conventions, and to a screen reader `╌╌` is noise.
 */
function ariaLabelFor(label: string, figure: FigureState): string {
  switch (figure.state) {
    case 'live':
      return `${label}: ${figure.value}`;
    case 'empty':
      return `${label}: none — ${figure.reason}`;
    case 'unwired':
      return `${label}: not wired — ${figure.reason}`;
  }
}

export function Figure({
  label,
  figure,
  fill,
  className,
}: FigureProps): React.ReactElement {
  const Container = figure.state === 'unwired' ? UnbuiltBox : Box;
  const clamped = Math.max(0, Math.min(1, fill ?? 0));

  return (
    <Container
      role="group"
      aria-label={ariaLabelFor(label, figure)}
      data-figure-state={figure.state}
      {...(className !== undefined ? { className } : {})}
    >
      <Label>{label}</Label>
      <Value $tone={figure.state} aria-hidden="true">
        {figure.state === 'live'
          ? figure.value
          : figure.state === 'empty'
            ? EMPTY_GLYPH
            : UNWIRED_GLYPH}
      </Value>
      {figure.state === 'unwired' ? (
        <HatchBand aria-hidden="true" />
      ) : (
        <Band aria-hidden="true">
          {figure.state === 'live' ? (
            <BandFill style={{ width: `${clamped * 100}%` }} />
          ) : null}
        </Band>
      )}
      {figure.state === 'live' ? null : (
        <Reason aria-hidden="true">{figure.reason}</Reason>
      )}
    </Container>
  );
}
