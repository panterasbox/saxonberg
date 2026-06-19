/**
 * ForumView — the forum as a primary view inside the cockpit (NOT a
 * phase). Renders a board's thread-list or a thread's post-tree live,
 * driven by the forum document-change subscription. Votes ride the
 * command bus as plain strings; post/reply send a command string with the
 * body on the `fields` side-channel.
 *
 * Navigation is store-driven (`forumNav`): a board handle opens the
 * thread-list; selecting a thread opens its post-tree (parent reachable
 * via the breadcrumb). Sorting is client-side over the live record set
 * (the server always ships true scores; the display gate rides
 * `displayScore`).
 */

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import type { ForumEntryRecord } from "@saxonberg/types";
import { useStore } from "../store";
import {
  subscribeForumScope,
  unsubscribeForumScope,
  castForumVote,
  postForumThread,
  replyForumEntry,
  openForumThread,
  openForumBoard,
} from "../store/forumActions";
import { MmlRenderer } from "./MmlRenderer";
import { tokens } from "./ui";

type Sort = "new" | "top" | "hot" | "controversial";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  gap: 0.5rem;
  background: ${tokens.color.surfaceMuted};
  color: ${tokens.color.fg};
  font-size: ${tokens.font.body};
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  color: ${tokens.color.fgMuted};
`;

const Crumb = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.accent};
  cursor: pointer;
  padding: 0;
  font: inherit;
  font-weight: 600;
  &:hover {
    color: ${tokens.color.accentHover};
  }
`;

const Select = styled.select`
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  padding: 0.1rem 0.3rem;
  font: inherit;
`;

const Field = styled.input`
  width: 100%;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  padding: 0.4rem 0.5rem;
  font: inherit;
  &::placeholder {
    color: ${tokens.color.fgMuted};
  }
  &:focus {
    outline: none;
    border-color: ${tokens.color.accent};
  }
`;

const BodyArea = styled.textarea`
  width: 100%;
  resize: vertical;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  padding: 0.4rem 0.5rem;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  &::placeholder {
    color: ${tokens.color.fgMuted};
  }
  &:focus {
    outline: none;
    border-color: ${tokens.color.accent};
  }
`;

const Card = styled.div`
  border: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
  border-radius: ${tokens.radius.md};
  padding: 0.5rem 0.75rem;
  display: flex;
  gap: 0.6rem;
`;

const Votes = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 2.2rem;
  user-select: none;
`;

const VoteBtn = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1.4;
  color: ${(p) => (p.$active ? tokens.color.accent : tokens.color.fgMuted)};
  &:hover {
    color: ${tokens.color.accentHover};
  }
`;

const Score = styled.span<{ $hidden: boolean }>`
  font-weight: 600;
  color: ${(p) => (p.$hidden ? tokens.color.fgMuted : tokens.color.fgEmphasis)};
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  color: ${tokens.color.fg};
`;

const TitleLine = styled.div`
  font-weight: 600;
  color: ${tokens.color.fg};
  cursor: pointer;
  &:hover {
    color: ${tokens.color.accentHover};
  }
`;

const Meta = styled.div`
  color: ${tokens.color.fgMuted};
  font-size: 0.8rem;
`;

function scoreText(r: ForumEntryRecord): string {
  return r.displayScore === null ? "···" : String(r.displayScore);
}

function sortRecords(records: ForumEntryRecord[], mode: Sort): ForumEntryRecord[] {
  const list = [...records];
  switch (mode) {
    case "top":
      return list.sort((a, b) => b.score - a.score);
    case "hot":
      return list.sort(
        (a, b) =>
          sign(b.score) * Math.log10(Math.max(Math.abs(b.score), 1)) +
          b.createdAt / 1000 / 45000 -
          (sign(a.score) * Math.log10(Math.max(Math.abs(a.score), 1)) +
            a.createdAt / 1000 / 45000),
      );
    case "controversial":
      return list.sort((a, b) => controversy(b) - controversy(a));
    case "new":
    default:
      return list.sort((a, b) => b.createdAt - a.createdAt);
  }
}
const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
const controversy = (r: ForumEntryRecord) =>
  r.up > 0 && r.down > 0
    ? (r.up + r.down) * (Math.min(r.up, r.down) / Math.max(r.up, r.down))
    : 0;

function VoteControls({ entry }: { entry: ForumEntryRecord }): JSX.Element {
  return (
    <Votes>
      <VoteBtn aria-label="upvote" onClick={() => castForumVote(entry.id, "up")}>
        ▲
      </VoteBtn>
      <Score $hidden={entry.displayScore === null}>{scoreText(entry)}</Score>
      <VoteBtn aria-label="downvote" onClick={() => castForumVote(entry.id, "down")}>
        ▼
      </VoteBtn>
    </Votes>
  );
}

function ComposeBox({
  onSubmit,
  label,
}: {
  onSubmit: (body: string, title?: string) => void;
  label: string;
}): JSX.Element {
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const showTitle = label === "thread";
  return (
    <Card>
      <Body>
        {showTitle && (
          <Field
            aria-label="thread title"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginBottom: "0.4rem" }}
          />
        )}
        <BodyArea
          aria-label={`${label} body`}
          placeholder="Markdown body — ⌘/Ctrl+Enter to submit"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && body.trim()) {
              onSubmit(body.trim(), showTitle ? title.trim() || undefined : undefined);
              setBody("");
              setTitle("");
            }
          }}
          rows={3}
        />
      </Body>
    </Card>
  );
}

