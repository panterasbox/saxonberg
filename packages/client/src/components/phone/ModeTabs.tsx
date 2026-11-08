/**
 * ModeTabs — the phone's modes, along the bottom (client-surface W6).
 * Each is a real `cockpit mode <m>`; hidden while the keyboard is up.
 * Govern is not a tab yet.
 */

import React from "react";
import styled from "styled-components";
import type { CockpitMode } from "@saxonberg/types";
import { tokens } from "../ui";

const Tabs = styled.nav`
  flex: none;
  display: flex;
  border-top: 1px solid ${tokens.color.border};
  background: ${tokens.color.surface};
  padding-bottom: env(safe-area-inset-bottom, 0px);
`;

const Tab = styled.button<{ $on: boolean }>`
  flex: 1;
  font: inherit;
  font-size: ${tokens.font.small};
  min-height: 44px;
  background: transparent;
  border: none;
  border-top: 2px solid ${(p) => (p.$on ? tokens.color.accent : "transparent")};
  color: ${(p) => (p.$on ? tokens.color.accent : tokens.color.fgMuted)};
`;

const TABS: { mode: CockpitMode; label: string }[] = [
  { mode: "chat", label: "Chat" },
  { mode: "explore", label: "Explore" },
  { mode: "watch", label: "Watch" },
  { mode: "build", label: "Build" },
];

export function ModeTabs({
  mode,
  onCommandClick,
}: {
  mode: CockpitMode;
  onCommandClick: (command: string) => void;
}): React.ReactElement {
  return (
    <Tabs data-testid="mode-tabs" aria-label="modes">
      {TABS.map((t) => (
        <Tab
          key={t.mode}
          type="button"
          $on={t.mode === mode}
          data-testid={`mode-tab-${t.mode}`}
          aria-current={t.mode === mode ? "page" : undefined}
          onClick={() => onCommandClick(`cockpit mode ${t.mode}`)}
        >
          {t.label}
        </Tab>
      ))}
    </Tabs>
  );
}
