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
 * The composition is **full-bleed horizontal bands** — hero (seal,
 * wordmark, headline and the sign-in column together), then chambers,
 * then the press room and facts. Only band *contents* are width-capped,
 * so the page reads as a civic document rather than a centred card.
 *
 * ⚠ **Every provider gets the same treatment** — same seal red, same
 * white monochrome mark. Giving one a distinct colour or position
 * states a partnership that does not exist; they are login vectors, and
 * the world does not care which one you came through.
 *
 * Compact layout is a reflow, not a different composition — one column,
 * sign-in above the fold, the press room as the scroll — so this uses
 * plain CSS rather than a `useIsCompact` branch. The chrome's mobile bar
 * is the case that genuinely needs the hook; this is not.
 */

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  withDoor,
  arrival,
  providerOrder,
  lastProvider,
  arrivalWatching,
  withGuestWatch,
} from "../services/arrival";
import { ShowTile, carrierLinkOf } from "./front/ShowTile";
import type { FrontResponse } from "@saxonberg/types";
import { SERVER_URL, WS_URL } from "../config";
import { websocketClient } from "../services/websocket";
import { useStore } from "../store/index";
import { tokens } from "./ui";
import {
  Action,
  FrontPage,
  FrontInner,
  HostBar,
  HostName,
  IdentityBand,
  FoldBand,
  FoldLeft,
  FoldRight,
  FrontHeading,
  ChamberList,
  ChamberRow,
  ChamberMark,
  ChamberText,
  FRONT_CHAMBERS,
  SignInPanel,
  SmallNote,
  MuteNote,
  GuestRow,
  PresenceRule,
  NewsBand,
  NewsMain,
  NewsSide,
  RuledList,
  CalendarRow,
  CalendarBox,
  CalendarTitle,
  CalendarNote,
  FrontFooter,
} from "./front/Bands";
import { Latest } from "./front/Latest";
import { Seal } from "./frame/Seal";
import { Tip } from "./tooltip/Tip";
import { hoverDoc } from "./doc/docs";

const Glyph = styled.svg`
  flex: none;
  width: 18px;
  height: 18px;
  fill: ${tokens.color.sealInk};
`;

