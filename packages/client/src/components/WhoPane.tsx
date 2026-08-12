/**
 * WhoPane — the "Who's Online" right-column cockpit pane (social-inspection
 * Phase 4, client half). A pure render of the server-projected roster: the
 * `self.group` frames land in the store (`roster` / `rosterOrder`,
 * see `store/index.ts` + the `self.group` handler in
 * `services/websocket.ts`), and this pane reads them reactively.
 *
 * The client owns ZERO command/identity semantics here. Each row's
 * `header` is already viewer-lensed server-side (recognized → a name;
 * stranger → a salient-feature description); the pane only styles
 * recognized vs stranger and badges a notable `status`. Per the global
 * "clickables preview their command" contract, hovering a row previews
 * `profile <header>` in the command bar (`onCommandPreview`) and clicking
 * issues it (`onSendCommand`) — the same command bus every other clickable
 * rides. No request RPC: a full snapshot arrives automatically on
 * connect/reconnect.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../store/index";
import { List, ListItem, tokens } from "./ui";
import type { PresenceStatus, RosterRow } from "@saxonberg/types";

export interface WhoPaneProps {
  /** Outbound command sink — the same path `CommandBar.onSend` uses. */
  onSendCommand: (text: string) => void;
  /** Hover-preview a command in the command bar (`null` clears). */
  onCommandPreview?: (command: string | null) => void;
}

const PaneContainer = styled.aside`
  display: flex;
  flex-direction: column;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
  height: 100%;
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  border-left: 1px solid ${tokens.color.border};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  overflow: hidden;
`;

const Header = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: ${tokens.space.md} ${tokens.space.lg};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceAlt};
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-weight: 700;
  color: ${tokens.color.fgEmphasis};
  font-size: ${tokens.font.title};
`;

const Count = styled.span`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${tokens.space.md} ${tokens.space.lg};
`;

const Empty = styled.p`
  color: ${tokens.color.fgMuted};
  font-style: italic;
  font-size: ${tokens.font.small};
  margin: ${tokens.space.md} 0;
`;

/**
 * The clickable row. A `<button>` so it's a real affordance for assistive
 * tech and keyboard. Recognized rows render emphasized; strangers muted.
 */
const RowButton = styled.button<{ $recognized: boolean }>`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.md};
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.sm} ${tokens.space.md};
  cursor: pointer;
  font: inherit;
  color: ${(p) => (p.$recognized ? tokens.color.fg : tokens.color.fgMuted)};

  &:hover {
    background: ${tokens.color.actionBg};
  }
`;

const RowHeader = styled.span<{ $recognized: boolean }>`
  flex: 1;
  font-weight: ${(p) => (p.$recognized ? 600 : 400)};
  color: ${(p) => (p.$recognized ? tokens.color.accent : tokens.color.fgMuted)};
  word-break: break-word;
`;

const Country = styled.span`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
  white-space: nowrap;
`;

const STATUS_TINT: Record<PresenceStatus, string> = {
  active: tokens.color.fgMuted,
  idle: tokens.color.fgMuted,
  engaged: tokens.color.accent,
  reconnecting: tokens.color.warning,
};

const Badge = styled.span<{ $status: PresenceStatus }>`
  flex: 0 0 auto;
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: ${tokens.space.xs} ${tokens.space.sm};
  border-radius: ${tokens.radius.sm};
  border: 1px solid ${(p) => STATUS_TINT[p.$status]};
  color: ${(p) => STATUS_TINT[p.$status]};
  white-space: nowrap;
`;

function WhoRow({
  row,
  onSendCommand,
  onCommandPreview,
}: {
  row: RosterRow;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  const command = `profile ${row.header}`;
  const preview = onCommandPreview;
  return (
    <ListItem>
      <RowButton
        $recognized={row.recognized}
        title={`Click to send: ${command}`}
        data-handle={row.handle}
        onClick={() => onSendCommand(command)}
        onMouseEnter={preview ? () => preview(command) : undefined}
        onMouseLeave={preview ? () => preview(null) : undefined}
      >
        <RowHeader $recognized={row.recognized}>{row.header}</RowHeader>
        {row.status && <Badge $status={row.status}>{row.status}</Badge>}
        {row.country && <Country>— {row.country}</Country>}
      </RowButton>
    </ListItem>
  );
}

export function WhoPane({
  onSendCommand,
  onCommandPreview,
}: WhoPaneProps): React.ReactElement {
  const roster = useStore((s) => s.roster);
  const rosterOrder = useStore((s) => s.rosterOrder);

  return (
    <PaneContainer aria-label="Who's Online">
      <Header>
        <HeaderTitle>Who&apos;s Online</HeaderTitle>
        <Count>{rosterOrder.length}</Count>
      </Header>
      <Body>
        {rosterOrder.length === 0 ? (
          <Empty>No one else is around right now.</Empty>
        ) : (
          <List aria-label="online characters">
            {rosterOrder.map((handle) => {
              const row = roster[handle];
              if (!row) return null;
              return (
                <WhoRow
                  key={handle}
                  row={row}
                  onSendCommand={onSendCommand}
                  onCommandPreview={onCommandPreview}
                />
              );
            })}
          </List>
        )}
      </Body>
    </PaneContainer>
  );
}
