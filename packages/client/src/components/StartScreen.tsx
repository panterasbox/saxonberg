/**
 * StartScreen — the front door (the `unauthenticated` phase).
 *
 * No diegetic metaphor: the lounge is the first room; this is the app's
 * front door. It carries the pitch, the three chambers, the provider
 * sign-in list, the anonymous guest path, and the {@link PressRoom} —
 * what the world can read without an account.
 *
 * ⚠ **Every claim on this screen has a source.** It is the screen a
 * stranger judges the project on, which is exactly where the temptation
 * to fill space with plausible copy is strongest. Two consequences:
 *
 *   - the presence line renders a **live count** from `/auth/status`,
 *     not the art's static "it is usually quiet · you may be the only
 *     person on";
 *   - the reset notice renders **only when the server reports a reset
 *     policy**. The handoff art shipped "the world resets nightly ·
 *     nothing survives to tomorrow yet" as fixed copy while no cron, CI
 *     job or script implemented a wipe — and three design documents went
 *     on to reason *from* it. A claim about whether the player's own
 *     work survives the night is the most expensive kind to get wrong.
 *
 * ⚠ The `PressRoom` is **never awaited**: the sign-in and guest controls
 * paint whether it loads, is empty, or is gone, and it renders `null`
 * rather than an error in the last case.
 *
 * Compact layout is a reflow, not a different composition — one column,
 * sign-in above the fold, the press room as the scroll — so this uses
 * plain CSS rather than a `useIsCompact` branch. The chrome's mobile bar
 * is the case that genuinely needs the hook; this is not.
 */

import React, { useState } from "react";
import styled from "styled-components";
import { SERVER_URL, WS_URL } from "../config";
import { websocketClient } from "../services/websocket";
import { useStore } from "../store/index";
import { tokens } from "./ui";
import { PressRoom } from "./PressRoom";
import { Seal } from "./frame/Seal";

const Screen = styled.div`
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  overflow-y: auto;
`;

const Inner = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: ${tokens.space.xxl} ${tokens.space.xl} ${tokens.space.xxl};
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.space.xxl};

  @media (min-width: 900px) {
    grid-template-columns: 1fr 320px;
    align-items: start;
    padding-top: 3rem;
  }
`;

/* ── Masthead ──────────────────────────────────────────────────── */

const Masthead = styled.header`
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
 * `docs/brand/saxonberg-seal.svg` and already on the in-world top bar —
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
const SealWrap = styled.div`
  flex: none;
  display: grid;
  place-items: center;
`;

const WordMark = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.display};
  letter-spacing: 0.04em;
  color: ${tokens.color.fg};
  line-height: 1.1;
`;

const Tagline = styled.div`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const Headline = styled.h1`
  margin: 0 0 ${tokens.space.lg};
  font-family: ${tokens.font.serif};
  font-size: 26px;
  font-weight: 500;
  line-height: 1.25;
  text-wrap: balance;
  color: ${tokens.color.fg};
`;

const Lede = styled.p`
  margin: 0 0 ${tokens.space.xxl};
  max-width: 56ch;
  font-size: ${tokens.font.title};
  line-height: 1.65;
  color: ${tokens.color.fgDim};
`;

/* ── The three chambers ────────────────────────────────────────── */

const SectionLabel = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
  margin-bottom: ${tokens.space.lg};
`;

const Chambers = styled.ol`
  list-style: none;
  margin: 0 0 ${tokens.space.xxl};
  padding: 0;
  display: grid;
  gap: ${tokens.space.lg};

  @media (min-width: 620px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Chamber = styled.li`
  padding: ${tokens.space.lg};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surface};
`;

/**
 * ⚠ The ordinal is real information, not decoration: the chambers are
 * a fixed, named set of three and the numbering is how the Compact
 * refers to them. It is not a "01 / 02 / 03" flourish over an arbitrary
 * list.
 */
const ChamberOrdinal = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const ChamberName = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.title};
  letter-spacing: 0.06em;
  color: ${tokens.color.fg};
  margin: ${tokens.space.xs} 0;
`;

const ChamberNote = styled.div`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const CHAMBERS: ReadonlyArray<{ n: string; name: string; note: string }> = [
  { n: "01", name: "Make", note: "You built it" },
  { n: "02", name: "Fund", note: "You keep it running" },
  { n: "03", name: "Play", note: "You live here" },
];

/* ── Sign-in ───────────────────────────────────────────────────── */

const Panel = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.lg};
  padding: ${tokens.space.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
`;

const PanelHeading = styled.h2`
  margin: 0;
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.title};
  letter-spacing: 0.06em;
  color: ${tokens.color.fg};
`;

const PanelNote = styled.p`
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
const Action = styled.button`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: ${tokens.space.md};
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: ${tokens.space.md} ${tokens.space.lg};
  border-radius: ${tokens.radius.md};
  border: 1px solid ${tokens.color.border};
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  font-family: inherit;
  font-size: ${tokens.font.body};
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;

  &:hover:not(:disabled) {
    filter: brightness(1.07);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${tokens.color.fgEmphasis};
    outline-offset: 2px;
  }
`;