function ProviderMark({ provider }: { provider: string }) {
  if (provider === "google") {
    return (
      <Glyph viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.29 6.16-4.29z" />
      </Glyph>
    );
  }
  if (provider === "twitch") {
    return (
      <Glyph viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.3 3 3 6.5v12.2h4.2V21h2.3l2.2-2.3h3.4L20 14.5V3H4.3zm14.2 10.7-2.6 2.6h-3.9l-2.2 2.2v-2.2H6.5V4.6h12v9.1zM15 7.7v4.6h-1.6V7.7H15zm-4.2 0v4.6H9.2V7.7h1.6z" />
      </Glyph>
    );
  }
  return (
    <Glyph viewBox="0 0 24 24" aria-hidden="true">
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

/**
 * ⚠ Neutral, NOT the sign-in red. These are a local-only debug
 * affordance; inheriting `Action`'s red made a dev shortcut the loudest
 * control on the panel and diluted the one signal the red carries.
 */
const DevAction = styled(Action)`
  justify-content: center;
  border-color: ${tokens.color.border};
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  font-weight: 500;
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
      // ⭐ Tell OUR OWN store the session exists. The OAuth path gets
      // this for free — it redirects, the app remounts, and the
      // `/auth/status` bootstrap calls `setAuth`. This path never
      // reloads, so without it `connectionPhase` stays
      // `unauthenticated` and the front door never yields: the socket
      // connects, the server sends the character-select frames, and the
      // client sits on "Connecting…" forever because it is still
      // rendering the login takeover. (The guest path does not need it
      // because the server mints and ENTERS immediately, and the
      // welcome frame flips the phase on its own.)
      const data = (await res.json().catch(() => null)) as {
        isAuthenticated?: boolean;
        user?: { id?: string } | null;
      } | null;
      const id = data?.user?.id;
      useStore.getState().setAuth({
        isAuthenticated: data?.isAuthenticated !== false,
        user: id ? { id, email: "", displayName: handle.trim() || "dev" } : null,
        player: null,
        isWizard: false,
      });
      // "Skip to world" provisioned a character, so flag the auto-enter
      // for CharacterSelect; "New character" has none → char-gen.
      if (withCharacter) useStore.getState().setAutoEnterPending(true);
      websocketClient.connect(withDoor(WS_URL));
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
        <DevAction disabled={busy} onClick={() => login(false)}>
          {busy ? "Connecting…" : "New character →"}
        </DevAction>
        <DevAction disabled={busy} onClick={() => login(true)}>
          {busy ? "Connecting…" : "Skip to world"}
        </DevAction>
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

/** What the page says about where the visitor came from (D7). */
function cameFromLine(): string | null {
  const a = arrival();
  if (a.door === "twitch") return "You came from Twitch.";
  if (a.door === "kick") return "You came from Kick.";
  if (a.door === "youtube") return "You came from YouTube — sign in with the Google account you watch on.";
  if (a.door === "stream") return "You came from the stream.";
  return null;
}

/**
 * ⭐ Fetch the front page's program (`/api/front`, anonymous) — with the
 * name and carrier the link asked about — on mount and every minute while
 * the page shows. Never awaited: the page paints whether it answers, is
 * slow, or is gone (then there is no show band).
 */
function useFrontAnswer(): void {
  const setFront = useStore((s) => s.setFront);
  useEffect(() => {
    let live = true;
    const a = arrival();
    const q = new URLSearchParams();
    if (a.watch && a.carrier) {
      q.set("watch", a.watch);
      q.set("carrier", a.carrier);
    }
    const url = `${SERVER_URL}/api/front${q.toString() ? `?${q}` : ""}`;
    const read = (): void => {
      fetch(url, { credentials: "omit" })
        .then((r) => (r.ok ? (r.json() as Promise<FrontResponse>) : null))
        .then((body) => {
          if (live && body) setFront(body);
        })
        .catch(() => undefined);
    };
    read();
    const timer = window.setInterval(read, 60_000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [setFront]);
}

export const StartScreen: React.FC = () => {
  const [guestBusy, setGuestBusy] = useState(false);
  useFrontAnswer();
  const show = useStore((s) => s.front?.show ?? null);
  const cameFrom = cameFromLine();
  const order = providerOrder(arrival().carrier, lastProvider());
  const guestWatches = arrivalWatching(show, useStore((s) => s.playerClosed)) !== null;

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
      // ⭐ A guest runs no command, so the two words ride the socket URL,
      // built NOW (stream arrival D4) — the guest arrives watching.
      const st = useStore.getState();
      websocketClient.connect(
        withGuestWatch(withDoor(WS_URL), arrivalWatching(st.front?.show ?? null, st.playerClosed)),
      );
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

  const feeds = show ? (["twitch", "youtube", "kick"] as const).filter((c) => show.feeds[c]) : [];

  return (
    <FrontPage data-testid="start-screen">
      {/* 1 · the host bar */}
      <HostBar>
        <FrontInner>
          <PanterasBoxMark />
          <a href="https://www.panterasbox.com">
            A <HostName>Pantera&apos;s Box</HostName> community <span aria-hidden="true">↗</span>
          </a>
        </FrontInner>
      </HostBar>

      {/* 2 · identity */}
      <IdentityBand>
        <FrontInner>
          <Seal size={44} id="sx-seal-door" label="Saxonberg" />
          <div style={{ minWidth: 0 }}>
            <h1>Saxonberg</h1>
            <p>
              The platform the Pantera&apos;s Box community is building
              together, run under a written Compact. It isn&apos;t finished —
              you&apos;d be joining before 1.0.
            </p>
          </div>
        </FrontInner>
      </IdentityBand>

      {/* 3 · above the fold: the chambers; sign-in, then the show */}
      <FoldBand>
        <FrontInner>
          <FoldLeft>
            <section aria-labelledby="fp-asks">
              <FrontHeading id="fp-asks">What you&apos;re signing up for</FrontHeading>
              {/* ⚠ The sentences only: each chamber's WANTED · FUNDING NOW ·
                  NEEDS block has no source yet, so it is absent, never a
                  sample (requirements § The front page). */}
              <ChamberList data-testid="chambers">
                {FRONT_CHAMBERS.map((c) => (
                  <ChamberRow key={c.n}>
                    <ChamberMark>
                      <div>{c.n}</div>
                      <div>{c.name}</div>
                    </ChamberMark>
                    <ChamberText>
                      <strong>{c.lead}</strong>
                      {c.rest}
                    </ChamberText>
                  </ChamberRow>
                ))}
              </ChamberList>
            </section>
          </FoldLeft>

          <FoldRight>
            <SignInPanel aria-labelledby="fp-signin">
              <h2 id="fp-signin">Sign in</h2>
              {cameFrom ? <SmallNote data-testid="came-from">{cameFrom}</SmallNote> : null}
              {[...PROVIDERS]
                .sort((a, b) => order.indexOf(a.key as never) - order.indexOf(b.key as never))
                .map((p) =>
                  p.enabled && p.href && serverEnabled(p.key) ? (
                    <Action key={p.key} as="a" href={`${SERVER_URL}${p.href}`} data-testid={`provider-${p.key}`}>
                      <ProviderMark provider={p.key} />
                      {p.label}
                    </Action>
                  ) : (
                    <Tip key={p.key} tip={hoverDoc(p.enabled ? "Not configured on this server" : "Coming soon")}>
                      <Action disabled data-testid={`provider-${p.key}`}>
                        <ProviderMark provider={p.key} />
                        {p.label}
                      </Action>
                    </Tip>
                  ),
                )}
              {/* ⭐ The guest is supported, never promoted: a plain row
                  under the providers, never in the show tile. */}
              <GuestRow type="button" onClick={playAsGuest} disabled={guestBusy} data-testid="guest-button">
                {guestBusy ? "Connecting…" : "Look around as a guest"}
              </GuestRow>
              <MuteNote data-testid="guest-warning">
                A guest keeps nothing, and nobody can find them.
                {guestWatches ? " You will arrive watching the show." : ""}
              </MuteNote>
              {facts.online !== undefined ? (
                <PresenceRule>
                  <PresenceLine online={facts.online} />
                </PresenceRule>
              ) : null}
              {/*
                ⚠ Rendered ONLY when the server states a policy. There is
                no fallback string here and there must never be one — see
                the file header.
              */}
              {facts.resetPolicy ? (
                <PresenceRule data-testid="reset-notice">
                  {facts.resetPolicy}. Published news survives; everything
                  else — characters, standing, what you built — starts over.
                  It means you can try anything.
                </PresenceRule>
              ) : null}
              {import.meta.env.DEV && <DevLogin />}
            </SignInPanel>

            {/* The show: a small thumbnail, present, not the headliner —
                and the DOCK, the video's one place before the world. */}
            {show ? <ShowTile /> : null}
          </FoldRight>
        </FrontInner>
      </FoldBand>

      {/* 4 · Latest and the calendar */}
      <NewsBand id="fp-news">
        <FrontInner>
          <NewsMain>
            <Latest />
          </NewsMain>
          {show?.nextShow ? (
            <NewsSide>
              <section aria-labelledby="fp-cal" data-testid="coming-up">
                <FrontHeading id="fp-cal">Coming up</FrontHeading>
                <RuledList>
                  <CalendarRow>
                    <CalendarBox>Next</CalendarBox>
                    <div style={{ minWidth: 0 }}>
                      <CalendarTitle>{show.title}</CalendarTitle>
                      <CalendarNote>
                        {show.nextShow}
                        {feeds.length > 0
                          ? ` · ${feeds.map((c) => CARRIER_LABEL[c]).join(", ")}`
                          : ""}
                      </CalendarNote>
                    </div>
                  </CalendarRow>
                </RuledList>
              </section>
            </NewsSide>
          ) : null}
        </FrontInner>
      </NewsBand>

      {/* 5 · the footer: links with real destinations only. */}
      <FrontFooter data-testid="front-footer">
        <FrontInner>
          <a href="https://www.panterasbox.com">panterasbox.com</a>
          {show
            ? feeds.map((c) => (
                <a key={c} href={carrierLinkOf(c, show.feeds[c]!)} target="_blank" rel="noreferrer">
                  the show on {CARRIER_LABEL[c]}
                </a>
              ))
            : null}
          <a href="https://gitlab.com/panterasbox/saxonberg" target="_blank" rel="noreferrer">
            Source (AGPL)
          </a>
        </FrontInner>
      </FrontFooter>
    </FrontPage>
  );
};

const CARRIER_LABEL = { twitch: "Twitch", youtube: "YouTube", kick: "Kick" } as const;

/** The host's hex mark (the host bar), as the design draws it. */
function PanterasBoxMark(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 1 L92.435 25.5 L92.435 74.5 L50 99 L7.565 74.5 L7.565 25.5 Z" fill={tokens.color.seal} />
      <path
        d="M50 4.5 L89.404 27.25 L89.404 72.75 L50 95.5 L10.596 72.75 L10.596 27.25 Z"
        fill="none"
        stroke={tokens.color.sealInk}
        strokeWidth="3"
      />
      <g transform="translate(50 50) scale(0.72) translate(-50 -50)" fill={tokens.color.sealInk}>
        <path d="M50 50 L17.09 31 L50 12 L82.91 31 Z" transform="translate(50 31) scale(0.895) translate(-50 -31)" />
        <path d="M50 50 L82.91 31 L82.91 69 L50 88 Z" transform="translate(66.46 59.5) scale(0.895) translate(-66.46 -59.5)" />
        <path d="M50 50 L50 88 L17.09 69 L17.09 31 Z" transform="translate(33.55 59.5) scale(0.895) translate(-33.55 -59.5)" />
      </g>
    </svg>
  );
}
