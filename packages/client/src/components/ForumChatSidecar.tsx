/**
 * ForumChatSidecar — the contextual chat rail beside the forum view.
 *
 * Per the reframe: chat is just the terminal feed filtered to a channel,
 * plus your input scoped to a verb. So this rail is a CLIENT-side filtered
 * slice of the message feed (the chat frames whose `channelName` matches
 * the board) + a "Talk here" affordance that puts the command bar into a
 * `chat <handle>` input mode. Nothing here rides the bus beyond the
 * ordinary chat command the command bar builds when you type.
 *
 * v1 scopes to the board's chat. (The promoted-thread chat — the
 * subject-path stack — wants the thread-subject's board-scoped handle,
 * which the client doesn't carry yet; deferred.)
 */

import styled from "styled-components";
import { useStore } from "../store";
import { tokens } from "./ui";

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 0.75rem;
  gap: 0.5rem;
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

const Handle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HandleName = styled.div`
  font-weight: 600;
  color: ${tokens.color.accent};
`;

const TalkButton = styled.button<{ $active: boolean }>`
  margin-left: auto;
  background: ${(p) => (p.$active ? tokens.color.accent : "transparent")};
  color: ${(p) => (p.$active ? tokens.color.onAccent : tokens.color.accent)};
  border: 1px solid ${tokens.color.accent};
  border-radius: ${tokens.radius.sm};
  padding: 0.1rem 0.55rem;
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
`;

const Feed = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.25rem;
`;

const Line = styled.div`
  font-family: ${tokens.font.mono};
  font-size: 0.82rem;
  line-height: 1.35;
  word-break: break-word;
`;

const Empty = styled.div`
  color: ${tokens.color.fgMuted};
  font-size: 0.82rem;
`;

/** Crude MML→text for the compact rail (the main terminal renders MML). */
function plain(body: string): string {
  return body.replace(/<[^>]+>/g, "").trim();
}

export function ForumChatSidecar(): JSX.Element {
  const forumNav = useStore((s) => s.forumNav);
  const frames = useStore((s) => s.frames);
  // The sidecar's "talk here" scopes the command bar to this channel.
  const forumMode = useStore((s) => s.inputMode);
  const setInputMode = useStore((s) => s.setInputMode);

  const handle = forumNav.boardHandle;
  if (!handle) {
    return (
      <Rail>
        <RailTitle>Chat</RailTitle>
        <Empty>Open a board.</Empty>
      </Rail>
    );
  }

  const prefix = `chat ${handle}`;
  const active = forumMode?.prefix === prefix;
  const lines = frames.filter((f) => f.channelName === handle);

  return (
    <Rail>
      <RailTitle>Chat</RailTitle>
      <Handle>
        <HandleName>#{handle}</HandleName>
        <TalkButton
          $active={active}
          onClick={() => setInputMode({ prefix, label: handle })}
          title="Scope the command bar to this channel"
        >
          {active ? "Talking…" : "Talk here"}
        </TalkButton>
      </Handle>
      <Feed>
        {lines.length === 0 ? (
          <Empty>
            No messages yet. Click “Talk here”, then type — your input sends
            to <code>chat {handle}</code>.
          </Empty>
        ) : (
          lines.map((f) => <Line key={f.id}>{plain(f.body)}</Line>)
        )}
      </Feed>
    </Rail>
  );
}
