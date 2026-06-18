/**
 * ForumChatSidecar — the contextual chat rail that replaces the
 * InspectionPane in the forum view. It stacks the subjects on the current
 * path: the board's chat at the board, the thread's chat when a promoted
 * thread is open (the parent board chat stays reachable above it). Each
 * stack entry posts to that subject's chat via a real `chat <handle>`
 * command string (the same surface the CLI uses); incoming chat frames
 * surface in the cockpit's Terminal feed as usual.
 *
 * v1 is intentionally light: a per-subject input that sends to the chat
 * surface. The promoted-thread handle is board-scoped (`board/thread`).
 */

import { useState } from "react";
import styled from "styled-components";
import { useStore } from "../store";

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem;
  gap: 0.75rem;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const Entry = styled.div<{ $depth: number }>`
  margin-left: ${(p) => p.$depth * 0.75}rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.5rem;
`;

const Handle = styled.div`
  font-weight: 600;
  opacity: 0.85;
  margin-bottom: 0.3rem;
`;

interface SidecarProps {
  onSendCommand: (text: string) => void;
}

function ChatEntry({
  handle,
  depth,
  onSendCommand,
}: {
  handle: string;
  depth: number;
  onSendCommand: (text: string) => void;
}): JSX.Element {
  const [msg, setMsg] = useState("");
  return (
    <Entry $depth={depth}>
      <Handle>#{handle}</Handle>
      <input
        aria-label={`chat ${handle}`}
        placeholder="Say something…"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && msg.trim()) {
            onSendCommand(`chat ${handle} ${msg.trim()}`);
            setMsg("");
          }
        }}
        style={{ width: "100%" }}
      />
    </Entry>
  );
}

export function ForumChatSidecar({ onSendCommand }: SidecarProps): JSX.Element {
  const forumNav = useStore((s) => s.forumNav);
  const forumRecords = useStore((s) => s.forumRecords);
  const forumScopes = useStore((s) => s.forumScopes);

  // The subject-path stack: the board's chat always; the open thread's
  // chat (if it's a promoted thread carrying its own thread-subject)
  // stacked beneath it, parent still reachable.
  const path: string[] = [];
  if (forumNav.boardHandle) path.push(forumNav.boardHandle);

  // A promoted thread exposes its board-scoped handle once it carries a
  // thread-subject; surface it from the live thread record if present.
  if (forumNav.threadId) {
    for (const [subId, scope] of Object.entries(forumScopes)) {
      if (scope.kind !== "thread") continue;
      const root = (forumRecords[subId] ?? []).find(
        (r) => r.id === forumNav.threadId,
      );
      if (root?.subject && forumNav.boardHandle) {
        // The thread-subject's board-scoped handle is `board/<thread>`; we
        // don't carry the thread's slug client-side, so address it by the
        // promoted thread's title under the board.
        path.push(`${forumNav.boardHandle}/${slug(root.title)}`);
      }
    }
  }

  return (
    <Rail>
      <Handle>Chat</Handle>
      <Stack>
        {path.length === 0 && <div style={{ opacity: 0.6 }}>Open a board.</div>}
        {path.map((handle, i) => (
          <ChatEntry
            key={handle}
            handle={handle}
            depth={i}
            onSendCommand={onSendCommand}
          />
        ))}
      </Stack>
    </Rail>
  );
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
