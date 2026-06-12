/**
 * ConnectionIndicator — the one genuinely-unified status primitive: the
 * health of the command/message bus. Quiet by design — invisible while
 * `connected`, and speaks up only when an established connection drops
 * (`reconnecting`, then `dropped`). Driven by the three-state
 * `connection.link` in the store.
 *
 * Shared frame primitive: composed into the in-world top bar and
 * (silently, since there's no bus yet) the start screen.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const Dot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p: { $color: string }) => p.$color};
  flex: none;
`;

export const ConnectionIndicator: React.FC = () => {
  const link = useStore((s) => s.connection.link);

  // Silent when healthy — the indicator's whole point is to stay out of
  // the way until the bus is actually unhealthy.
  if (link === "connected") return null;

  const { color, label } =
    link === "reconnecting"
      ? { color: tokens.color.warning, label: "Reconnecting…" }
      : { color: tokens.color.danger, label: "Disconnected" };

  return (
    <Wrap role="status" aria-live="polite">
      <Dot $color={color} />
      {label}
    </Wrap>
  );
};
