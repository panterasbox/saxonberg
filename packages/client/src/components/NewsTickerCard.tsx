/**
 * NewsTickerCard — the release news-ticker right-column cockpit card
 * (release build, client half). A pure render of the server-projected
 * release feed: the `publication.press` frames land in the store
 * (`feed` / `feedOrder`, see `store/index.ts` + the `publication.press`
 * handler in `services/websocket.ts`), seeded on connect from the welcome
 * payload's `releaseWindow`. This card reads them reactively.
 *
 * The client owns ZERO semantics here. Ordering, pin status, and the
 * realm/kind classifications are all server-decided — the card only
 * styles them (pins first, a pin indicator, realm/kind chips). The MML
 * `headline` / `body` render through the shared `MmlRenderer`, so any
 * clickable element inside a release previews its command on hover
 * (`onCommandPreview`) and issues it on click (`onSendCommand`) — the
 * same command bus every other clickable rides. Bodies expand inline on
 * click of the row's headline (local UI state only).
 *
 * A "Load older" control reaches past the live window into the REST
 * archive (`GET /api/press/archive`) and appends the result — the
 * help-card fetch transport precedent. No request RPC for the live feed:
 * a full snapshot arrives automatically on connect.
 */

import React from "react";
import styled from "styled-components";
import { SERVER_URL } from "../config";
import { useStore } from "../store/index";
import { tokens } from "./ui";
import { MmlRenderer } from "./MmlRenderer";
import type { ReleaseRow } from "@saxonberg/types";

export interface NewsTickerCardProps {
  /** Outbound command sink — the same path `CommandBar.onSend` uses. */
  onSendCommand: (text: string) => void;
  /** Hover-preview a command in the command bar (`null` clears). */
  onCommandPreview?: (command: string | null) => void;
}

const CardContainer = styled.aside`
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

const Card = styled.article<{ $pinned: boolean }>`
  border: 1px solid
    ${(p) => (p.$pinned ? tokens.color.fgEmphasis : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  margin: ${tokens.space.sm} 0;
  background: ${tokens.color.surfaceMuted};
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  margin-bottom: ${tokens.space.xs};
`;

const Pin = styled.span`
  flex: 0 0 auto;
  color: ${tokens.color.fgEmphasis};
  font-size: ${tokens.font.small};
`;

const Chip = styled.span<{ $tone: string }>`
  flex: 0 0 auto;
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: ${tokens.space.xs} ${tokens.space.sm};
  border-radius: ${tokens.radius.sm};
  border: 1px solid ${(p) => p.$tone};
  color: ${(p) => p.$tone};
  white-space: nowrap;
`;

const HeadlineButton = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font: inherit;
  color: ${tokens.color.fg};
  font-weight: 600;
`;

const BodyText = styled.div`
  margin-top: ${tokens.space.sm};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
  word-break: break-word;
`;

const LoadOlder = styled.button`
  display: block;
  width: 100%;
  margin-top: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  background: ${tokens.color.actionBg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  cursor: pointer;
  font: inherit;
  font-size: ${tokens.font.small};

  &:hover {
    background: ${tokens.color.actionBgHover};
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

const REALM_TONE: Record<string, string> = {
  ooc: tokens.color.sectionLabel,
  world: tokens.color.accent,
};

function NewsRow({
  row,
  expanded,
  onToggle,
  onSendCommand,
  onCommandPreview,
}: {
  row: ReleaseRow;
  expanded: boolean;
  onToggle: () => void;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  const preview = onCommandPreview ?? (() => undefined);
  return (
    <Card $pinned={row.pinned}>
      <Meta>
        {row.pinned && <Pin title="Pinned">📌</Pin>}
        <Chip $tone={REALM_TONE[row.realm] ?? tokens.color.fgMuted}>
          {row.realm}
        </Chip>
        <Chip $tone={tokens.color.fgMuted}>{row.kind}</Chip>
      </Meta>
      <HeadlineButton
        onClick={onToggle}
        aria-expanded={expanded}
        title="Click to expand"
      >
        <MmlRenderer
          text={row.headline}
          onCommandClick={onSendCommand}
          onCommandPreview={preview}
        />
      </HeadlineButton>
      {expanded && row.body && (
        <BodyText>
          <MmlRenderer
            text={row.body}
            onCommandClick={onSendCommand}
            onCommandPreview={preview}
          />
        </BodyText>
      )}
    </Card>
  );
}

export function NewsTickerCard({
  onSendCommand,
  onCommandPreview,
}: NewsTickerCardProps): React.ReactElement {
  const feed = useStore((s) => s.feed);
  const feedOrder = useStore((s) => s.feedOrder);
  const appendReleases = useStore((s) => s.appendReleases);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(false);

  const toggle = (id: string): void =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const loadOlder = async (): Promise<void> => {
    // The oldest live row's publish time is the archive cursor — fetch
    // strictly older releases. With an empty feed there is nothing to
    // page before, so the control is disabled.
    const oldest = feedOrder
      .map((id) => feed[id]?.publishedAt)
      .filter((v): v is number => typeof v === "number")
      .reduce((min, v) => (v < min ? v : min), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(oldest)) return;
    setLoading(true);
    try {
      // ⚠ Absolute, via SERVER_URL. A relative `/api/...` reaches Vite on
      // :5173 in development, which proxies nothing — so "Load older" was
      // broken in dev while working in production, where client and server
      // share an origin. Every other client fetch already goes through
      // SERVER_URL; this one didn't.
      const res = await fetch(
        `${SERVER_URL}/api/press/archive?before=${oldest}&limit=30`,
        { credentials: "include" },
      );
      if (!res.ok) return;
      const rows = (await res.json()) as ReleaseRow[];
      appendReleases(rows);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CardContainer aria-label="News Ticker">
      <Header>
        <HeaderTitle>News</HeaderTitle>
        <Count>{feedOrder.length}</Count>
      </Header>
      <Body>
        {feedOrder.length === 0 ? (
          <Empty>No releases yet.</Empty>
        ) : (
          <>
            {feedOrder.map((id) => {
              const row = feed[id];
              if (!row) return null;
              return (
                <NewsRow
                  key={id}
                  row={row}
                  expanded={expanded[id] ?? false}
                  onToggle={() => toggle(id)}
                  onSendCommand={onSendCommand}
                  onCommandPreview={onCommandPreview}
                />
              );
            })}
            <LoadOlder
              onClick={() => void loadOlder()}
              disabled={loading || feedOrder.length === 0}
            >
              {loading ? "Loading…" : "Load older"}
            </LoadOlder>
          </>
        )}
      </Body>
    </CardContainer>
  );
}
