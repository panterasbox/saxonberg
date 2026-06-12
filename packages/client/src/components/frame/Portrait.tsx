/**
 * Portrait — the small avatar image in the frame. Renders the resolved
 * `portraitUrl` (account photo or per-character override), and falls
 * back to a generated initials chip when the URL is empty (the server's
 * "no image" sentinel) OR fails to load (broken URL). Client-side
 * fallback only — no broken-image icon ever shows.
 */

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { tokens } from "../ui";

const SIZE = 22;

const Img = styled.img`
  width: ${SIZE}px;
  height: ${SIZE}px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
  background: ${tokens.color.surfaceMuted};
`;

const Initials = styled.span`
  width: ${SIZE}px;
  height: ${SIZE}px;
  border-radius: 50%;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  user-select: none;
`;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1);
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).slice(0, 2);
}

export const Portrait: React.FC<{ url: string; name: string }> = ({
  url,
  name,
}) => {
  const [failed, setFailed] = useState(false);
  // Reset the failure flag if the URL changes (e.g. switch character).
  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return <Initials aria-hidden="true">{initialsOf(name)}</Initials>;
  }
  return (
    <Img src={url} alt="" aria-hidden="true" onError={() => setFailed(true)} />
  );
};
