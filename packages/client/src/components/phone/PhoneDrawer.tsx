/**
 * PhoneDrawer — a side drawer on the phone (client-surface W6): swipe
 * right for the channels and the tray, left for who's here.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "../ui";

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  background: ${tokens.color.scrim};
  z-index: 40;
`;

const Sheet = styled.aside<{ $side: "left" | "right" }>`
  position: fixed;
  top: 0;
  bottom: 0;
  ${(p) => p.$side}: 0;
  width: min(85vw, 20rem);
  z-index: 41;
  overflow-y: auto;
  background: ${tokens.color.surface};
  border-${(p) => (p.$side === "left" ? "right" : "left")}: 1px solid ${tokens.color.border};
  padding: ${tokens.space.md};
  padding-top: calc(${tokens.space.md} + env(safe-area-inset-top, 0px));
`;

const Close = styled.button`
  font: inherit;
  background: transparent;
  border: none;
  color: ${tokens.color.fgMuted};
  min-height: 44px;
`;

export function PhoneDrawer({
  side,
  label,
  onClose,
  children,
}: {
  side: "left" | "right";
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <>
      <Scrim data-testid="drawer-scrim" onClick={onClose} />
      <Sheet $side={side} data-testid={`drawer-${side}`} aria-label={label}>
        <Close type="button" aria-label="close" onClick={onClose}>
          {side === "left" ? "‹ close" : "close ›"}
        </Close>
        {children}
      </Sheet>
    </>
  );
}
