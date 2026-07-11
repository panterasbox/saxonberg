/**
 * WarningBanner — the non-wizard publish warning shown BEFORE save on the
 * scaffold/commit flow.
 *
 * Reads the client `auth.isWizard` hint (mirrored from `/auth/status`, drives
 * only UI). For a non-wizard it warns that composing/editing is allowed but
 * publishing (committing a new backing class to source) is wizard-only — so
 * the eventual `denied` disposition is expected, not a surprise. This is
 * **non-authoritative UX**: the server `commitClass` gate remains the sole
 * authority (the client owns zero authorization semantics). A wizard sees a
 * quiet confirmation instead.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../../store/index";
import { tokens } from "../../ui";

const Warn = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm} ${tokens.space.md};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.warning};
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const Ok = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} ${tokens.space.md};
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
`;

const Badge = styled.span`
  font-size: ${tokens.font.body};
`;

export const WarningBanner: React.FC = () => {
  const isWizard = useStore((s) => s.auth.isWizard === true);
  if (!isWizard) {
    return (
      <Warn role="status">
        <Badge>⚠</Badge>
        <span>
          You can compose and edit this class, but only a wizard can publish
          it. Saving will be declined until a wizard commits it.
        </span>
      </Warn>
    );
  }
  return (
    <Ok role="status">
      <Badge>✓</Badge>
      <span>You can publish a class you compose.</span>
    </Ok>
  );
};
