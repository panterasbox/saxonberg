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
  attachArgumentClaim,
  matureArgument,
  openForumThread,
  openForumBoard,
  type ArgumentValence,
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

const ComposeRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 0.4rem;
`;

/** A comment's children, nested under a thread line (Reddit-style). */
const Nest = styled.div`
  margin-left: 0.75rem;
  padding-left: 0.6rem;
  border-left: 1px solid ${tokens.color.borderMuted};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ReplyLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  margin-top: 0.25rem;
  font: inherit;
  font-size: 0.8rem;
  color: ${tokens.color.accent};
  cursor: pointer;
  &:hover {
    color: ${tokens.color.accentHover};
  }
`;

const PostButton = styled.button`
  background: ${tokens.color.accent};
  color: ${tokens.color.onAccent};
  border: none;
  border-radius: ${tokens.radius.sm};
  padding: 0.3rem 0.9rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    background: ${tokens.color.borderEmphasis};
    color: ${tokens.color.fgMuted};
    cursor: default;
  }
  &:hover:not(:disabled) {
    background: ${tokens.color.accentHover};
  }
`;

/**
 * A hover-preview hook: show the command the control will send.
 *
 * Triggers on `mousemove`, NOT `mouseenter` — a live list that re-orders
 * (after a vote/post delta) slides a new control under a *stationary*
 * cursor, which fires `mouseenter` but not `mousemove`. Keying on movement
 * means only a genuine hover previews; a reorder under a still cursor
 * doesn't re-stick a command in the bar. `mouseleave` clears.
 */
type Preview = (command: string | null) => void;
function hoverPreview(cmd: string, onPreview: Preview) {
  return {
    onMouseMove: () => onPreview(cmd),
    onMouseLeave: () => onPreview(null),
  };
}

function scoreText(r: ForumEntryRecord): string {
  return r.displayScore === null ? "···" : String(r.displayScore);
}

/**
 * Recency window (seconds, ~12.5h) for the Reddit-ish "hot" rank: an
 * entry's age contributes `createdAt_seconds / WINDOW`, so a ~12.5h
 * gap is worth ~1 unit of log10(score).
 */
const HOT_RECENCY_WINDOW_SECONDS = 45_000;

/**
 * Stable empty fallback so `boardRecords`/`threadRecords` keep a steady
 * reference when a subscription has no data yet — otherwise a fresh `[]`
 * each render would defeat the downstream `useMemo`s.
 */
const EMPTY_RECORDS: ForumEntryRecord[] = [];

/** Reddit-ish hot score: log-scaled votes + a linear recency term. */
function hotRank(r: ForumEntryRecord): number {
  return (
    sign(r.score) * Math.log10(Math.max(Math.abs(r.score), 1)) +
    r.createdAt / 1000 / HOT_RECENCY_WINDOW_SECONDS
  );
}

function sortRecords(records: ForumEntryRecord[], mode: Sort): ForumEntryRecord[] {
  const list = [...records];
  switch (mode) {
    case "top":
      return list.sort((a, b) => b.score - a.score);
    case "hot":
      return list.sort((a, b) => hotRank(b) - hotRank(a));
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

function VoteControls({
  entry,
  onPreview,
  onSubmitted,
}: {
  entry: ForumEntryRecord;
  onPreview: Preview;
  onSubmitted: () => void;
}): JSX.Element {
  return (
    <Votes>
      <VoteBtn
        aria-label="upvote"
        onClick={() => {
          castForumVote(entry.id, "up");
          onSubmitted();
        }}
        {...hoverPreview(`forum vote ${entry.id} up`, onPreview)}
      >
        ▲
      </VoteBtn>
      <Score $hidden={entry.displayScore === null}>{scoreText(entry)}</Score>
      <VoteBtn
        aria-label="downvote"
        onClick={() => {
          castForumVote(entry.id, "down");
          onSubmitted();
        }}
        {...hoverPreview(`forum vote ${entry.id} down`, onPreview)}
      >
        ▼
      </VoteBtn>
    </Votes>
  );
}

function ComposeBox({
  onSubmit,
  label,
  previewVerb,
  onPreview,
  onSubmitted,
}: {
  onSubmit: (body: string, title?: string) => void;
  label: string;
  /** The command this box sends (the body rides the fields side-channel). */
  previewVerb: string;
  onPreview: Preview;
  onSubmitted: () => void;
}): JSX.Element {
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const showTitle = label === "thread";
  const submit = () => {
    if (!body.trim()) return;
    onSubmit(body.trim(), showTitle ? title.trim() || undefined : undefined);
    setBody("");
    setTitle("");
    onSubmitted(); // clear + suppress the post-action re-hover.
  };
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
          placeholder={
            showTitle
              ? "Write a new thread (Markdown)…"
              : "Write a reply (Markdown)…"
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          rows={3}
        />
        <ComposeRow>
          <PostButton
            onClick={submit}
            disabled={!body.trim()}
            {...hoverPreview(previewVerb, onPreview)}
          >
            {showTitle ? "Post thread" : "Reply"} ⌘⏎
          </PostButton>
        </ComposeRow>
      </Body>
    </Card>
  );
}

/** Group the subtree's posts by parent id, for nested rendering. */
function buildChildren(
  records: ForumEntryRecord[],
): Map<string, ForumEntryRecord[]> {
  const map = new Map<string, ForumEntryRecord[]>();
  for (const r of records) {
    if (r.parent == null) continue;
    const arr = map.get(r.parent) ?? [];
    arr.push(r);
    map.set(r.parent, arr);
  }
  return map;
}

interface CommentProps {
  entry: ForumEntryRecord;
  childrenMap: Map<string, ForumEntryRecord[]>;
  sort: Sort;
  preview: Preview;
  submitted: () => void;
  onSendCommand: (text: string) => void;
  onCommandPreview: (command: string | null) => void;
}

/** One comment + its nested reply subtree (recursive). */
function CommentNode({
  entry,
  childrenMap,
  sort,
  preview,
  submitted,
  onSendCommand,
  onCommandPreview,
}: CommentProps): JSX.Element {
  const [replying, setReplying] = useState(false);
  const kids = sortRecords(childrenMap.get(entry.id) ?? [], sort);
  return (
    <div>
      <Card>
        <VoteControls entry={entry} onPreview={preview} onSubmitted={submitted} />
        <Body>
          <MmlRenderer
            text={entry.body}
            onCommandClick={onSendCommand}
            onCommandPreview={onCommandPreview}
          />
          <Meta>by {entry.authorName || "someone"}</Meta>
          <ReplyLink
            onClick={() => setReplying((v) => !v)}
            {...hoverPreview(`forum reply ${entry.id}`, preview)}
          >
            {replying ? "Cancel" : "Reply"}
          </ReplyLink>
          {replying && (
            <ComposeBox
              label="reply"
              previewVerb={`forum reply ${entry.id}`}
              onPreview={preview}
              onSubmitted={() => {
                submitted();
                setReplying(false);
              }}
              onSubmit={(body) => replyForumEntry(entry.id, body)}
            />
          )}
        </Body>
      </Card>
      {kids.length > 0 && (
        <Nest>
          {kids.map((k) => (
            <CommentNode
              key={k.id}
              entry={k}
              childrenMap={childrenMap}
              sort={sort}
              preview={preview}
              submitted={submitted}
              onSendCommand={onSendCommand}
              onCommandPreview={onCommandPreview}
            />
          ))}
        </Nest>
      )}
    </div>
  );
}

/* ── Argument organizer (cycle 2) — the neutral default lens render ── */

const SpineCard = styled.div`
  border: 1px solid ${tokens.color.accent};
  background: ${tokens.color.surface};
  border-radius: ${tokens.radius.md};
  padding: 0.6rem 0.85rem;
