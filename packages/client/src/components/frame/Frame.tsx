/**
 * Frame — the thin in-world top bar. Composition of shared primitives,
 * NOT a wrapper modes subclass: just `ConnectionIndicator` (quiet bus
 * health) on the left and `AccountMenu` (identity + actions) on the
 * right. This replaces the debug `ConnectionStatus` block.
 *
 * Reserved seams (rendered as nothing until their own cycles): a
 * mode-status region (game vitals — substrate-only, no widget yet), a
 * mode indicator (no ≥2 modes), and search. They are intentionally
 * absent here, not faked.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { AccountMenu } from "./AccountMenu";

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${tokens.space.xs} ${tokens.space.md};
  background: ${tokens.color.surface};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  flex: none;
`;

export const Frame: React.FC = () => (
  <Bar>
    <ConnectionIndicator />
    <AccountMenu />
  </Bar>
);
