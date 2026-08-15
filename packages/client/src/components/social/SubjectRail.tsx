/**
 * SubjectRail — the forum's navigation, at the grain the server has
 * always used.
 *
 * ⭐⭐ **A Subject is one record: identity, audience, and the surfaces it
 * lights up.** The client only ever knew about *boards*, and a board is
 * one surface of a subject — so a subject lighting an argument board, a
 * popularity board and a chat channel appeared as three unrelated
 * things, and no arrangement of a board list can say otherwise.
 *
 * ⭐ Topic-grain subjects nest under their parent rather than sitting
 * flat beside it. A promoted thread is *board-scoped* — its handle is
 * `parent/name` and its audience is inherited — so a flat list would
 * present it as a peer venue it is not.
 *
 * The rail is live: it rides the `subjects` forum subscription, so a
 * subject appearing or a surface lighting up moves it without a reload.
 */

import React from "react";
import styled from "styled-components";
import type { ForumSubjectRecord, SubjectSurfaceName } from "@saxonberg/types";
import { useStore } from "../../store";
import {
  asSubjects,
  subscribeForumScope,
  unsubscribeForumScope,
} from "../../store/forumActions";
import { tokens } from "../ui";
import { SURFACE_LABEL, SURFACE_HUE } from "./surfaces";

const Rail = styled.nav`
  display: flex;
  flex-direction: column;
  min-width: 14rem;
  max-width: 18rem;
  border-right: 1px solid ${tokens.color.border};
  overflow-y: auto;
  padding: ${tokens.space.sm} 0;
`;

const Label = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
  padding: 0 ${tokens.space.md} ${tokens.space.xs};
`;

const Row = styled.button<{ $on: boolean; $nested: boolean }>`
  appearance: none;
  text-align: left;
  background: ${(p) => (p.$on ? tokens.color.surfaceAlt : "transparent")};
  border: none;
  border-left: 2px solid
    ${(p) => (p.$on ? tokens.color.accent : "transparent")};
  color: ${tokens.color.fg};
  font: inherit;
  cursor: pointer;
  padding: ${tokens.space.xs} ${tokens.space.md} ${tokens.space.xs}
    ${(p) => (p.$nested ? "1.75rem" : tokens.space.md)};
  display: flex;
  flex-direction: column;
  gap: 2px;
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const TitleLine = styled.span`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${tokens.space.sm};
`;

/**
 * The open-objection count. ⚠ Rendered only when non-zero: a `0` badge
 * beside every subject would read as a score, and this is a queue.
 */
const OpenCount = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.danger};
`;

const Chips = styled.span`
  display: flex;
  gap: 3px;
`;

const Chip = styled.span<{ $hue: string }>`
  font-family: ${tokens.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${(p) => p.$hue};
  border: 1px solid currentColor;
  border-radius: 2px;
  padding: 0 3px;
  opacity: 0.85;
`;

const Note = styled.p`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.sm} ${tokens.space.md};
  margin: 0;
`;

export interface SubjectRailProps {
  selectedId: string | null;
  onSelect: (subject: ForumSubjectRecord) => void;
}

/**
 * Subscribe to the subject set for as long as the rail is mounted.
 * Returns the live records.
 *
 * ⚠ Exported so the shell can hold the subscription at ITS level when
 * the rail is disclosed rather than always-on (a phone). A subscription
 * that lives and dies with a collapsed rail would leave the header with
 * no subject to describe.
 */
export function useSubjectRail(): ForumSubjectRecord[] {
  const [subId, setSubId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const id = subscribeForumScope({ kind: "subjects", id: "" });
    setSubId(id);
    return () => unsubscribeForumScope(id);
  }, []);
  const records = useStore((s) => (subId ? s.forumRecords[subId] : undefined));
  return React.useMemo(() => asSubjects(records), [records]);
}

/** Order the rail: venues alphabetically, each followed by its topics. */
export function orderSubjects(
  subjects: readonly ForumSubjectRecord[],
): ForumSubjectRecord[] {
  const venues = subjects
    .filter((s) => s.grain === "venue")
    .sort((a, b) => a.title.localeCompare(b.title));
  const topicsByParent = new Map<string, ForumSubjectRecord[]>();
  for (const s of subjects) {
    if (s.grain !== "topic") continue;
    const key = s.parent ?? "";
    const list = topicsByParent.get(key) ?? [];
    list.push(s);
    topicsByParent.set(key, list);
  }
  const out: ForumSubjectRecord[] = [];
  for (const v of venues) {
    out.push(v);
    const kids = (topicsByParent.get(v.id) ?? []).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
    out.push(...kids);
    topicsByParent.delete(v.id);
  }
  // A topic whose parent this viewer cannot see still belongs on screen —
  // dropping it would hide a subject the audience check already allowed.
  for (const orphans of topicsByParent.values()) out.push(...orphans);
  return out;
}

export const SubjectRail: React.FC<SubjectRailProps> = ({
  selectedId,
  onSelect,
}) => {
  const subjects = useSubjectRail();
  const ordered = React.useMemo(() => orderSubjects(subjects), [subjects]);

  return (
    <Rail data-testid="subject-rail" aria-label="Subjects">
      <Label>Subjects</Label>
      {ordered.length === 0 && (
        <Note>
          No subjects you can see yet. Make one with{" "}
          <code>forum make &lt;name&gt;</code>.
        </Note>
      )}
      {ordered.map((s) => (
        <Row
          key={s.id}
          data-subject={s.id}
          $on={s.id === selectedId}
          $nested={s.grain === "topic"}
          onClick={() => onSelect(s)}
        >
          <TitleLine>
            <span>
              {s.grain === "topic" ? "↳ " : ""}
              {s.grain === "topic" ? s.title.split("/").pop() : s.title}
            </span>
            {s.openObjections > 0 && (
              <OpenCount title="objections with nothing answering them">
                {s.openObjections}
              </OpenCount>
            )}
          </TitleLine>
          <Chips>
            {s.surfaces.map((surface: SubjectSurfaceName) => (
              <Chip key={surface} $hue={SURFACE_HUE[surface]}>
                {SURFACE_LABEL[surface].slice(0, 4)}
              </Chip>
            ))}
          </Chips>
        </Row>
      ))}
      <Note>
        A Subject is one record: a title, an audience, and the surfaces it
        lights up. Indented entries are thread-grain topics promoted out of
        a parent.
      </Note>
    </Rail>
  );
};
