/**
 * SubjectShell — the forum app, organised the way the server's data is.
 *
 * Rail (subjects) | header (identity + audience + surfaces) | the active
 * surface's body.
 *
 * ⭐ **What this replaced was the NAVIGATION, not the boards.** The
 * argument lens, the popularity list and the comment tree in
 * `ForumView` render the server's projection correctly and are kept
 * whole — the defect was one level up, where the client's only unit was
 * a *board* and so a subject lighting three surfaces appeared as three
 * unrelated things. `ForumView` is now a body inside a subject rather
 * than the whole app, and `forumNav` is set from the subject's handle.
 *
 * ⚠ Selecting a surface writes `forumNav`, which is what `ForumView`
 * reads. That is the seam between the two: the shell owns *which
 * subject and which surface*, `ForumView` owns *rendering that board*.
 */

import React from "react";
import styled from "styled-components";
import type { ForumSubjectRecord, SubjectSurfaceName } from "@saxonberg/types";
import { tokens } from "../ui";
import { SubjectRail } from "./SubjectRail";
import { SubjectHeader } from "./SubjectHeader";
import { ForumView } from "../ForumView";
import { ChatSurface } from "./ChatSurface";
import { useStore } from "../../store";
import { openForumBoard } from "../../store/forumActions";
import { useIsCompact } from "../../lib/style/useIsCompact";
import { isForumSurface } from "./surfaces";

const Shell = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  background: ${tokens.color.surfaceMuted};
  color: ${tokens.color.fg};
`;

/**
 * The phone's back control — the only way out of a subject once the rail
 * has given the screen over to it.
 */
const Back = styled.button`
  appearance: none;
  align-self: flex-start;
  font: inherit;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.accent};
  background: transparent;
  border: none;
  cursor: pointer;
  padding: ${tokens.space.sm} ${tokens.space.md} 0;
`;

const Main = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const Empty = styled.p`
  color: ${tokens.color.fgMuted};
  padding: ${tokens.space.lg};
  margin: 0;
`;

/**
 * ⚠⚠ **What the server just said, because otherwise nothing does.**
 *
 * `chat` mode renders no transcript, so every command reply landed
 * nowhere: clicking a vote arrow on your own thread produced *"You
 * cannot change the vote on your own entry"* — a correct, informative
 * refusal — and the player saw a score that did not move and no reason.
 * Reported as "voting doesn't work"; voting worked fine.
 *
 * ⭐ The command line is never silent, and that cuts both ways: a
 * surface that lets you SEND has to show you the ANSWER. This is the
 * smallest honest form of that — the last reply, where you are looking.
 */
const Reply = styled.output`
  display: block;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  border-top: 1px solid ${tokens.color.border};
  padding: ${tokens.space.xs} ${tokens.space.lg};
  white-space: pre-wrap;
