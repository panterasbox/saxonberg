/**
 * CmsGitPanel — the browser surface over the in-runtime VCS (`GitApi`),
 * beside the editor. The second of two thin surfaces over the one gated
 * core (the other is the `git` shell verb); a server-authoritative dumb
 * renderer.
 *
 * Self-contained: the CMS tab opens no WebSocket, so the panel fetches
 * `/api/git/*` on demand (and polls status on an interval). It shows the
 * branch/divergence summary + the dirty set (click a file to load its
 * diff), a commit-message field + Publish, the recent log, and a per-commit
 * Revert. The server applies the wizard-tier gate + the per-path
 * source-write scoping, so this stays a dumb renderer.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { gitClient } from "./gitClient";
import type {
  GitStatusResult,
  GitLogEntry,
} from "@saxonberg/types";

const POLL_MS = 10000;

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
  flex-wrap: wrap;
`;

const Branch = styled.span`
  font-family: monospace;
  color: ${tokens.color.sectionLabel};
`;

const Warn = styled.div`
  padding: 6px 12px;
  color: ${tokens.color.warning};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  font-size: 12px;
`;

const Meta = styled.span`
  color: ${tokens.color.fgMuted};
  font-size: 12px;
`;

const Columns = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
`;

const LeftCol = styled.div`
  flex: none;
  width: 320px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${tokens.color.borderMuted};
  overflow-y: auto;
`;

const RightCol = styled.div`
  flex: 1;
  min-width: 0;
  overflow: auto;
`;

const Section = styled.div`
  padding: 8px 12px;
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

const SectionLabel = styled.div`
  color: ${tokens.color.sectionLabel};
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
`;

const FileRow = styled.button<{ $active: boolean }>`
  display: flex;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: ${(p) => (p.$active ? tokens.color.actionBgHover : "transparent")};
  color: ${tokens.color.fg};
  border: none;
  border-bottom: 1px solid ${tokens.color.borderMuted};
  padding: 5px 12px;
  cursor: pointer;
  font-family: monospace;
  font-size: 12px;
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const Code = styled.span`
  color: ${tokens.color.fgMuted};
  width: 24px;
  flex: none;
`;

const Empty = styled.div`
  padding: 16px 12px;
  color: ${tokens.color.fgMuted};
`;

const Input = styled.input`
  flex: 1;
  min-width: 160px;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
`;

const Button = styled.button`
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: 4px;
  padding: 4px 12px;
  cursor: pointer;
  font-size: 12px;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const Patch = styled.pre`
  margin: 0;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 12px;
  color: ${tokens.color.fg};
`;

const LogRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 5px 12px;
  border-bottom: 1px solid ${tokens.color.borderMuted};
  font-size: 12px;
`;

const Sha = styled.span`
  font-family: monospace;
  color: ${tokens.color.sectionLabel};
`;

export const CmsGitPanel: React.FC = () => {
  const [status, setStatus] = React.useState<GitStatusResult | null>(null);
  const [log, setLog] = React.useState<GitLogEntry[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [patch, setPatch] = React.useState<string>("");
  const [message, setMessage] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const s = await gitClient.status();
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    try {
      setLog(await gitClient.log({ limit: 30 }));
    } catch {
      // log failure is non-fatal for the panel
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const openDiff = React.useCallback(async (path: string) => {
    setSelected(path);
    try {
      const d = await gitClient.diff(path);
      setPatch(d.patch || "(no textual diff)");
    } catch (e) {
      setPatch(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const publish = React.useCallback(async () => {
    if (!message.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const csrf = await gitClient.getCsrf();
      const r = await gitClient.publish(message.trim(), csrf);
      setNotice(r.detail);
      setMessage("");
      setSelected(null);
      setPatch("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [message, refresh]);

  const revert = React.useCallback(
    async (sha: string) => {
      setBusy(true);
      setNotice(null);
      try {
        const csrf = await gitClient.getCsrf();
        const r = await gitClient.revert(sha, csrf);
        setNotice(r.detail);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return (
    <Root>
      <Bar>
        <Branch>
          {status ? status.branch : "…"}
          {status?.tracking ? ` → ${status.tracking}` : ""}
        </Branch>
        <Input
          placeholder="Commit message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          type="button"
          disabled={busy || !message.trim()}
          onClick={() => void publish()}
        >
          Publish
        </Button>
        <Meta>
          {notice ?? (error ? `⚠ ${error}` : "")}
        </Meta>
      </Bar>
      {status?.warnings.map((w, i) => (
        <Warn key={i}>⚠ {w}</Warn>
      ))}
      <Columns>
        <LeftCol>
          <Section>
            <SectionLabel>
              Dirty files ({status?.files.length ?? 0})
            </SectionLabel>
          </Section>
          {status && status.files.length === 0 ? (
            <Empty>Working tree clean.</Empty>
          ) : (
            status?.files.map((f) => (
              <FileRow
                key={f.path}
                type="button"
                $active={selected === f.path}
                onClick={() => void openDiff(f.path)}
                title={f.path}
              >
                <Code>
                  {f.index}
                  {f.workingDir}
                </Code>
                <span>{f.path}</span>
              </FileRow>
            ))
          )}
          <Section>
            <SectionLabel>Recent commits</SectionLabel>
          </Section>
          {log.length === 0 ? (
            <Empty>No commits.</Empty>
          ) : (
            log.map((c) => (
              <LogRow key={c.sha}>
                <Sha>{c.sha.slice(0, 8)}</Sha>
                <span style={{ flex: 1, minWidth: 0 }}>{c.message}</span>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void revert(c.sha)}
                  title="Additively revert this commit (scoped to what you may write)"
                >
                  Revert
                </Button>
              </LogRow>
            ))
          )}
        </LeftCol>
        <RightCol>
          {selected ? (
            <Patch>{patch}</Patch>
          ) : (
            <Empty>Select a dirty file to see its diff.</Empty>
          )}
        </RightCol>
      </Columns>
    </Root>
  );
};
