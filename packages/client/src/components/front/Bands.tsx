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

/** The hero: the words on the left, the dock (the show) on the right. */
export const HeroInner = styled(BandInner)`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${tokens.space.xl};

  > :first-child {
    flex: 1 1 24rem;
    min-width: 0;
  }
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

/* ══ The front page, as designed (docs/design/front-page/front-page.dc.html) ══
 *
 * ⭐ Review 11-24 (the owner): the front page is the DESIGN's layout, not
 * the old bands with new content. Five full-width bands, each with a
 * 1180px inner: the host bar · identity · above the fold (the chambers on
 * the left; sign-in then the show on the right — `wrap-reverse`, so on a
 * phone sign-in and the show come first) · Latest beside Coming up · the
 * footer. The show is a small thumbnail under sign-in: present, not the
 * headliner — and the DOCK, the video's one place before the world.
 */

const PAD_X = "clamp(16px, 4vw, 32px)";

export const FrontPage = styled.div`
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: 14px;
  line-height: 1.5;
  overflow-x: hidden;
`;

const FrontBand = styled.div`
  width: 100%;
  box-sizing: border-box;
  padding-left: ${PAD_X};
  padding-right: ${PAD_X};
`;

export const FrontInner = styled.div`
  max-width: 1180px;
  margin: 0 auto;
`;

export const HostBar = styled(FrontBand)`
  background: ${tokens.color.surfaceMuted};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  padding-top: 4px;
  padding-bottom: 4px;

  ${FrontInner} {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  a {
    color: ${tokens.color.fgDim};
    text-decoration: none;
    font-size: 12.5px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
  }
`;

export const HostName = styled.span`
  font-family: ${tokens.font.engraved};
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${tokens.color.fg};
`;

export const IdentityBand = styled(FrontBand)`
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.border};
  padding-top: 14px;
  padding-bottom: 14px;

  ${FrontInner} {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  h1 {
    margin: 0;
    font-family: ${tokens.font.engraved};
    font-weight: 500;
    font-size: 24px;
    letter-spacing: 0.19em;
    text-transform: uppercase;
    line-height: 1.1;
  }
  p {
    margin: 2px 0 0;
    font-size: 13.5px;
    color: ${tokens.color.fgDim};
    max-width: 70ch;
  }
`;

export const FoldBand = styled(FrontBand)`
  padding-top: clamp(16px, 3vw, 24px);
  padding-bottom: clamp(16px, 3vw, 24px);
  border-bottom: 1px solid ${tokens.color.borderMuted};

  ${FrontInner} {
    display: flex;
    flex-wrap: wrap-reverse;
    gap: 22px;
    align-items: flex-end;
  }
`;

export const FoldLeft = styled.div`
  flex: 999 1 520px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const FoldRight = styled.div`
  flex: 1 1 300px;
  max-width: 360px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

/** A section's engraved gold heading. */
export const FrontHeading = styled.h2`
  margin: 0 0 9px;
  font-family: ${tokens.font.engraved};
  font-weight: 500;
  font-size: 13px;
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.fgEmphasis};
`;

export const ChamberList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid ${tokens.color.borderMuted};
`;

export const ChamberRow = styled.li`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  padding: 12px 0;
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

export const ChamberMark = styled.div`
  flex: none;
  width: 84px;

  > div:first-child {
    font-family: ${tokens.font.mono};
    font-size: 11px;
    color: ${tokens.color.fgMuted};
  }
  > div:last-child {
    font-family: ${tokens.font.engraved};
    font-size: 19px;
    letter-spacing: 0.06em;
  }
`;

export const ChamberText = styled.p`
  flex: 1 1 280px;
  min-width: 0;
  margin: 0 0 6px;
  color: ${tokens.color.fgDim};

  strong {
    color: ${tokens.color.fg};
    font-weight: 600;
  }
`;

/** The three chambers' sentences, as the design words them. */
export const FRONT_CHAMBERS: ReadonlyArray<{ n: string; name: string; lead: string; rest: string }> = [
  {
    n: "01",
    name: "Make",
    lead: "Build it with us",
    rest: " — places, things, trades, code, and the institutions that run them. Real work, opt-in, and it earns you a say.",
  },
  {
    n: "02",
    name: "Fund",
    lead: "Pay for it.",
    rest: " Real money keeps it running and earns a say in its own chamber, and buys nothing else.",
  },
  {
    n: "03",
    name: "Play",
    lead: "Live here.",
    rest: " Show up and take part. Your say grows from what you actually do, never from what you pay.",
  },
];

export const SignInPanel = styled.section`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: 3px;

  h2 {
    margin: 0;
    font-family: ${tokens.font.engraved};
    font-weight: 500;
    font-size: 13px;
    letter-spacing: 0.19em;
    text-transform: uppercase;
  }
`;

export const SmallNote = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${tokens.color.fgDim};
`;

export const MuteNote = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${tokens.color.fgMuted};
`;

/** The guest: a plain bordered row, not a red provider button. */
export const GuestRow = styled.button`
  min-height: 44px;
  box-sizing: border-box;
  padding: 9px 14px;
  border-radius: 3px;
  border: 1px solid ${tokens.color.border};
  background: transparent;
  color: ${tokens.color.fg};
  font: inherit;
  font-weight: 500;
  text-align: left;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

export const PresenceRule = styled.div`
  padding-top: 8px;
  border-top: 1px solid ${tokens.color.borderMuted};
  font-size: 12.5px;
  color: ${tokens.color.fgDim};
`;

export const NewsBand = styled(FrontBand)`
  padding-top: clamp(18px, 3vw, 28px);
  padding-bottom: clamp(18px, 3vw, 28px);
  border-bottom: 1px solid ${tokens.color.borderMuted};

  ${FrontInner} {
    display: flex;
    flex-wrap: wrap;
    gap: 22px 40px;
    align-items: flex-start;
  }
`;

export const NewsMain = styled.div`
  flex: 3 1 420px;
  min-width: 0;
`;

export const NewsSide = styled.div`
  flex: 2 1 300px;
  min-width: 0;
`;

export const RuledList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid ${tokens.color.borderMuted};
`;

export const CalendarRow = styled.li`
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

export const CalendarBox = styled.div`
  flex: none;
  width: 46px;
  text-align: center;
  border: 1px dashed ${tokens.color.border};
  border-radius: 3px;
  padding: 6px 0;
  font-family: ${tokens.font.mono};
  font-size: 11px;
  color: ${tokens.color.fgMuted};
  text-transform: uppercase;
`;

export const CalendarTitle = styled.div`
  font-size: 13.5px;
  font-weight: 600;
`;

export const CalendarNote = styled.div`
  font-size: 12px;
  color: ${tokens.color.fgDim};
`;

export const FrontFooter = styled.footer`
  width: 100%;
  box-sizing: border-box;
  padding: 18px ${PAD_X} 28px;

  ${FrontInner} {
    display: flex;
    flex-wrap: wrap;
    gap: 0 22px;
    align-items: center;
    font-size: 12.5px;
  }
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: ${tokens.color.fgEmphasis};
  }
  a:hover {
    color: ${tokens.color.fg};
  }
`;
