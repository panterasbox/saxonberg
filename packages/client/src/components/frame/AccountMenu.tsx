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

export const AccountMenu: React.FC = () => {
  const player = useStore((s) => s.auth.player);
  const displayName = useStore((s) => s.auth.user?.displayName);
  const isWizard = useStore((s) => s.auth.isWizard === true);
  const setSocialPaneOpen = useStore((s) => s.setSocialPaneOpen);
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

  // Enter the builder layout (the CMS, re-homed in-session). Command-bus
  // primacy: an explicit `layout builder` click, not a takeover tab — the
  // WebSocket session stays live. Visible only to developers (a non-
  // authoritative UX gate; the REST CMS routes remain the authority).
  const openCms = () => {
    setOpen(false);
    websocketClient.sendCommand("layout builder");
  };

  // Open the "Social / Notifications" settings pane — the thin front over
  // the `notify` verb (display lensing + notification policy). A modal
  // toggled via a store flag; App renders the pane when it's set.
  const openSocial = () => {
    setOpen(false);
    setSocialPaneOpen(true);
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
          {isGuest ? (
            <Item role="menuitem" onClick={signIn}>
              Sign in to save
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
