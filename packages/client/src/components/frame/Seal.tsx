/**
 * `Seal` — the Saxonberg mark, **applied**.
 *
 * Source of truth is `docs/brand/saxonberg-seal.svg` (+ its README).
 * ⚠ That directory currently lives on the `design/balance-machine`
 * branch and is not yet on master; the artwork is inlined here rather
 * than imported, which is what the brand README says to do ("drop them
 * into either repo as-is or inline them") and what the panterasbox-web
 * `Marks.js` already does.
 *
 * ## ⚠⚠ The one rule: red never touches blue
 *
 * White is the separator, exactly as on the flag. That is *why* the
 * applied version is a seal rather than a plain red mark — the white rim
 * is simultaneously the required separation and what makes the mark read
 * as struck rather than printed.
 *
 * This build's first cut got that wrong: it drew a red block with a red
 * border directly on the bar's navy surface, which is red against blue
 * with nothing between them. The rim is not decoration; it is the rule.
 *
 * ⚠ **And the source SVG does not carry the rim.** Both of its white
 * rules are *inset*, leaving a sliver of bare red at the outer edge — so
 * the file as drawn still puts red against blue when placed on a navy
 * ground. The fix is the same one `Marks.js` uses: a white disc behind
 * the artwork, with the artwork scaled to `0.949` inside it, so the rim
 * is the only addition and the mark itself is reproduced exactly. **If
 * the source file ever grows its own rim, drop the disc and the scale.**
 *
 * ## The casing is structural, not styling
 *
 * Each ring carries a ground-coloured stroke beneath its ink stroke.
 * That casing is what interrupts the ring passing underneath — without
 * it three same-colour rings simply stack and no crossing reads at all.
 * Inside the seal the rings sit on the RED field, so the casing is red
 * and the ink is white.
 *
 * ⭐ **The topology is a genuine Borromean link** and the final
 * clip-path redraw is what makes it one: each ring passes over one
 * neighbour and under the other, so no two are linked yet all three
 * hold — cut any one and the remaining two fall apart untouched. That
 * is the Make / Fund / Play argument, and it is only true if each pair
 * is *consistently* one-over-the-other. **If you edit these paths, both
 * crossings of a given pair must stay the same way round**; alternating
 * them links that pair and the claim becomes false.
 *
 * ## Colour goes through CSS, never through SVG attributes
 *
 * `tokens.color.*` are `var(--sx-…)` strings, and a `var()` in an SVG
 * *presentation attribute* (`fill="…"`) does not resolve — it silently
 * paints nothing. So every colour here is applied through a CSS rule on
 * a class, which is a real CSS-valued position. This is the hazard
 * `tokens.ts` warns about, in the one place it actually bites.
 */

import React from 'react';
import styled from 'styled-components';
import { tokens } from '../ui';

const Mark = styled.svg`
  display: block;
  flex: none;

  /* The rim — the required white separation from the ground beneath. */
  .sx-seal-rim {
    fill: ${tokens.color.sealInk};
  }
  /* The struck field. */
  .sx-seal-field {
    fill: ${tokens.color.seal};
  }
  /* The two inset rules on the field. */
  .sx-seal-rule {
    fill: none;
    stroke: ${tokens.color.sealInk};
  }
  /* Ring casing — matches the field it sits on, so crossings read. */
  .sx-seal-casing {
    fill: none;
    stroke: ${tokens.color.seal};
  }
  /* Ring ink. */
  .sx-seal-ink {
    fill: none;
    stroke: ${tokens.color.sealInk};
  }
`;

interface SealProps {
  /** Rendered box, px. The bar uses 22. */
  size?: number;
  /**
   * Unique suffix for the clip-path id. Two seals on one page sharing
   * an id would make the second one's crossings resolve against the
   * first's clip.
   */
  id?: string;
  /** Accessible name; omit for a decorative instance. */
  title?: string;
}

export const Seal: React.FC<SealProps> = ({
  size = 22,
  id = 'sx-seal',
  title,
}) => {
  const clip = `${id}-over`;
  return (
    <Mark
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={title ? 'img' : 'presentation'}
      {...(title ? { 'aria-label': title } : { 'aria-hidden': 'true' })}
      focusable="false"
    >
      {/* The rim. Everything else is scaled to sit inside it. */}
      <circle className="sx-seal-rim" cx="50" cy="50" r="50" />
      <g transform="translate(50 50) scale(0.949) translate(-50 -50)">
        <defs>
          <clipPath id={clip}>
            <circle cx="24.348" cy="60.047" r="9.87" />
            <circle cx="59.152" cy="39.953" r="9.87" />
          </clipPath>
        </defs>
        <circle className="sx-seal-field" cx="50" cy="50" r="49" />
        <circle
          className="sx-seal-rule"
          cx="50"
          cy="50"
          r="45.5"
          strokeWidth="2.1"
        />
        <circle
          className="sx-seal-rule"
          cx="50"
          cy="50"
          r="41"
          strokeWidth="0.9"
          opacity="0.8"
        />
        <g transform="translate(50 50) scale(0.72) translate(-50 -50)">
          <circle className="sx-seal-casing" cx="50" cy="64.289" r="26" strokeWidth="11.985" />
          <circle className="sx-seal-ink" cx="50" cy="64.289" r="26" strokeWidth="4.7" />
          <circle className="sx-seal-casing" cx="66.5" cy="35.711" r="26" strokeWidth="11.985" />
          <circle className="sx-seal-ink" cx="66.5" cy="35.711" r="26" strokeWidth="4.7" />
          <circle className="sx-seal-casing" cx="33.5" cy="35.711" r="26" strokeWidth="11.985" />
          <circle className="sx-seal-ink" cx="33.5" cy="35.711" r="26" strokeWidth="4.7" />
          {/* ⭐ The redraw that makes the link Borromean rather than
              three stacked rings — see the topology note above. */}
          <circle
            className="sx-seal-casing"
            cx="50"
            cy="64.289"
            r="26"
            strokeWidth="11.985"
            clipPath={`url(#${clip})`}
          />
          <circle
            className="sx-seal-ink"
            cx="50"
            cy="64.289"
            r="26"
            strokeWidth="4.7"
            clipPath={`url(#${clip})`}
          />
        </g>
      </g>
    </Mark>
  );
};
