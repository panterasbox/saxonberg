/**
 * NotificationQueue — the ephemeral banner/toast surface for banner-class
 * social notifications (a contact's connect / disconnect). Sibling of
 * `ReconnectBanner`; reads the `notifications` store slice, renders each
 * with its rule `color` (a named theme-palette token mapped through
 * `tokens.palette`, never raw hex), a dismiss control, and a TTL
 * auto-clear. `log-only` presence frames never reach here — they fall
 * through to the normal quiet inline frame append (see
 * `services/websocket.ts`).
 *
 * The queue is session-ephemeral: it clears on disconnect alongside the
 * prompt stack.
 */

import React from "react";
import styled from "styled-components";
import { useStore, type SocialNotification } from "../../store/index";
import { tokens } from "../ui";

/** How long a banner lingers before auto-dismissing (ms). */
const NOTIFICATION_TTL_MS = 8000;

const Stack = styled.div`
  position: fixed;
  top: ${tokens.space.md};
  right: ${tokens.space.md};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  z-index: 50;
  pointer-events: none;
`;

const Toast = styled.div<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  min-width: 14rem;
  max-width: 22rem;
  padding: ${tokens.space.sm} ${tokens.space.md};
  background: ${tokens.color.surfaceAlt};
  border-left: 3px solid ${(p) => p.$accent};
  border-radius: ${tokens.radius.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
  pointer-events: auto;
`;

const Label = styled.span`
  flex: 1;
`;

const Who = styled.span<{ $accent: string }>`
  color: ${(p) => p.$accent};
  font-weight: 600;
`;

const Dismiss = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.fgMuted};
  font-family: inherit;
  font-size: ${tokens.font.body};
  line-height: 1;
  cursor: pointer;
  padding: 0 ${tokens.space.xs};

  &:hover {
    color: ${tokens.color.fg};
  }
`;

/** Map a server palette token to a concrete color (theme-mapped). */
function accentFor(token: string): string {
  return tokens.palette[token] ?? tokens.palette.neutral!;
}

const NotificationToast: React.FC<{
  notification: SocialNotification;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  const accent = accentFor(notification.color);
  const verb =
    notification.event === "connect" ? "is now online" : "went offline";
  const who = notification.actor.displayName ?? "Someone";
  const place = notification.country ? ` from ${notification.country}` : "";

  React.useEffect(() => {
    const handle = window.setTimeout(
      () => onDismiss(notification.id),
      NOTIFICATION_TTL_MS,
    );
    return () => window.clearTimeout(handle);
  }, [notification.id, onDismiss]);

  return (
    <Toast $accent={accent} role="status">
      <Label>
        <Who $accent={accent}>{who}</Who> {verb}
        {place}.
      </Label>
      <Dismiss
        aria-label="Dismiss notification"
        onClick={() => onDismiss(notification.id)}
      >
        ×
      </Dismiss>
    </Toast>
  );
};

export const NotificationQueue: React.FC = () => {
  const notifications = useStore((s) => s.notifications);
  const dismissNotification = useStore((s) => s.dismissNotification);

  if (notifications.length === 0) return null;

  return (
    <Stack>
      {notifications.map((n) => (
        <NotificationToast
          key={n.id}
          notification={n}
          onDismiss={dismissNotification}
        />
      ))}
    </Stack>
  );
};
