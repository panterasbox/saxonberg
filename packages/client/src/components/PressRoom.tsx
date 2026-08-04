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
import styled, { css } from "styled-components";
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

const Item = styled.article`
  padding: ${tokens.space.md} 0;
  border-top: 1px solid ${tokens.color.borderMuted};

  &:first-of-type {
    border-top: none;
  }
`;

const Byline = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  margin-bottom: ${tokens.space.xs};
`;

/**
 * ⚠ Pinning is stated, not implied.
 *
 * A pinned release sorts above newer ones, so without a marker the date
 * order simply looks broken. The marker was a bare accent rail down the
 * item's left edge — which encoded the fact accurately and communicated
 * nothing, reading as inconsistent styling rather than as meaning. A word
 * costs the same pixels and says what it is.
 */
const Pinned = styled.span`
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${tokens.color.accent};
`;

/**
 * The subject line. A `<button>` only when there is a body to reveal —
 * a control that does nothing is worse than no control.
 */
const Headline = styled.button<{ $interactive: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
  cursor: ${(p) => (p.$interactive ? "pointer" : "default")};

  &:hover {
    color: ${(p) =>
      p.$interactive ? tokens.color.primary : tokens.color.fgEmphasis};
  }
`;

/**
 * The body, clamped to two lines until expanded. Kept in the DOM either
 * way so the text is a preview rather than an absence — the point of the
 * surface is that a visitor can tell what a release is *about* without
 * clicking anything.
 */
const Body = styled.div<{ $clamped: boolean }>`
  margin-top: ${tokens.space.xs};
  font-size: ${tokens.font.small};
  line-height: 1.45;
  color: ${tokens.color.fgMuted};
  word-break: break-word;

  ${(p) =>
    p.$clamped &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`;

/**
 * The affordance, shown only when a body exists to expand.
 *
 * ⚠ A real `<button>`, not a label. It said "MORE" while being a `<span>`,
 * so the one element on the card that *announces* itself as a control was
 * the one element that wasn't one — and the headline, which looks like a
 * heading, was. Whatever reads as the affordance has to be the affordance.
 */
const More = styled.button`
  display: inline-block;
  margin-top: ${tokens.space.xs};
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: ${tokens.font.micro};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${tokens.color.fgMuted};
  cursor: pointer;

  &:hover {
    color: ${tokens.color.primary};
  }
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
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string): void =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  /**
   * ⚠ Whether each body actually **overflows** its two-line clamp.
   *
   * Having a body is not the same as having something to expand: a
   * two-line body clamps to exactly itself, so a toggle driven by
   * `body.length > 0` promises a reveal and then moves the layout by a
   * pixel. The control is only honest if it is driven by measurement.
   *
   * Measured while clamped — an expanded body always "fits" by
   * definition, so the reading is taken before expansion and kept.
   */
  const bodyRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [overflowing, setOverflowing] = React.useState<Record<string, boolean>>(
    {},
  );

  const measure = React.useCallback((): void => {
    setOverflowing((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [id, el] of Object.entries(bodyRefs.current)) {
        if (!el || expanded[id]) continue;
        const over = el.scrollHeight - el.clientHeight > 1;
        if (next[id] !== over) {
          next[id] = over;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [expanded]);

  // Before paint, so a toggle never flickers in and out on first render.
  React.useLayoutEffect(() => {
    measure();
  }, [feed, measure]);

  // Web fonts change line metrics after first paint, and the panel
  // reflows with the window.
  React.useEffect(() => {
    let live = true;
    const onResize = (): void => measure();
    window.addEventListener("resize", onResize);
    void document.fonts?.ready.then(() => {
      if (live) measure();
    });
    return () => {
      live = false;
      window.removeEventListener("resize", onResize);
    };
  }, [measure]);

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
        feed.rows.map((row) => {
          const hasBody = row.body.length > 0;
          const open = expanded[row.releaseId] === true;
          // Offer the toggle only when there is genuinely more to see —
          // or when it is open, so it can be closed again.
          const collapsible = hasBody && (overflowing[row.releaseId] || open);
          return (
            <Item key={row.releaseId}>
              <Byline>
                <span>{row.publisherLabel}</span>
                <span>{formatDate(row.publishedAt)}</span>
                {row.pinned && <Pinned>Pinned</Pinned>}
                {row.source && <span>via {row.source}</span>}
              </Byline>
              <Headline
                as={collapsible ? "button" : "div"}
                $interactive={collapsible}
                {...(collapsible
                  ? {
                      onClick: () => toggle(row.releaseId),
                      "aria-expanded": open,
                      title: open ? "Collapse" : "Read more",
                    }
                  : {})}
              >
                <MmlRenderer
                  text={row.headline}
                  onCommandClick={noop}
                  onCommandPreview={noop}
                />
              </Headline>
              {hasBody && (
                <>
                  <Body
                    ref={(el) => {
                      bodyRefs.current[row.releaseId] = el;
                    }}
                    $clamped={!open}
                  >
                    <MmlRenderer
                      text={row.body}
                      onCommandClick={noop}
                      onCommandPreview={noop}
                    />
                  </Body>
                  {collapsible && (
                  <More
                    type="button"
                    onClick={() => toggle(row.releaseId)}
                    aria-expanded={open}
                    aria-label={
                      open
                        ? `Collapse: ${row.headline}`
                        : `Read more: ${row.headline}`
                    }
                  >
                    {open ? "Less \u2303" : "More \u2304"}
                  </More>
                  )}
                </>
              )}
            </Item>
          );
        })
      )}
    </Panel>
  );
};