interface ForumViewProps {
  onSendCommand: (text: string) => void;
  onCommandPreview: (command: string | null) => void;
}

export function ForumView({
  onSendCommand,
  onCommandPreview,
}: ForumViewProps): JSX.Element {
  const forumNav = useStore((s) => s.forumNav);
  const forumRecords = useStore((s) => s.forumRecords);
  const [sort, setSort] = useState<Sort>("hot");
  const [boardSub, setBoardSub] = useState<string | null>(null);
  const [threadSub, setThreadSub] = useState<string | null>(null);
  const [indexSub, setIndexSub] = useState<string | null>(null);

  // Board-index subscription — live list of the boards you can see, open
  // whenever no specific board is selected (the forum landing).
  useEffect(() => {
    if (forumNav.boardHandle) {
      setIndexSub(null);
      return;
    }
    const id = subscribeForumScope({ kind: "index", id: "" });
    setIndexSub(id);
    return () => unsubscribeForumScope(id);
  }, [forumNav.boardHandle]);

  // Board subscription — re-opened when the board handle changes.
  useEffect(() => {
    if (!forumNav.boardHandle) return;
    const id = subscribeForumScope({ kind: "board", id: forumNav.boardHandle });
    setBoardSub(id);
    return () => unsubscribeForumScope(id);
  }, [forumNav.boardHandle]);

  // Thread subscription — opened only when a thread is selected.
  useEffect(() => {
    if (!forumNav.threadId) {
      setThreadSub(null);
      return;
    }
    const id = subscribeForumScope({ kind: "thread", id: forumNav.threadId });
    setThreadSub(id);
    return () => unsubscribeForumScope(id);
  }, [forumNav.threadId]);

  const boardRecords = boardSub ? forumRecords[boardSub] ?? [] : [];
  const threadRecords = threadSub ? forumRecords[threadSub] ?? [] : [];

  const threads = useMemo(() => sortRecords(boardRecords, sort), [boardRecords, sort]);
  const root = threadRecords.find((r) => r.id === forumNav.threadId) ?? null;
  const posts = useMemo(
    () => sortRecords(threadRecords.filter((r) => r.parent !== null), sort),
    [threadRecords, sort],
  );

  if (!forumNav.boardHandle) {
    const boards = indexSub ? forumRecords[indexSub] ?? [] : [];
    return (
      <Wrap>
        <Bar>
          <strong style={{ color: "inherit" }}>Boards</strong>
          <span style={{ flex: 1 }} />
          <Meta>`forum make &lt;name&gt;` to start one</Meta>
        </Bar>
        {boards.length === 0 && (
          <Meta>
            No boards yet. Create one with `forum make &lt;name&gt;` (add
            `--open` so anyone can join).
          </Meta>
        )}
        {[...boards]
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((b) => (
            <Card
              key={b.id}
              as="button"
              onClick={() => openForumBoard(b.id)}
              style={{
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                font: "inherit",
                color: "inherit",
              }}
            >
              <Body>
                <TitleLine>{b.title}</TitleLine>
                {b.body && <Meta>{b.body}</Meta>}
              </Body>
            </Card>
          ))}
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Bar>
        <Crumb onClick={() => openForumThread("")} aria-label="board breadcrumb">
          {forumNav.boardHandle}
        </Crumb>
        {root && <span>/ {root.title}</span>}
        <span style={{ flex: 1 }} />
        <label>
          sort{" "}
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="new">new</option>
            <option value="top">top</option>
            <option value="hot">hot</option>
            <option value="controversial">controversial</option>
          </Select>
        </label>
      </Bar>

      {!forumNav.threadId ? (
        <>
          <ComposeBox
            label="thread"
            onSubmit={(body, title) =>
              postForumThread(forumNav.boardHandle!, body, title)
            }
          />
          {threads.length === 0 && <Meta>No threads yet.</Meta>}
          {threads.map((t) => (
            <Card key={t.id}>
              <VoteControls entry={t} />
              <Body>
                <TitleLine onClick={() => openForumThread(t.id)}>{t.title}</TitleLine>
                <Meta>by {t.author}</Meta>
              </Body>
            </Card>
          ))}
        </>
      ) : (
        <>
          {root && (
            <Card>
              <VoteControls entry={root} />
              <Body>
                <TitleLine>{root.title}</TitleLine>
                <MmlRenderer text={root.body} onCommandClick={onSendCommand} onCommandPreview={onCommandPreview} />
              </Body>
            </Card>
          )}
          <ComposeBox
            label="reply"
            onSubmit={(body) => replyForumEntry(forumNav.threadId!, body)}
          />
          {posts.map((p) => (
            <Card key={p.id} style={{ marginLeft: "1rem" }}>
              <VoteControls entry={p} />
              <Body>
                <MmlRenderer text={p.body} onCommandClick={onSendCommand} onCommandPreview={onCommandPreview} />
                <Meta>by {p.author}</Meta>
              </Body>
            </Card>
          ))}
        </>
      )}
    </Wrap>
  );
}
