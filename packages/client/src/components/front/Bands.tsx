/**
 * Bands — the front page's grammar (stream arrival D6): full-bleed
 * horizontal bands whose CONTENTS are width-capped, so the page reads as a
 * civic document rather than a centred card, on the shared `tokens` and the
 * three faces. The front page, character select and creation are built of
 * these same parts, so they look like one place.
 */

import styled from "styled-components";
import { tokens } from "../ui";

export const Screen = styled.div`
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  overflow-y: auto;
`;

/**
 * ⭐ The mock's structure: a full-width hero band, a full-width chambers
 * band beneath it, then the body split with a NARROW sign-in column and
 * the press room beside it.
 *
 * ⚠ An earlier cut put sign-in in a right rail beside the headline,
 * which made the pitch and the action compete for the same eyeline. The
 * hero spans; the action sits under it.
 */
export const Band = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding: ${tokens.space.xxl} ${tokens.space.xl};
`;

export const HeroBand = styled(Band)`
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

/** The chambers sit on their own darker rule — a band, not three cards. */
export const ChambersBand = styled(Band)`
  background: ${tokens.color.surfaceSunken};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  padding-top: ${tokens.space.lg};
  padding-bottom: ${tokens.space.lg};
`;

export const BandInner = styled.div`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
`;

export const Inner = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: ${tokens.space.xxl} ${tokens.space.xl};
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.space.xxl};

  @media (min-width: 900px) {
    /* Sign-in is the NARROW column; the press room takes the room. */
    grid-template-columns: 350px 1fr;
    align-items: start;
  }
`;

/* ── Masthead ──────────────────────────────────────────────────── */

export const Masthead = styled.header`
  display: flex;
  align-items: center;
  gap: ${tokens.space.lg};
  margin-bottom: ${tokens.space.xl};
`;

/**
 * ⭐ The real mark, not a letter in a box.
 *
 * ⚠ An earlier cut of this screen drew its own "S" on a red square
 * while `frame/Seal.tsx` — the applied seal, sourced from
 * `docs/design/brand/saxonberg-seal.svg` and already on the in-world top bar —
 * sat one import away. The front door is the first thing a stranger
 * sees, so it is the last place to ship a stand-in for the brand.
 *
 * It earns its place here twice over: the seal's three interlocking
 * rings ARE the Make / Fund / Play argument (cut any one and the other
 * two fall apart untouched), and this page argues exactly that a few
 * hundred pixels below.
 *
 * ⚠ `id` is distinct from the bar's — two seals sharing a clip-path id
 * would make the second one's crossings resolve against the first's.
 */
export const SealWrap = styled.div`
  flex: none;
  display: grid;
  place-items: center;
`;

export const WordMark = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.display};
  letter-spacing: 0.04em;
  color: ${tokens.color.fg};
  line-height: 1.1;
`;

export const Tagline = styled.div`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

export const Headline = styled.h1`
  margin: 0 0 ${tokens.space.lg};
  font-family: ${tokens.font.serif};
  font-size: 26px;
  font-weight: 500;
  line-height: 1.25;
  text-wrap: balance;
  color: ${tokens.color.fg};
`;

export const Lede = styled.p`
  margin: 0 0 ${tokens.space.xxl};
  max-width: 56ch;
  font-size: ${tokens.font.title};
  line-height: 1.65;
  color: ${tokens.color.fgDim};
`;

/* ── The three chambers ────────────────────────────────────────── */

export const SectionLabel = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
  margin-bottom: ${tokens.space.lg};
`;

export const Chambers = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xxl};
`;

/** ⚠ No border, no card. The band IS the container. */
export const Chamber = styled.li`
  min-width: 8rem;
`;

/**
 * ⚠ The ordinal is real information, not decoration: the chambers are
 * a fixed, named set of three and the numbering is how the Compact
 * refers to them. It is not a "01 / 02 / 03" flourish over an arbitrary
 * list.
 */
export const ChamberOrdinal = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

export const ChamberName = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.title};
  letter-spacing: 0.06em;
  color: ${tokens.color.fg};
  margin: ${tokens.space.xs} 0;
`;

export const ChamberNote = styled.div`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

export const CHAMBERS: ReadonlyArray<{ n: string; name: string; note: string }> = [
  { n: "01", name: "Make", note: "You built it" },
  { n: "02", name: "Fund", note: "You keep it running" },
  { n: "03", name: "Play", note: "You live here" },
];

/* ── Sign-in ───────────────────────────────────────────────────── */

export const Panel = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.lg};
  padding: ${tokens.space.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
`;

export const PanelHeading = styled.h2`
  margin: 0;
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.title};
  letter-spacing: 0.06em;
  color: ${tokens.color.fg};
`;

export const PanelNote = styled.p`
  margin: 0;
  font-size: ${tokens.font.micro};
  line-height: 1.6;
  color: ${tokens.color.fgMuted};
`;

/**
 * A provider button. Neutral by construction — see PROVIDERS for why
 * none of them carries the committing-action red.
 *
 * ⚠ `min-height: 44px` — the tap-target floor, with weight controlled
 * by padding rather than by shrinking the box.
 */
export const Action = styled.button`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: ${tokens.space.md};
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: ${tokens.space.md} ${tokens.space.lg};
  border-radius: ${tokens.radius.md};
  /*
   * ⚠ Old Glory Red NEVER touches another colour without white — the
   * rim is what makes this legal under the flag rule and legible at
   * 2.66:1, which bare red text would not be.
   */
  border: 1px solid ${tokens.color.sealInk};
  background: ${tokens.color.seal};
  color: ${tokens.color.sealInk};
  font-family: inherit;
  font-size: ${tokens.font.body};
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;

  &:hover:not(:disabled) {
    filter: brightness(1.07);
  }

  /*
   * ⚠ Dimmed IN THE FAMILY rather than demoted to an outline style.
   * Demoting would make an unconfigured provider look like a different
   * KIND of option, which is the reading this screen already had to
   * correct once — the distinction here is availability, not rank.
   */
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.fgEmphasis};
    outline-offset: 2px;
  }
`;

export const GuestAction = styled(Action)`
  font-weight: 500;
  background: transparent;
  color: ${tokens.color.fgDim};
`;

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  text-transform: uppercase;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-top: 1px solid ${tokens.color.borderMuted};
  }
`;

/* ── Footer facts ──────────────────────────────────────────────── */

/**
 * The two server facts, as labelled columns under the press room — the
 * mock's placement. They are statements ABOUT the world, so they sit
 * with the world's news rather than inside the sign-in panel.
 */
export const Facts = styled.div`
  display: grid;
  gap: ${tokens.space.xl};
  margin-top: ${tokens.space.xl};
  padding-top: ${tokens.space.lg};
  border-top: 1px solid ${tokens.color.borderMuted};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  line-height: 1.6;

  @media (min-width: 620px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const Fact = styled.div`
  min-width: 0;
`;

/**
 * The platform marks.
 *
 * ⚠ Somebody else's trademarks. On the red field they render in
 * **white**, not in brand colour: Twitch purple and Kick green both sit
 * badly on Old Glory red, and every one of these brands publishes a
 * monochrome form for exactly this case. The red/white pairing is also
 * the project's own rule — red never carries anything but white.
 *
 * ⭐ The Google mark is the **authentic four-path G**, rendered in one
 * colour. An earlier cut invented a single-path approximation, which is
 * both wrong and the kind of thing a brand owner minds; the geometry
 * here is the real one, so switching it back to full colour later is a
 * fill change rather than a redraw.
 */