`;

export interface SubjectShellProps {
  onSendCommand: (text: string, barId?: string) => void;
  onCommandPreview: (command: string | null) => void;
}

/**
 * The surface a freshly-selected subject opens on: the first it has lit,
 * in vocabulary order.
 *
 * ⚠ Never a fixed default. Defaulting to `popularity-forum` would land a
 * deliberation-only subject on a surface it does not have, and the body
 * would render empty with nothing saying why.
 */
export function defaultSurface(
  subject: ForumSubjectRecord,
): SubjectSurfaceName | null {
  return subject.surfaces[0] ?? null;
}

export const SubjectShell: React.FC<SubjectShellProps> = ({
  onSendCommand,
  onCommandPreview,
}) => {
  /*
   * ⭐ **Master-detail, not two columns.**
   *
   * A rail beside a body is right on a desktop and wrong on a phone: at
   * 390px it left the rail ~180px and the BODY ~200px, which is a forum
   * post rendered four words to a line. Found by driving.
   *
   * A subject and its surfaces are a drill-down, so the phone SWITCHES
   * rather than interleaving — the rail owns the screen until you pick,
   * then the subject does, with a way back. That is the ordinary
   * master-detail answer and it needs no mock to get right; what still
   * waits for one is the surface-tab treatment inside the body.
   */
  const isCompact = useIsCompact();
  /*
   * The most recent command reply. `shell.result` is the verb's own
   * answer; `shell.diagnostic` carries a refusal. Both are things the
   * player asked for and must be able to read from here.
   */
  const lastReply = useStore((st) => {
    for (let i = st.frames.length - 1; i >= 0; i--) {
      const f = st.frames[i]!;
      if (f.topic === "shell.result" || f.topic === "shell.diagnostic") {
        return f;
      }
    }
    return null;
  });
  const [selected, setSelected] = React.useState<ForumSubjectRecord | null>(
    null,
  );
  const [surface, setSurface] = React.useState<SubjectSurfaceName | null>(null);

  /*
   * ⚠ Point at the SPECIFIC board, not just the subject's handle. One
   * subject with both forum surfaces lit has one handle and two boards;
   * resolving by handle picks a documented winner, which is how the
   * Argument tab came to silently re-render Popularity.
   */
  const openSurface = React.useCallback(
    (s: ForumSubjectRecord, next: SubjectSurfaceName | null) => {
      if (next && isForumSurface(next)) {
        openForumBoard(s.handle, s.surfaceRefs[next] ?? null);
      }
    },
    [],
  );

  const selectSubject = React.useCallback(
    (s: ForumSubjectRecord) => {
      setSelected(s);
      const first = defaultSurface(s);
      setSurface(first);
      openSurface(s, first);
    },
    [openSurface],
  );

  const selectSurface = React.useCallback(
    (next: SubjectSurfaceName) => {
      setSurface(next);
      if (selected) openSurface(selected, next);
    },
    [selected, openSurface],
  );

  // On a phone the rail and the body take turns; on a desktop both show.
  const showRail = !isCompact || selected === null;
  const showBody = !isCompact || selected !== null;

  return (
    <Shell data-testid="subject-shell">
      {showRail && (
        <SubjectRail
          selectedId={selected?.id ?? null}
          onSelect={selectSubject}
        />
      )}
      <Main style={showBody ? undefined : { display: "none" }}>
        {isCompact && selected !== null && (
          <Back
            data-testid="subject-back"
            onClick={() => {
              setSelected(null);
              setSurface(null);
            }}
          >
            ‹ Subjects
          </Back>
        )}
        {selected === null ? (
          <Empty>Pick a subject.</Empty>
        ) : (
          <>
            <SubjectHeader
              subject={selected}
              activeSurface={surface ?? "popularity-forum"}
              onSelectSurface={selectSurface}
              onSendCommand={onSendCommand}
              onCommandPreview={onCommandPreview}
            />
            <Body>
              {surface === null ? (
                /*
                 * A real subject with nothing lit. Not an error and not a
                 * hatch — the surfaces above are the way out, and saying
                 * so beats an empty panel.
                 */
                <Empty>
                  Nothing lit on this subject yet. The controls above light
                  a surface up.
                </Empty>
              ) : isForumSurface(surface) ? (
                <ForumView
                  onSendCommand={onSendCommand}
                  onCommandPreview={onCommandPreview}
                  // The shell knows which surface it opened; an empty
                  // board cannot tell ForumView what it is.
                  organizer={
                    surface === "argument-forum" ? "argument" : "popularity"
                  }
                />
              ) : (
                <ChatSurface
                  handle={selected.handle}
                  onSendCommand={onSendCommand}
                  onCommandPreview={onCommandPreview}
                />
              )}
            </Body>
          </>
        )}
        {lastReply && (
          <Reply data-testid="forum-reply" aria-live="polite">
            {lastReply.body.replace(/<[^>]+>/g, "").trim()}
          </Reply>
        )}
      </Main>
    </Shell>
  );
};
