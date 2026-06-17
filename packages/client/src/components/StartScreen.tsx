/**
 * StartScreen — the plain-UI front door (the `unauthenticated` phase).
 * No diegetic metaphor: the lounge is the first room; this is just the
 * app's start screen. Offers a provider sign-in list + anonymous guest
 * play, and (dev builds only) the no-OAuth dev login.
 *
 * Replaces the old inline login-takeover + its raw-hex styling. The
 * provider set is a data-shaped list, not hardcoded anchors, so adding
 * Twitch later is a list entry + wiring (the auth-providers slate owns
 * the mechanics — here it's an inert slot).
 */

import React, { useState } from "react";
import styled from "styled-components";
import { SERVER_URL, WS_URL } from "../config";
import { websocketClient } from "../services/websocket";
import { useStore } from "../store/index";
import { tokens } from "./ui";

const Screen = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.lg};
  min-width: 280px;
  padding: ${tokens.space.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
`;

const Title = styled.h1`
  margin: 0;
  font-size: ${tokens.font.title};
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
`;

const Action = styled.button<{ $primary?: boolean }>`
  display: block;
  width: 100%;
  text-align: center;
  padding: ${tokens.space.md};
  border-radius: ${tokens.radius.md};
  border: 1px solid ${tokens.color.border};
  background: ${(p: { $primary?: boolean }) =>
    p.$primary ? tokens.color.primary : tokens.color.actionBg};
  color: ${(p: { $primary?: boolean }) =>
    p.$primary ? "#fff" : tokens.color.fg};
  font-family: inherit;
  font-size: ${tokens.font.body};
  cursor: pointer;
  text-decoration: none;

  &:hover:not(:disabled) {
    background: ${(p: { $primary?: boolean }) =>
      p.$primary ? tokens.color.primaryHover : tokens.color.actionBgHover};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-top: 1px solid ${tokens.color.borderMuted};
  }
`;

/** Sign-in providers. Google and Twitch are co-equal login providers
 *  (the auth-providers build wired Twitch). The list stays data-shaped so
 *  a future provider is one more entry. */
const PROVIDERS: ReadonlyArray<{
  key: string;
  label: string;
  href?: string;
  enabled: boolean;
}> = [
  {
    key: "google",
    label: "Sign in with Google",
    href: "/auth/google",
    enabled: true,
  },
  {
    key: "twitch",
    label: "Sign in with Twitch",
    href: "/auth/twitch",
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
  font-size: ${tokens.font.micro};
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

  return (
    <Screen>
      <Panel>
        <Title>Saxonberg 2.0</Title>
        {PROVIDERS.map((p) =>
          p.enabled && p.href ? (
            <Action key={p.key} as="a" href={`${SERVER_URL}${p.href}`} $primary>
              {p.label}
            </Action>
          ) : (
            <Action key={p.key} disabled title="Coming soon">
              {p.label}
            </Action>
          ),
        )}
        <Divider>or</Divider>
        <Action onClick={playAsGuest} disabled={guestBusy}>
          {guestBusy ? "Connecting…" : "Play as guest"}
        </Action>
        {import.meta.env.DEV && <DevLogin />}
      </Panel>
    </Screen>
  );
};