const GuestAction = styled(Action)`
  font-weight: 500;
  background: transparent;
  color: ${tokens.color.fgDim};
`;

const Divider = styled.div`
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

const Facts = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  margin-top: ${tokens.space.xl};
  padding-top: ${tokens.space.lg};
  border-top: 1px solid ${tokens.color.borderMuted};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  line-height: 1.6;
`;

/**
 * The platform marks.
 *
 * ⚠ Somebody else's trademarks, so the colours come from the
 * **invariant** ground — identical in every theme, because a brand does
 * not restyle itself for our dark mode. The glyphs are simplified
 * monochrome forms, which is what a sign-in row wants and what most
 * brand guidelines permit at this size.
 *
 * ⚠ `currentColor` is deliberately NOT used: these must read as the
 * platform's colour, not the button's.
 */
const Glyph = styled.svg<{ $tint: string }>`
  flex: none;
  width: 16px;
  height: 16px;
  fill: ${(p) => p.$tint};
`;

function ProviderMark({ provider }: { provider: string }) {
  if (provider === "google") {
    return (
      <Glyph $tint={tokens.brand.google} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.35 11.1H12v2.99h5.35c-.23 1.46-1.7 4.28-5.35 4.28-3.22 0-5.85-2.66-5.85-5.94S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.66 3.9 14.5 3 12 3 6.98 3 2.9 7.03 2.9 12s4.08 9 9.1 9c5.25 0 8.73-3.69 8.73-8.88 0-.6-.06-1.05-.15-1.5l-1.23.48z" />
      </Glyph>
    );
  }
  if (provider === "twitch") {
    return (
      <Glyph $tint={tokens.brand.twitch} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.3 3 3 6.5v12.2h4.2V21h2.3l2.2-2.3h3.4L20 14.5V3H4.3zm14.2 10.7-2.6 2.6h-3.9l-2.2 2.2v-2.2H6.5V4.6h12v9.1zM15 7.7v4.6h-1.6V7.7H15zm-4.2 0v4.6H9.2V7.7h1.6z" />
      </Glyph>
    );
  }
  return (
    <Glyph $tint={tokens.brand.kick} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3h5.4v5.4h2.7V5.7h2.7V3h5.4v8.1h-2.7v1.8h2.7V21h-5.4v-2.7h-2.7v-2.7H8.4V21H3V3z" />
    </Glyph>
  );
}

/**
 * Sign-in providers.
 *
 * ⭐⭐ **Co-equal, and rendered co-equal.** Every one of these is a
 * full login provider — the same account either way — so none of them
 * gets the committing-action red. An earlier cut gave the red to every
 * *configured* provider, which on this dev server (Google only) read as
 * Google being favoured and on a fully-configured server would have
 * rendered three red buttons.
 *
 * ⚠ The token layer reserves that red for "the single committing action
 * per screen"; a menu of three equivalent choices is not one.
 *
 * ⚠ **YouTube is not here, and must not be.** YouTube/Twitch/Kick are
 * the *streaming* platforms; the *login* providers are
 * Google/Twitch/Kick, and signing in with a YouTube account IS signing
 * in with Google. A YouTube button would advertise a fourth provider
 * that does not exist.
 */
const PROVIDERS: ReadonlyArray<{
  key: string;
  label: string;
  href?: string;
  enabled: boolean;
}> = [
  {
    key: "google",
    label: "Continue with Google",
    href: "/auth/google",
    enabled: true,
  },
  {
    key: "twitch",
    label: "Continue with Twitch",
    href: "/auth/twitch",
    enabled: true,
  },
  {
    key: "kick",
    label: "Continue with Kick",
    href: "/auth/kick",
    enabled: true,
  },
];

const DevBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.md};
  border: 1px dashed ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.md};
`;

const DevLabel = styled.div`
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const DevInput = styled.input`
  background: ${tokens.color.surfaceMuted};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  font-family: inherit;
  font-size: ${tokens.font.small};
  padding: ${tokens.space.sm};
`;