`;

const SpineTitle = styled.div`
  font-weight: 700;
  color: ${tokens.color.fgEmphasis};
  margin-bottom: 0.3rem;
`;

const ClaimCard = styled.div<{ $circle?: boolean }>`
  border: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
  border-radius: ${tokens.radius.md};
  padding: 0.45rem 0.7rem;
  box-shadow: ${(p) =>
    p.$circle ? `inset 3px 0 0 ${tokens.color.accent}` : "none"};
`;

const ClaimHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  flex-wrap: wrap;
`;

const Marker = styled.span<{ $rel?: string }>`
  font-weight: 700;
  color: ${(p) =>
    p.$rel === "supports"
      ? tokens.color.accent
      : p.$rel === "objects-to"
        ? tokens.color.danger
        : tokens.color.fgMuted};
`;

const OpenBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${tokens.color.warning};
  border: 1px solid ${tokens.color.warning};
  border-radius: ${tokens.radius.sm};
  padding: 0 0.3rem;
`;

const EditedTag = styled.span`
  font-size: 0.7rem;
  color: ${tokens.color.fgMuted};
  font-style: italic;
`;

const CircleDot = styled.span`
  font-size: 0.7rem;
  color: ${tokens.color.accent};
`;

const GroupLabel = styled.div`
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${tokens.color.fgMuted};
  margin: 0.35rem 0 0.15rem;
`;

const ValenceBar = styled.div`
  display: flex;
  gap: 0.7rem;
  margin-top: 0.25rem;
