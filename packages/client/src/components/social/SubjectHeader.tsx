/**
 * SubjectHeader — a subject's identity, its audience, and its surfaces.
 *
 * ⭐⭐ **The tabs are not navigation.** Switching between them changes the
 * *rendering*, not the room: one audience, one membership, one invite
 * list, whichever surface you are on. That is why the audience chip sits
 * next to the title rather than inside any one surface — it governs all
 * of them at once.
 *
 * ⭐ **An unlit surface is an affordance, not an absence.** A subject
 * with no ordered board shows `+ Ordered`, and it previews the real
 * command (`forum on <handle> --ordered`) like every other clickable.
 * The verb re-checks ownership on arrival; the control's job is to say
 * what would be sent, not to decide who may send it.
 *
 * ⚠ `ordered-chat` is the exception, and it is a SERVER fact: the surface
 * is parked (`chat on --ordered` calls itself deferred), so it renders in
 * the not-wired treatment and sends nothing. A control that reliably
 * refuses is worse than one that says it is not there yet.
 */

import React from "react";
import styled from "styled-components";
import type { ForumSubjectRecord, SubjectSurfaceName } from "@saxonberg/types";
import { tokens } from "../ui";
import {
  SURFACE_ORDER,
  SURFACE_LABEL,
  SURFACE_HUE,
  lightSurfaceCommand,
} from "./surfaces";

const Head = styled.header`
  padding: ${tokens.space.md} ${tokens.space.lg} 0;
  border-bottom: 1px solid ${tokens.color.border};
`;

const TitleRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
`;

const Title = styled.h2`
  margin: 0;
  font-family: ${tokens.font.display ?? tokens.font.family};
  font-size: 1.35rem;
  color: ${tokens.color.fgEmphasis};
`;

const Tag = styled.span<{ $hue?: string }>`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${(p) => p.$hue ?? tokens.color.fgMuted};
  border: 1px solid currentColor;
  border-radius: 2px;
  padding: 0 ${tokens.space.xs};
  opacity: 0.9;
`;

const Handle = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  margin-top: 2px;
`;

const Tabs = styled.div`
  display: flex;
  gap: ${tokens.space.xs};
  margin-top: ${tokens.space.md};
  flex-wrap: wrap;
`;

const Tab = styled.button<{ $on: boolean; $hue: string }>`
  appearance: none;
  font: inherit;
  font-size: ${tokens.font.small};
  cursor: pointer;
  color: ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.fgMuted)};
  background: ${(p) => (p.$on ? tokens.color.surfaceAlt : "transparent")};
  border: 1px solid
    ${(p) => (p.$on ? p.$hue : tokens.color.border)};
  border-bottom-color: ${(p) => (p.$on ? tokens.color.surfaceAlt : tokens.color.border)};
  border-radius: ${tokens.radius.sm} ${tokens.radius.sm} 0 0;
  padding: ${tokens.space.xs} ${tokens.space.md};
  &:hover {
    color: ${tokens.color.fgEmphasis};
  }
`;

/** An unlit surface: a real command, offered. */
const Unlit = styled(Tab)`
  border-style: dashed;
  opacity: 0.75;
`;

/**
 * A surface the SERVER has parked. The not-wired treatment — hatched,
 * dashed, and inert — because there is nothing behind it to reach.
 */
const Parked = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  border: 1px dashed ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm} ${tokens.radius.sm} 0 0;
  padding: ${tokens.space.xs} ${tokens.space.md};
  background-image: repeating-linear-gradient(
    45deg,
    ${tokens.color.hatch} 0 4px,
    transparent 4px 8px
  );
  cursor: not-allowed;
  opacity: 0.7;
`;

export interface SubjectHeaderProps {
  subject: ForumSubjectRecord;
  activeSurface: SubjectSurfaceName;
  onSelectSurface: (surface: SubjectSurfaceName) => void;
  onSendCommand: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}

export const SubjectHeader: React.FC<SubjectHeaderProps> = ({
  subject,
  activeSurface,
  onSelectSurface,
  onSendCommand,
  onCommandPreview,
}) => {
  const lit = new Set(subject.surfaces);
  return (
    <Head data-testid="subject-header">
      <TitleRow>
        <Title>{subject.title}</Title>
        <Tag>
          {subject.grain === "topic"
            ? "topic · thread-grain"
            : "venue · board-grain"}
        </Tag>
        {/*
          ⭐ The audience sits beside the TITLE, not inside a surface,
          because it governs every surface at once. That placement is the
          claim the whole subject model makes.
        */}
        <Tag $hue={tokens.color.info} data-testid="subject-audience">
          {subject.audience.label}
        </Tag>
      </TitleRow>
      <Handle>
        handle {subject.handle}
        {subject.grain === "topic" ? " · board-scoped" : " · flat-global"}
        {subject.openObjections > 0 &&
          ` · ${subject.openObjections} open objection${
            subject.openObjections === 1 ? "" : "s"
          }`}
      </Handle>

      <Tabs role="tablist">
        {SURFACE_ORDER.map((surface) => {
          const hue = SURFACE_HUE[surface];
          const label = SURFACE_LABEL[surface];
          if (lit.has(surface)) {
            return (
              <Tab
                key={surface}
                role="tab"
                aria-selected={surface === activeSurface}
                data-surface={surface}
                $on={surface === activeSurface}
                $hue={hue}
                onClick={() => onSelectSurface(surface)}
              >
                {label}
              </Tab>
            );
          }
          const cmd = lightSurfaceCommand(subject.handle, surface);
          if (cmd === null) {
            return (
              <Parked
                key={surface}
                data-surface-parked={surface}
                title="Parked server-side — the procedure is not built yet."
              >
                {label} ╌╌
              </Parked>
            );
          }
          return (
            <Unlit
              key={surface}
              data-surface-unlit={surface}
              $on={false}
              $hue={hue}
              onClick={() => onSendCommand(cmd)}
              onMouseEnter={() => onCommandPreview(cmd)}
              onMouseLeave={() => onCommandPreview(null)}
              onFocus={() => onCommandPreview(cmd)}
              onBlur={() => onCommandPreview(null)}
            >
              + {label}
            </Unlit>
          );
        })}
      </Tabs>
    </Head>
  );
};
