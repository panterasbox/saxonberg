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
import { ForumChatSidecar } from "../ForumChatSidecar";
import { openForumBoard } from "../../store/forumActions";
import { isForumSurface } from "./surfaces";

const Shell = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  background: ${tokens.color.surfaceMuted};
  color: ${tokens.color.fg};
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
  const [selected, setSelected] = React.useState<ForumSubjectRecord | null>(
    null,
  );
  const [surface, setSurface] = React.useState<SubjectSurfaceName | null>(null);

  const selectSubject = React.useCallback((s: ForumSubjectRecord) => {
    setSelected(s);
    const first = defaultSurface(s);
    setSurface(first);
    // `ForumView` reads the board out of `forumNav`; the subject's handle
    // IS the board handle for a lit forum surface.
    if (first && isForumSurface(first)) openForumBoard(s.handle);
  }, []);

  const selectSurface = React.useCallback(
    (next: SubjectSurfaceName) => {
      setSurface(next);
      if (selected && isForumSurface(next)) openForumBoard(selected.handle);
    },
    [selected],
  );

  return (
    <Shell data-testid="subject-shell">
      <SubjectRail selectedId={selected?.id ?? null} onSelect={selectSubject} />
      <Main>
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
                />
              ) : (
                <ForumChatSidecar onSendCommand={onSendCommand} />
              )}
            </Body>
          </>
        )}
      </Main>
    </Shell>
  );
};
