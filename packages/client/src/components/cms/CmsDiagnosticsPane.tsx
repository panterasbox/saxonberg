/**
 * CmsDiagnosticsPane — Reader B of the author-diagnostics subsystem: the
 * browser panel over the diagnostics store, beside the editor.
 *
 * Self-contained: the CMS tab opens no WebSocket, so the pane polls
 * `GET /api/cms/diagnostics` on an interval (server-authoritative order).
 * Defaults to the "mine" lens (content you authored — the provenance
 * index); toggle to all channels. Server applies the author-tier gate and
 * the non-wizard compile redaction, so this stays a dumb renderer.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { cmsClient } from "./cmsClient";
import type { DiagnosticDoc, DiagnosticSeverity } from "@saxonberg/types";

const POLL_MS = 8000;

const Root = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-size: 13px;
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
`;

const Toggle = styled.button<{ $active: boolean }>`
  background: ${(p) => (p.$active ? tokens.color.actionBgHover : "transparent")};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: 4px;
  padding: 3px 10px;
  cursor: pointer;
  font-size: 12px;
`;

const Meta = styled.span`
  color: ${tokens.color.fgMuted};
  font-size: 12px;
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
`;

const Empty = styled.div`
  padding: 24px 16px;
  color: ${tokens.color.fgMuted};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 64px 130px 1fr;
  gap: 10px;
  padding: 6px 12px;
  border-bottom: 1px solid ${tokens.color.borderMuted};
  align-items: baseline;
`;

const Sev = styled.span<{ $sev: DiagnosticSeverity }>`
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  color: ${(p) =>
    p.$sev === "error"
      ? tokens.color.danger
      : p.$sev === "warning"
        ? tokens.color.warning
        : tokens.color.fgMuted};
`;

const Channel = styled.span`
  color: ${tokens.color.sectionLabel};
  font-family: monospace;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Body = styled.div`
  min-width: 0;
`;

const Where = styled.div`
  color: ${tokens.color.fgMuted};
  font-family: monospace;
  font-size: 11px;
`;

const Message = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
`;

export const CmsDiagnosticsPane: React.FC = () => {
  const [rows, setRows] = React.useState<DiagnosticDoc[]>([]);
  const [mine, setMine] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const out = await cmsClient.diagnostics({ mine, limit: 100 });
        if (!live) return;
        setRows(out);
        setError(null);
      } catch (e) {
        if (!live) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (live) setLoadedOnce(true);
      }
    };
    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, [mine]);

  return (
    <Root>
      <Bar>
        <Toggle
          type="button"
          $active={mine}
          onClick={() => setMine(true)}
          title="Only diagnostics in content you authored"
        >
          Mine
        </Toggle>
        <Toggle
          type="button"
          $active={!mine}
          onClick={() => setMine(false)}
          title="All channels you can see"
        >
          All
        </Toggle>
        <Meta>
          {rows.length} diagnostic{rows.length === 1 ? "" : "s"}
          {error ? ` · ${error}` : ""}
        </Meta>
      </Bar>
      <List>
        {rows.length === 0 ? (
          <Empty>
            {loadedOnce
              ? mine
                ? "No diagnostics in your content. 🎉"
                : "No diagnostics."
              : "Loading…"}
          </Empty>
        ) : (
          rows.map((r, i) => (
            <Row key={r._id ?? i}>
              <Sev $sev={r.severity}>{r.severity}</Sev>
              <Channel title={r.channel}>{r.channel}</Channel>
              <Body>
                {r.path ? (
                  <Where>
                    {r.path}
                    {r.line != null ? `:${r.line}` : ""}
                  </Where>
                ) : null}
                <Message>{r.message}</Message>
              </Body>
            </Row>
          ))
        )}
      </List>
    </Root>
  );
};