const DevRow = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
`;

/** Dev-only no-OAuth login. Stripped from production by `import.meta.env.DEV`. */
function DevLogin() {
  const [handle, setHandle] = useState("dev");
  const [busy, setBusy] = useState(false);
  const login = async (withCharacter: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${SERVER_URL}/auth/test-login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim() || "dev", withCharacter }),
      });
      if (!res.ok) throw new Error("dev login failed");
      // No reload — connect in place like the guest path. "Skip to world"
      // provisioned a character, so flag the auto-enter for
      // CharacterSelect; "New character" has none → char-gen.
      if (withCharacter) useStore.getState().setAutoEnterPending(true);
      websocketClient.connect(WS_URL);
    } catch {
      setBusy(false);
    }
  };
  return (
    <DevBox>
      <DevLabel>dev login — no OAuth (local only)</DevLabel>
      <DevInput
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="handle (each one is its own user)"
        aria-label="dev login handle"
      />
      <DevRow>
        <Action disabled={busy} onClick={() => login(false)}>
          {busy ? "Connecting…" : "New character →"}
        </Action>
        <Action disabled={busy} onClick={() => login(true)}>
          {busy ? "Connecting…" : "Skip to world"}
        </Action>
      </DevRow>
    </DevBox>
  );
}

/**
 * The presence line.
 *
 * ⚠ Three states, and the third is the point: a number, a real zero, or
 * — when the server did not answer — **nothing at all**. An unanswered
 * count must not render as "nobody is on", which is a different claim
 * and a discouraging one to get wrong.
 */
function PresenceLine({ online }: { online?: number }) {
  if (online === undefined) return null;
  if (online === 0) {
    return (
      <div data-testid="presence-line">
        Nobody is connected right now. The lounge still works, and the world
        is yours to wander.
      </div>
    );
  }
  return (
    <div data-testid="presence-line">
      {online === 1
        ? "One person is connected right now."
        : `${online} people are connected right now.`}
    </div>
  );
}

export const StartScreen: React.FC = () => {
  const [guestBusy, setGuestBusy] = useState(false);

  const playAsGuest = async () => {
    if (guestBusy) return;
    setGuestBusy(true);
    try {
      const res = await fetch(`${SERVER_URL}/auth/guest`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("guest auth failed");
      // NO reload: connect the socket in place and stay on this screen
      // showing "Connecting…". The server mints the guest avatar on
      // entry and sends the welcome frame, which flips us straight to the
      // terminal — the guest never passes through the character-select
      // phase (no roster flash). On failure the connection state machine
      // drives the phase back here.
      websocketClient.connect(WS_URL);
    } catch {
      setGuestBusy(false);
    }
  };

  // Providers the server reports as configured (`/auth/status`). Until
  // the fetch lands (null) every entry renders enabled; once known, a
  // provider the server can't honor renders disabled instead of
  // dead-ending into an OAuth error.
  const configured = useStore((s) => s.configuredProviders);
  const serverEnabled = (key: string): boolean =>
    configured === null || configured.includes(key);

  const facts = useStore((s) => s.serverFacts);

  return (
    <Screen data-testid="start-screen">
      <Inner>
        <div>
          <Masthead>
            <SealWrap>
              <Seal size={38} id="sx-seal-door" title="Saxonberg" />
            </SealWrap>
            <div>
              <WordMark>Saxonberg</WordMark>
              <Tagline>
                a multiplayer text world · governed by the people in it
              </Tagline>
            </div>
          </Masthead>

          <Headline>A world your community actually runs.</Headline>
          <Lede>
            Real units and real math underneath, with no fudge in the
            substrate. A written Compact on top, where standing is earned by
            what you do and every decision lands in a record anyone can read.
          </Lede>

          <SectionLabel>Standing is earned in three chambers</SectionLabel>
          <Chambers>
            {CHAMBERS.map((c) => (
              <Chamber key={c.name}>
                <ChamberOrdinal>{c.n}</ChamberOrdinal>
                <ChamberName>{c.name}</ChamberName>
                <ChamberNote>{c.note}</ChamberNote>
              </Chamber>
            ))}
          </Chambers>

          <PressRoom />
        </div>

        <Panel>
          <PanelHeading>Sign in</PanelHeading>
          <PanelNote>
            Your character, your record, and everything you build persist to
            an account. One click — no password to make.
          </PanelNote>

          {PROVIDERS.map((p) =>
            p.enabled && p.href && serverEnabled(p.key) ? (
              <Action key={p.key} as="a" href={`${SERVER_URL}${p.href}`}>
                <ProviderMark provider={p.key} />
                {p.label}
              </Action>
            ) : (
              <Action
                key={p.key}
                disabled
                title={
                  p.enabled ? "Not configured on this server" : "Coming soon"
                }
              >
                <ProviderMark provider={p.key} />
                {p.label}
              </Action>
            ),
          )}

          <Divider>or</Divider>

          <GuestAction
            onClick={playAsGuest}
            disabled={guestBusy}
            data-testid="guest-button"
          >
            {guestBusy ? "Connecting…" : "Look around as a guest"}
          </GuestAction>
          <PanelNote data-testid="guest-warning">
            A guest is anonymous and temporary. Nothing you make is kept,
            nobody can find you again, and the record that makes the game
            worth playing never starts. Fine for a look; not a way to play.
          </PanelNote>

          {import.meta.env.DEV && <DevLogin />}

          <Facts>
            <PresenceLine online={facts.online} />
            {/*
              ⚠ Rendered ONLY when the server states a policy. There is
              no fallback string here and there must never be one — see
              the file header.
            */}
            {facts.resetPolicy ? (
              <div data-testid="reset-notice">
                The world resets {facts.resetPolicy}.
              </div>
            ) : null}
          </Facts>
        </Panel>
      </Inner>
    </Screen>
  );
};
