/**
 * PressRoom — what the world can read without signing in.
 *
 * The start screen's front door has had nothing on it: the live feed
 * needs an Avatar, the initial window rides the post-auth connection
 * payload, the archive route is `requireAuth`, and the ticker is a
 * post-login tab. Somebody who lands on the site is told a great deal
 * about how to sign in and nothing about what is going on.
 *
 * Self-contained by design, and deliberately un-clever:
 *
 *   - **`credentials: 'omit'`, explicitly.** Every other client fetch uses
 *     `'include'`, so a copied idiom would send cookies to a route defined
 *     as not reading them. Spelling the opposite out is the point.
 *   - **One attempt. No retry, no polling.** A press room that reconnects
 *     forever on a dead server is worse than one that quietly isn't there.
 *   - **Three terminal states**: rows, an honest empty line, or render
 *     `null`. A visitor never sees an error string or a hanging spinner —
 *     the sign-in controls are what they came for.
 *   - **Never awaited by the sign-in path.** The panel above paints
 *     regardless; this fills in beside it or doesn't.
 *
 * ⚠ MML renders through the shared `MmlRenderer` with **no-op**
 * `onCommandClick` / `onCommandPreview`. Both are required props, so a
 * no-op means the renderer computes a command string and hands it to a
 * function that discards it — nothing reaches the command bus on a
 * surface with no connection. Accepted residual: a clickable inside a
 * release *looks* clickable and does nothing.
 */

import React from "react";
import styled from "styled-components";
import { SERVER_URL } from "../config";
import { tokens } from "./ui";
import { MmlRenderer } from "./MmlRenderer";
import type { PublicReleaseRow } from "@saxonberg/types";

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  width: 380px;
  max-width: 100%;
  max-height: 70vh;
  overflow-y: auto;
  padding: ${tokens.space.lg};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
`;

const Title = styled.h2`
  margin: 0 0 ${tokens.space.sm} 0;
  font-size: ${tokens.font.body};
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${tokens.color.fgMuted};
`;

const Item = styled.article<{ $pinned: boolean }>`
  padding: ${tokens.space.sm} 0;
  border-top: 1px solid ${tokens.color.borderMuted};
  border-left: ${(p) =>
    p.$pinned ? `2px solid ${tokens.color.fgEmphasis}` : "none"};
  padding-left: ${(p) => (p.$pinned ? tokens.space.sm : "0")};
`;

const Byline = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  margin-bottom: ${tokens.space.xs};
`;

const Headline = styled.div`
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
`;

const Body = styled.div`
  margin-top: ${tokens.space.xs};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  word-break: break-word;
`;

const Empty = styled.p`
  margin: 0;
  font-size: ${tokens.font.small};
  font-style: italic;
  color: ${tokens.color.fgMuted};
`;

/** The three states this surface can end in. Nothing else is rendered. */
type Feed =
  | { state: "loading" }
  | { state: "rows"; rows: PublicReleaseRow[] }
  | { state: "empty" }
  /** Unreachable, malformed, or refused — the panel simply isn't there. */
  | { state: "gone" };

const noop = (): void => undefined;

function formatDate(epochMs: number): string {
  if (!Number.isFinite(epochMs) || epochMs <= 0) return "";
  try {
    return new Date(epochMs).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export const PressRoom: React.FC = () => {
  const [feed, setFeed] = React.useState<Feed>({ state: "loading" });

  React.useEffect(() => {
    const abort = new AbortController();
    // One attempt. A failure of any kind — network, non-200, malformed
    // body — lands in `gone`, and the component renders nothing.
    void (async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/press/releases`, {
          // ⚠ NOT 'include'. This route reads no session and must be sent
          // no cookies; the rest of this client says 'include'.
          credentials: "omit",
          signal: abort.signal,
        });
        if (!res.ok) {
          setFeed({ state: "gone" });
          return;
        }
        const rows = (await res.json()) as PublicReleaseRow[];
        if (abort.signal.aborted) return;
        if (!Array.isArray(rows)) {
          setFeed({ state: "gone" });
          return;
        }
        setFeed(rows.length > 0 ? { state: "rows", rows } : { state: "empty" });
      } catch {
        if (!abort.signal.aborted) setFeed({ state: "gone" });
      }
    })();
    return () => abort.abort();
  }, []);

  if (feed.state === "loading" || feed.state === "gone") return null;

  return (
    <Panel aria-label="Press room">
      <Title>Latest</Title>
      {feed.state === "empty" ? (
        <Empty>Nothing has been published yet.</Empty>
      ) : (
        feed.rows.map((row) => (
          <Item key={row.releaseId} $pinned={row.pinned}>
            <Byline>
              <span>{row.publisherLabel}</span>
              <span>{formatDate(row.publishedAt)}</span>
              {row.source && <span>via {row.source}</span>}
            </Byline>
            <Headline>
              <MmlRenderer
                text={row.headline}
                onCommandClick={noop}
                onCommandPreview={noop}
              />
            </Headline>
            {row.body && (
              <Body>
                <MmlRenderer
                  text={row.body}
                  onCommandClick={noop}
                  onCommandPreview={noop}
                />
              </Body>
            )}
          </Item>
        ))
      )}
    </Panel>
  );
};
