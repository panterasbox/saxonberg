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
 * ## The three variants
 *
 * `card` is the Build A block and stays the default. `chip` is the
 * widget shelf's 30px horizontal entry; `row` is the connection
 * popover's full-width label-left / value-right form.
 *
 * ⚠ **A variant enum, not a second component and not a
 * `styled(Figure)` override.** A second component reopens the
 * `<span>{n}</span>` hole the union was shaped to close — the
 * constraint is that no shelf row may print a value outside `Figure`,
 * and the moment there are two ways to render a figure there are three.
 * A `styled(Figure)` override with descendant selectors would put this
 * module's internal DOM shape in the consumer's hands, so a refactor
 * here would silently break the shelf's layout with no type error. The
 * enum keeps every rendering decision inside the one module that owns
 * the convention.
 *
 * ⚠ `chip` has no room for a visible reason line, so the reason rides
 * `title` **and** the `aria-label` this component already emits (*"not
 * wired — <reason>"*, in words). The `＋ widget` catalogue menu renders
 * every reason as visible text; the chip is the compact face of the
 * same fact, never the only place it appears.
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

/**
 * How a figure is laid out. The honest states are identical across all
 * three — only the geometry differs.
 */
export type FigureVariant = 'card' | 'chip' | 'row';

export interface FigureProps {
  /** Engraved label — rendered uppercase in the display voice. */
  label: string;
  /** Which honest state this figure is in. Not optional — ever. */
  figure: FigureState;
  /** 0–1 band fill. Honoured in `live` only; ignored otherwise. */
  fill?: number;
  /**
   * `card` (default) — the Build A block, label over value over band.
   * `chip` — a single-line shelf entry; band suppressed, reason in
   * `title` + the `aria-label`. `row` — full-width, label left / value
   * right, reason visible beneath.
   */
  variant?: FigureVariant;
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

/**
 * The chip's box: one 30px line, label and value side by side. Padding
 * is tighter than the card's because the shelf holds nine of these
 * across a bar that also carries identity and connection.
 */
const ChipBox = styled(Box)`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  height: 30px;
  padding: 0 ${tokens.space.sm};
`;

const UnbuiltChipBox = styled(UnbuiltBox)`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  height: 30px;
  padding: 0 ${tokens.space.sm};
`;

/** The popover row: label left, value right, reason beneath. */
const RowBox = styled(Box)`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  column-gap: ${tokens.space.md};
  width: 100%;

  /*
   * Label and value take the two columns; the band and the reason span
   * both. Child selectors rather than props because this module owns
   * the DOM shape they address — the same reason a consumer is NOT
   * allowed to do this from outside (see the variant note at the top).
   */
  > *:nth-child(n + 3) {
    grid-column: 1 / -1;
  }
`;

const UnbuiltRowBox = styled(UnbuiltBox)`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  column-gap: ${tokens.space.md};
  width: 100%;

  /*
   * Label and value take the two columns; the band and the reason span
   * both. Child selectors rather than props because this module owns
   * the DOM shape they address — the same reason a consumer is NOT
   * allowed to do this from outside (see the variant note at the top).
   */
  > *:nth-child(n + 3) {
    grid-column: 1 / -1;
  }
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

/**
 * The box for one (variant, state) pair.
 *
 * ⚠ The return type is INFERRED as a union of the six styled
 * components, deliberately. Annotating it — even as `typeof Box` —
 * fails: styled-components' prop types differ structurally between a
 * `styled.div` and a `styled(UnbuiltGround)`, and the two are not
 * mutually assignable. The union is what JSX actually needs.
 */
function containerFor(variant: FigureVariant, state: FigureState['state']) {
  const unwired = state === 'unwired';
  switch (variant) {
    case 'chip':
      return unwired ? UnbuiltChipBox : ChipBox;
    case 'row':
      return unwired ? UnbuiltRowBox : RowBox;
    case 'card':
      return unwired ? UnbuiltBox : Box;
  }
}

export function Figure({
  label,
  figure,
  fill,
  variant = 'card',
  className,
}: FigureProps): React.ReactElement {
  const Container = containerFor(variant, figure.state);
  const clamped = Math.max(0, Math.min(1, fill ?? 0));
  const ariaLabel = ariaLabelFor(label, figure);
  // The chip has no room for a visible reason line, so the same words
  // ride `title` for a pointer and `aria-label` for a reader. `title`
  // on the other variants would duplicate text already on screen.
  //
  // ⚠⚠ **`ariaLabel`, not a second copy of the string.** This built its
  // own title with `not wired` hardcoded, so an `empty` chip — a figure
  // the server DID answer, with nothing — told every pointer user it
  // had no endpoint. `empty` and `unwired` are the two states the
  // unbuilt-state convention says must look nothing alike, and on a
  // chip the tooltip is the only place either one's reason surfaces.
  // Reading the same builder as the accessible name is what stops the
  // two descriptions drifting again.
  const titled =
    variant === 'chip' && figure.state !== 'live' ? { title: ariaLabel } : {};

  const glyph =
    figure.state === 'live'
      ? figure.value
      : figure.state === 'empty'
        ? EMPTY_GLYPH
        : UNWIRED_GLYPH;

  return (
    <Container
      role="group"
      aria-label={ariaLabel}
      data-figure-state={figure.state}
      data-figure-variant={variant}
      {...titled}
      {...(className !== undefined ? { className } : {})}
    >
      <Label>{label}</Label>
      <Value $tone={figure.state} aria-hidden="true">
        {glyph}
      </Value>
      {/*
        The band is a card/row decoration. A chip is a single 30px line
        with a label and a value on it; a 4px track under them would
        make it two lines, which is the one thing a chip is not.
      */}
      {variant === 'chip' ? null : figure.state === 'unwired' ? (
        <HatchBand aria-hidden="true" />
      ) : (
        <Band aria-hidden="true">
          {figure.state === 'live' ? (
            <BandFill style={{ width: `${clamped * 100}%` }} />
          ) : null}
        </Band>
      )}
      {variant === 'chip' || figure.state === 'live' ? null : (
        <Reason aria-hidden="true">{figure.reason}</Reason>
      )}
    </Container>
  );
}
