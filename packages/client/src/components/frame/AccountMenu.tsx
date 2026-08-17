/**
 * AccountMenu — the frame's identity + account-actions primitive. A
 * dropdown off the identity label (portrait + name), state-polymorphic
 * over the connected identity:
 *
 *   - real character → Switch character · Sign out (two distinct exits:
 *     leaving the world keeps the account; signing out ends it).
 *   - guest         → "Sign in to save" (their session is unsaveable) ·
 *     Sign out.
 *
 * Logged-out is the start screen's job, not this menu — the menu only
 * appears in-world. Portrait + the guest marker come from the server
 * (`auth.player`), never a client-side guess.
 *
 * ⚠ **`extras` is where the mobile bar puts Views and Settings.** On a
 * phone neither earns a permanent slot in a two-row bar when the
 * identity chip is already a dropdown holding account actions — but
 * dropping them would regress two shipped surfaces, so they move rather
 * than go. Presentational only: same components, same commands,
 * different home. The slot is a `ReactNode` rather than a `mobile`
 * boolean because this component should not know what a viewport is;
 * whoever composes the bar does.
 */

import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { SERVER_URL } from "../../config";
import { websocketClient } from "../../services/websocket";
import { signOut } from "../../services/auth";
import { tokens } from "../ui";
import { Portrait } from "./Portrait";

const Root = styled.div`
  position: relative;
  font-family: ${tokens.font.family};
`;

const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  color: ${tokens.color.fg};
  font-family: inherit;
  font-size: ${tokens.font.small};
  cursor: pointer;

  &:hover {
    background: ${tokens.color.surfaceAlt};
    border-color: ${tokens.color.borderMuted};
  }
`;

const GuestTag = styled.span`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.warning};
`;

const Menu = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + ${tokens.space.xs});
  min-width: 160px;
  /*
   * ⚠ Bounded, because the extras slot can make this menu carry the
   * whole Views list on a phone. Right-anchored content that grows past
   * the LEFT edge of a 320px viewport scrolls the page sideways just as
   * surely as content that grows past the right — the add-widget menu's
   * failure in the other direction.
   */
  max-width: min(280px, calc(100vw - ${tokens.space.xl}));
  overflow-x: hidden;
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  z-index: 50;
  display: flex;
  flex-direction: column;
  padding: ${tokens.space.xs};
`;

const Item = styled.button`
  text-align: left;
  background: transparent;
  border: none;
  color: ${tokens.color.fg};
  font-family: inherit;
  font-size: ${tokens.font.small};
  padding: ${tokens.space.sm};
  border-radius: ${tokens.radius.sm};
  cursor: pointer;

  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${tokens.color.borderMuted};
  margin: ${tokens.space.xs} 0;
`;

interface AccountMenuProps {
  /**
   * Extra menu content, rendered above the account actions and
   * separated from them. The mobile bar passes Views + Settings here.
   */
  extras?: React.ReactNode;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ extras }) => {
  const player = useStore((s) => s.auth.player);
  const displayName = useStore((s) => s.auth.user?.displayName);
  const isWizard = useStore((s) => s.auth.isWizard === true);
  const setSocialPanelOpen = useStore((s) => s.setSocialPanelOpen);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!player) return null;
  const isGuest = player.isGuest === true;
  const name =
    [player.name, player.surname].filter(Boolean).join(" ") ||
    displayName ||
    "You";

  const handleSignOut = () => {
    setOpen(false);
    void signOut();
  };

  // Reconnect drops back through Login, which presents the roster —
  // the account stays signed in, the avatar persists linkdead.
  const switchCharacter = () => {
    setOpen(false);
    websocketClient.reconnectNow();
  };

  const signIn = () => {
    setOpen(false);
    window.location.href = `${SERVER_URL}/auth/google`;
  };

  // Enter build mode (the CMS, re-homed in-session). Command-bus
  // primacy: an explicit `cockpit mode build` click, not a takeover tab
  // — the WebSocket session stays live. Visible only to developers (a
  // non-authoritative UX gate; the REST CMS routes remain the authority).
  const openCms = () => {
    setOpen(false);
    websocketClient.sendCommand("cockpit mode build");
  };

  // Open the "Social / Notifications" settings card — the thin front over
  // the `notify` verb (display lensing + notification policy). A modal
  // toggled via a store flag; App renders the card when it's set.
  const openSocial = () => {
    setOpen(false);
    setSocialPanelOpen(true);
  };

  return (
    <Root ref={rootRef}>
      <Trigger
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Portrait url={player.portraitUrl} name={name} />
        <span>{name}</span>
        {isGuest && <GuestTag>guest</GuestTag>}
        <span aria-hidden="true">▾</span>
      </Trigger>
      {open && (
        <Menu role="menu">
          {extras ? (
            <>
              {extras}
              <Divider aria-hidden="true" />
            </>
          ) : null}
          {isGuest ? (
            /*
             * ⚠⚠ **Not "Sign in to save".** That was the shipped copy
             * and it promised the one thing a guest session explicitly
             * does not get: the front door states that a guest keeps
             * nothing and nobody can find them again, and there is no
             * conversion path — a guest is `anon:<nanoid>` with no
             * persisted User. Copy that implies the session carries
             * over is worse than a wrong number, because the player
             * acts on it: they keep playing believing the work is
             * banked.
             *
             * Signing in starts a REAL character, fresh. Say that.
             */
            <Item role="menuitem" onClick={signIn} title="This guest session is not carried over">
              Sign in to start a character
            </Item>
          ) : (
            <Item role="menuitem" onClick={switchCharacter}>
              Switch character
            </Item>
          )}
          <Item role="menuitem" onClick={openSocial}>
            Social / Notifications
          </Item>
          {isWizard && (
            <Item role="menuitem" onClick={openCms}>
              CMS editor
            </Item>
          )}
          <Item role="menuitem" onClick={handleSignOut}>
            Sign out
          </Item>
        </Menu>
      )}
    </Root>
  );
};
