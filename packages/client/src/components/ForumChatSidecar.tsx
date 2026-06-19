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
import { tokens } from "./ui";

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem;
  gap: 0.75rem;
  background: ${tokens.color.surfaceMuted};
  color: ${tokens.color.fg};
  font-size: ${tokens.font.body};
  border-left: 1px solid ${tokens.color.borderMuted};
`;

const RailTitle = styled.div`
  font-weight: 600;
  color: ${tokens.color.fgMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.75rem;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const Entry = styled.div<{ $depth: number }>`
  margin-left: ${(p) => p.$depth * 0.75}rem;
  border: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
  border-radius: ${tokens.radius.md};
  padding: 0.5rem;
`;

const Handle = styled.div`
  font-weight: 600;
  color: ${tokens.color.accent};
  margin-bottom: 0.3rem;
`;

const ChatInput = styled.input`
  width: 100%;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  padding: 0.35rem 0.5rem;
  font: inherit;
  &::placeholder {
    color: ${tokens.color.fgMuted};
  }
  &:focus {
    outline: none;
    border-color: ${tokens.color.accent};
  }
`;

const Empty = styled.div`
  color: ${tokens.color.fgMuted};
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
      <ChatInput
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
      <RailTitle>Chat</RailTitle>
      <Stack>
        {path.length === 0 && <Empty>Open a board.</Empty>}
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