`;

/** Per-relation glyph + the heading its children group under. */
const VALENCE_META: Record<string, { glyph: string; group: string }> = {
  supports: { glyph: "+", group: "Supporting" },
  "objects-to": { glyph: "−", group: "Objections" },
  "responds-to": { glyph: "?", group: "Questions" },
};

/** The three contribution affordances → reply valence flags. */
const VALENCE_CHOICES: { v: ArgumentValence; label: string }[] = [
  { v: "pro", label: "＋ Support" },
  { v: "con", label: "− Object" },
  { v: "rebut", label: "? Ask" },
];

/** A parent's already-lens-ordered children, split by valence for headings. */
function groupByValence(kids: ForumEntryRecord[]) {
  return [
    { key: "supports", label: "Supporting", list: kids.filter((k) => k.relation === "supports") },
    { key: "objects-to", label: "Objections", list: kids.filter((k) => k.relation === "objects-to") },
    { key: "responds-to", label: "Questions", list: kids.filter((k) => k.relation === "responds-to") },
  ];
}

interface ArgNodeProps {
  entry: ForumEntryRecord;
  childrenMap: Map<string, ForumEntryRecord[]>;
  preview: Preview;
  submitted: () => void;
  onSendCommand: (text: string) => void;
  onCommandPreview: (command: string | null) => void;
}

/**
 * One claim (or the spine) + its valence-grouped children (recursive).
 * No vote controls and no score — reputation-blind. Children arrive in the
 * server's lens order (Supporting → Objections → Questions); we only add
 * the group headings. The open-objection badge, the circle highlight, and
 * the "edited" marker ride the projected record fields.
 */
function ArgumentNode({
  entry,
  childrenMap,
  preview,
  submitted,
  onSendCommand,
  onCommandPreview,
}: ArgNodeProps): JSX.Element {
  const [valence, setValence] = useState<ArgumentValence | null>(null);
  const isSpine = entry.parent === null;
  const kids = childrenMap.get(entry.id) ?? [];
  const meta = entry.relation ? VALENCE_META[entry.relation] : undefined;

  const inner = (
    <>
      <ClaimHead>
        {meta && <Marker $rel={entry.relation}>{meta.glyph}</Marker>}
        {entry.openObjection && <OpenBadge>⚠ open</OpenBadge>}
        {entry.inCircle && (
          <CircleDot title="someone in your circle is here">●</CircleDot>
        )}
        {entry.editedAt != null && <EditedTag>edited</EditedTag>}
      </ClaimHead>
      <Body>
        <MmlRenderer
          text={entry.body}
          onCommandClick={onSendCommand}
          onCommandPreview={onCommandPreview}
        />
        <Meta>by {entry.authorName || "someone"}</Meta>
        <ValenceBar>
          {VALENCE_CHOICES.map((c) => (
            <ReplyLink
              key={c.v}
              onClick={() => setValence((cur) => (cur === c.v ? null : c.v))}
              {...hoverPreview(`forum reply ${entry.id} --${c.v}`, preview)}
            >
              {c.label}
            </ReplyLink>
          ))}
        </ValenceBar>
        {valence && (
          <ComposeBox
            label="claim"
            previewVerb={`forum reply ${entry.id} --${valence}`}
            onPreview={preview}
            onSubmitted={() => {
              submitted();
              setValence(null);
            }}
            onSubmit={(body) => attachArgumentClaim(entry.id, valence, body)}
          />
        )}
      </Body>
    </>
  );

  return (
    <div>
      {isSpine ? (
        <SpineCard>
          <SpineTitle>{entry.title || "Proposal"}</SpineTitle>
          {inner}
        </SpineCard>
      ) : (
        <ClaimCard $circle={entry.inCircle}>{inner}</ClaimCard>
      )}
      {kids.length > 0 && (
        <Nest>
          {groupByValence(kids).map((g) =>
            g.list.length === 0 ? null : (
              <div key={g.key}>
                <GroupLabel>{g.label}</GroupLabel>
                {g.list.map((k) => (
                  <ArgumentNode
                    key={k.id}
                    entry={k}
                    childrenMap={childrenMap}
                    preview={preview}
                    submitted={submitted}
                    onSendCommand={onSendCommand}
                    onCommandPreview={onCommandPreview}
                  />
                ))}
              </div>
            ),
          )}
        </Nest>
      )}
    </div>
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
    if (!forumNav.boardHandle) {
      setBoardSub(null);
      return;
    }
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

  const boardRecords = boardSub
    ? forumRecords[boardSub] ?? EMPTY_RECORDS
    : EMPTY_RECORDS;
  const threadRecords = threadSub
    ? forumRecords[threadSub] ?? EMPTY_RECORDS
    : EMPTY_RECORDS;

  const threads = useMemo(() => sortRecords(boardRecords, sort), [boardRecords, sort]);
  const root = threadRecords.find((r) => r.id === forumNav.threadId) ?? null;
  // The post-tree, grouped by parent for nested rendering; siblings are
  // sorted per level (the chosen ordering applies at every depth).
  const childrenMap = useMemo(
    () => buildChildren(threadRecords.filter((r) => r.parent !== null)),
    [threadRecords],
  );
  const topComments = useMemo(
    () => sortRecords(childrenMap.get(root?.id ?? "") ?? [], sort),
    [childrenMap, root, sort],
  );

  // Hover previews trigger on `mousemove` (see `hoverPreview`), so a
  // vote/post delta re-ordering the list under a still cursor can't
  // re-stick a command. `submitted` just clears on click; with no
  // subsequent movement the bar stays clear.
  const preview: Preview = onCommandPreview;
  const submitted = () => onCommandPreview(null);

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
              onClick={() => {
                openForumBoard(b.id);
                submitted();
              }}
              {...hoverPreview(`forum ${b.id}`, preview)}
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
                {b.organizer === "argument" && <Meta>⚖ argument forum</Meta>}
                {b.body && <Meta>{b.body}</Meta>}
              </Body>
            </Card>
          ))}
      </Wrap>
    );
  }

  // Organizer-gated fork: an argument board renders the neutral default
  // lens (a single claim-graph from the board scope), NOT the ranked
  // thread-list/post-tree. Additive — the popularity view below is
  // untouched. Detected from the projected records' `organizer`.
  const argumentMode = boardRecords.some((r) => r.organizer === "argument");
  if (argumentMode) {
    const spine = boardRecords.find((r) => r.parent === null) ?? null;
    const argChildren = buildChildren(boardRecords);
    return (
      <Wrap>
        <Bar>
          <Crumb onClick={() => { openForumBoard(""); submitted(); }}>
            Boards
          </Crumb>
          <span>/ {forumNav.boardHandle}</span>
          <span style={{ flex: 1 }} />
          <ReplyLink
            onClick={() => {
              matureArgument(forumNav.boardHandle!);
              submitted();
            }}
            {...hoverPreview(`forum mature ${forumNav.boardHandle}`, preview)}
          >
            Mature ✓
          </ReplyLink>
        </Bar>
        {!spine ? (
          <Meta>
            No proposal yet — the owner posts one with `forum post{" "}
            {forumNav.boardHandle} &lt;thesis&gt;`.
          </Meta>
        ) : (
          <ArgumentNode
            entry={spine}
            childrenMap={argChildren}
            preview={preview}
            submitted={submitted}
            onSendCommand={onSendCommand}
            onCommandPreview={onCommandPreview}
          />
        )}
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
            previewVerb={`forum post ${forumNav.boardHandle}`}
            onPreview={preview}
            onSubmitted={submitted}
            onSubmit={(body, title) =>
              postForumThread(forumNav.boardHandle!, body, title)
            }
          />
          {threads.length === 0 && <Meta>No threads yet.</Meta>}
          {threads.map((t) => (
            <Card key={t.id}>
              <VoteControls entry={t} onPreview={preview} onSubmitted={submitted} />
              <Body>
                <TitleLine
                  onClick={() => {
                    openForumThread(t.id);
                    submitted();
                  }}
                  {...hoverPreview(
                    `forum ${forumNav.boardHandle} ${t.id}`,
                    preview,
                  )}
                >
                  {t.title}
                </TitleLine>
                <Meta>by {t.authorName || "someone"}</Meta>
              </Body>
            </Card>
          ))}
        </>
      ) : (
        <>
          {root && (
            <Card>
              <VoteControls entry={root} onPreview={preview} onSubmitted={submitted} />
              <Body>
                <TitleLine as="div">{root.title}</TitleLine>
                <MmlRenderer text={root.body} onCommandClick={onSendCommand} onCommandPreview={onCommandPreview} />
              </Body>
            </Card>
          )}
          <ComposeBox
            label="reply"
            previewVerb={`forum reply ${forumNav.threadId}`}
            onPreview={preview}
            onSubmitted={submitted}
            onSubmit={(body) => replyForumEntry(forumNav.threadId!, body)}
          />
          {topComments.length === 0 && <Meta>No replies yet.</Meta>}
          {topComments.map((c) => (
            <CommentNode
              key={c.id}
              entry={c}
              childrenMap={childrenMap}
              sort={sort}
              preview={preview}
              submitted={submitted}
              onSendCommand={onSendCommand}
              onCommandPreview={onCommandPreview}
            />
          ))}
        </>
      )}
    </Wrap>
  );
}
