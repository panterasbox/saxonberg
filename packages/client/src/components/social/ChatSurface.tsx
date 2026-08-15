/**
 * ChatSurface — a subject's chat, as a terminal.
 *
 * ⭐⭐ **A chat surface IS a terminal scoped to a channel**, and the
 * scoping is the INPUT MODE, not a second input.
 *
 * This went through two wrong shapes first, and the difference is worth
 * keeping. It stood in with `ForumChatSidecar`, whose input needed a
 * "Talk here" click to set the mode — one click too many, since being on
 * a subject's chat already says where your typing goes. The fix was then
 * to give the surface its own composer, which removed the click and
 * introduced two command bars on one screen, with the channel name
 * retyped into every message.
 *
 * ⭐ Both are solved by the mechanism that already existed: entering the
 * surface sets the forum command line's server-authoritative prefix
 * (`cockpit cli --prefix "chat <handle>"`), and leaving clears it. **One
 * bar, no retyping, and the prefix is visible in it** — so the player
 * can see they are speaking to `#Gossip` and can still type any other
 * command by clearing.
 *
 * ⚠ The prefix is real server state (`cockpit.inputModes`, per bar), not
 * a client convenience. That is why the surface SENDS a command to enter
 * rather than setting a local flag: the client owns zero command
 * semantics, including this one.
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

/**
 * Where your typing goes. ⚠ Not a control — the command bar below is the
 * input. This states the prefix that bar is carrying, because a prefixed
 * command line that does not say so is a command line that silently
 * rewrites what you type.
 */
const Scope = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm} ${tokens.space.lg};
  border-top: 1px solid ${tokens.color.border};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const Prefix = styled.span`
  color: ${tokens.color.accent};
  flex: none;
`;

/** The forum layout's command bar id — must match `ForumLayout`. */
export const FORUM_BAR_ID = "forum";

export interface ChatSurfaceProps {
  /** The subject's handle — the channel this surface speaks to. */
  handle: string;
  onSendCommand: (text: string, barId?: string) => void;
  onCommandPreview: (command: string | null) => void;
}

/**
 * The prefix this surface puts on the forum command line.
 *
 * ⚠⚠ The verb is `chat`, not `chan`. The reference mock writes
 * `chan measure-14 <msg>` and an earlier cut composed exactly that,
 * which the server answered with *"I don't understand 'chan'."* — the
 * same mistake as the reaction sigil, and from the same cause: the
 * command form was copied from a MOCK rather than read off the verb
 * spec. `cmd/social/chat.yaml` declares `verbs: [chat]`.
 */
export function chatPrefix(handle: string): string {
  return `chat ${handle}`;
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
  const activePrefix = useStore((s) => {
    const modes = s.clientState["cockpit.inputModes"] as
      | Record<string, string>
      | undefined;
    return modes?.[FORUM_BAR_ID] ?? "";
  });
  const logRef = React.useRef<HTMLDivElement>(null);

  const lines = React.useMemo(() => chatLines(frames, handle), [frames, handle]);
  const wanted = chatPrefix(handle);

  React.useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines.length]);

  /*
   * ⭐ Entering the surface scopes the command line; leaving unscopes it.
   *
   * ⚠ Guarded on the CURRENT prefix, not fired blindly: the send updates
   * `cockpit.inputModes`, which re-renders this component, which would
   * send again. The guard is what makes an effect that writes
   * server state safe to hang off render.
   */
  React.useEffect(() => {
    if (activePrefix !== wanted) {
      onSendCommand(`cockpit cli --prefix "${wanted}"`, FORUM_BAR_ID);
    }
    return () => {
      // Leaving the surface — another tab, another subject, another
      // mode. A prefix that outlived the screen that set it would
      // silently rewrite the next thing typed.
      onSendCommand("cockpit cli --clear", FORUM_BAR_ID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

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

      {/*
        ⭐ The command bar below IS the input. This says what it is
        carrying — a prefixed command line that does not announce its
        prefix silently rewrites what you type, and the whole point of
        the prefix is that you stop retyping the channel.
      */}
      <Scope data-testid="chat-scope">
        <Prefix>#{handle}›</Prefix>
        <span>
          the command line is prefixed <code>{wanted}</code> — type a
          message, or clear it with <code>cockpit cli --clear</code>
        </span>
      </Scope>
    </Wrap>
  );
};
