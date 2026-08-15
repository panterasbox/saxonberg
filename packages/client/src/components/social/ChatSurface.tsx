/**
 * ChatSurface — a subject's chat, as a terminal.
 *
 * ⭐⭐ **A chat surface IS a terminal scoped to a channel.** It was
 * standing in with `ForumChatSidecar`, a fixed-width RAIL built to sit
 * *beside* the forum, whose input required clicking "Talk here" to put
 * the global command bar into a `chat <handle>` prefix. That is one
 * click too many and one concept too many: if you are looking at a
 * subject's chat, the thing you type goes to that chat. The scoping is
 * implied by where you are.
 *
 * So this owns its own input and sends `chan <handle> <msg>` directly.
 * ⚠ It still STATES the command it sends — the axiom does not bend for
 * a surface that happens to feel like a chat box, and a player who
 * learns `chan` here can use it anywhere.
 *
 * ⭐ The log is a client-side filter over the one shared frame buffer,
 * not a second store. Chat frames carry `channelName`; that is the whole
 * mechanism, and it is why a message shows here and in the world
 * transcript at once rather than being routed to one of them.
 */

import React from "react";
import styled from "styled-components";
import { useStore, type Frame } from "../../store";
import { MmlRenderer } from "../MmlRenderer";
import { tokens } from "../ui";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const Log = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: ${tokens.space.md} ${tokens.space.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

const Line = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  align-items: baseline;
`;

const Stamp = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  flex: none;
`;

const Empty = styled.p`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
  margin: 0;
`;

/**
 * ⚠ The boundary between what this session holds and what the server
 * holds, stated rather than implied. A log that simply started where the
 * buffer starts would read as "this is everything", which is the same
 * class of lie as an unwired figure.
 */
const Boundary = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  border-bottom: 1px dashed ${tokens.color.borderMuted};
  padding-bottom: ${tokens.space.xs};
  margin-bottom: ${tokens.space.xs};
`;

const Composer = styled.form`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm} ${tokens.space.lg};
  border-top: 1px solid ${tokens.color.border};
`;

const Prefix = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.accent};
  flex: none;
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  font: inherit;
  color: ${tokens.color.fg};
  background: ${tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  &:focus {
    outline: none;
    border-color: ${tokens.color.accent};
  }
`;

const Sends = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  padding: 0 ${tokens.space.lg} ${tokens.space.sm};
`;

export interface ChatSurfaceProps {
  /** The subject's handle — the channel this surface speaks to. */
  handle: string;
  onSendCommand: (text: string, barId?: string) => void;
  onCommandPreview: (command: string | null) => void;
}

/**
 * The command a message sends. Exported so the preview, the "sends as"
 * line and the submit are provably one string.
 *
 * ⚠⚠ The verb is `chat`, not `chan`. The reference mock writes
 * `chan measure-14 <msg>` and this shipped composing exactly that, which
 * the server answered with *"I don't understand 'chan'."* — the same
 * mistake as the reaction sigil, and from the same cause: the command
 * form was copied from a MOCK rather than read off the verb spec.
 * `cmd/social/chat.yaml` declares `verbs: [chat]`.
 */
export function chatCommand(handle: string, message: string): string {
  return `chat ${handle} ${message}`;
}

/** The channel's own slice of the shared frame buffer. */
export function chatLines(
  frames: readonly Frame[],
  handle: string,
): Frame[] {
  const want = handle.toLowerCase();
  return frames.filter((f) => (f.channelName ?? "").toLowerCase() === want);
}

export const ChatSurface: React.FC<ChatSurfaceProps> = ({
  handle,
  onSendCommand,
  onCommandPreview,
}) => {
  const frames = useStore((s) => s.frames);
  const [draft, setDraft] = React.useState("");
  const logRef = React.useRef<HTMLDivElement>(null);

  const lines = React.useMemo(() => chatLines(frames, handle), [frames, handle]);

  React.useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (text === "") return;
    onSendCommand(chatCommand(handle, text));
    setDraft("");
  };

  return (
    <Wrap data-testid="chat-surface">
      <Log ref={logRef}>
        <Boundary>
          held since you connected · {lines.length}{" "}
          {lines.length === 1 ? "line" : "lines"} — earlier than this lives
          on the server, not here
        </Boundary>
        {lines.length === 0 && (
          <Empty>Nothing said here yet in this session.</Empty>
        )}
        {lines.map((f) => (
          <Line key={f.id}>
            <Stamp>
              {new Date(f.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Stamp>
            <span>
              <MmlRenderer
                text={f.body}
                onCommandClick={(c) => onSendCommand(c)}
                onCommandPreview={onCommandPreview}
              />
            </span>
          </Line>
        ))}
      </Log>

      <Composer onSubmit={submit}>
        <Prefix>#{handle}›</Prefix>
        <Input
          data-testid="chat-composer"
          placeholder="say something…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => onCommandPreview(chatCommand(handle, "<msg>"))}
          onBlur={() => onCommandPreview(null)}
        />
      </Composer>
      {/*
        ⭐ The surface names its own verb. It would be easy to argue a
        chat box is the one place the command line may go quiet — it is
        the opposite: this is where a player most often types, so it is
        where `chan` is most cheaply learned.
      */}
      <Sends>sends as {chatCommand(handle, "<msg>")}</Sends>
    </Wrap>
  );
};
