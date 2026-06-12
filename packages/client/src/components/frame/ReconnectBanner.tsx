/**
 * ReconnectBanner — shown only after auto-reconnect gives up
 * (`link === 'dropped'`) for an authed, non-guest player. The cockpit
 * stays mounted underneath (context preserved); the button resets the
 * backoff and reconnects. Because the server doesn't reap a real avatar
 * on linkdead, reconnecting resumes the same body seamlessly.
 *
 * A dropped guest never reaches this — the store routes them to the
 * start screen (their avatar was reaped, nothing to resume).
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import { tokens } from "../ui";

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${tokens.space.lg};
  padding: ${tokens.space.sm} ${tokens.space.md};
  background: ${tokens.color.surfaceAlt};
  border-bottom: 2px solid ${tokens.color.danger};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
`;

const Reconnect = styled.button`
  background: ${tokens.color.primary};
  border: none;
  border-radius: ${tokens.radius.md};
  color: #fff;
  font-family: inherit;
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.md};
  cursor: pointer;

  &:hover {
    background: ${tokens.color.primaryHover};
  }
`;

export const ReconnectBanner: React.FC = () => {
  const link = useStore((s) => s.connection.link);
  const isGuest = useStore((s) => s.auth.player?.isGuest === true);
  const isAuthed = useStore((s) => s.auth.isAuthenticated);

  if (link !== "dropped" || !isAuthed || isGuest) return null;

  return (
    <Bar role="alert">
      <span>Connection lost.</span>
      <Reconnect onClick={() => websocketClient.reconnectNow()}>
        Reconnect
      </Reconnect>
    </Bar>
  );
};
