/**
 * TunedRail — what you are following, and whether you can answer it.
 *
 * ⭐⭐ **The composer branches on the same flag its copy describes.** A
 * read-only channel gets a dead input and a sentence saying why, not a
 * live one that refuses after you have typed. `canPost` is the server's
 * answer (a linked identity with chat authorized — Twitch only this
 * cycle), which is exactly why it is on the wire rather than inferred
 * here from the platform name.
 *
 * ⭐ The rail is state, not parsed prose. `tune` with no argument prints
 * a list to the scroll; that is a reply to a question you asked, and
 * scraping it would make the rail a reader of its own output.
 */

import React from "react";
import styled from "styled-components";
import type { TunedTarget } from "@saxonberg/types";
import { useStore } from "../../store";
import { tokens } from "../ui";

const Rail = styled.section`
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid ${tokens.color.border};
`;

const Label = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
  padding: ${tokens.space.sm} ${tokens.space.md} ${tokens.space.xs};
`;

const Row = styled.button<{ $on: boolean }>`
  appearance: none;
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  text-align: left;
  font: inherit;
  font-size: ${tokens.font.small};
  cursor: pointer;
  color: ${tokens.color.fg};
  background: ${(p) => (p.$on ? tokens.color.surfaceAlt : "transparent")};
  border: none;
  border-left: 2px solid
    ${(p) => (p.$on ? tokens.color.accent : "transparent")};
  padding: ${tokens.space.xs} ${tokens.space.md};
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const Platform = styled.span<{ $hue: string }>`
  font-family: ${tokens.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${(p) => p.$hue};
  border: 1px solid currentColor;
  border-radius: 2px;
  padding: 0 3px;
`;

const Cap = styled.span`
  margin-left: auto;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const Note = styled.p`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.sm} ${tokens.space.md};
  margin: 0;
`;

const Composer = styled.form`
  display: flex;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-top: 1px solid ${tokens.color.border};
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
  background: ${tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Sends = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  padding: 0 ${tokens.space.md} ${tokens.space.sm};
`;

/** Per-platform hue, matching the per-line tags in the chat log. */
const PLATFORM_HUE: Record<TunedTarget["platform"], string> = {
  twitch: tokens.color.accent,
  youtube: tokens.color.danger,
  kick: tokens.color.info,
};

export interface TunedRailProps {
  onSendCommand: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}

/** The command that posts to a tuned channel — a real verb, always. */
export function postCommand(target: TunedTarget, message: string): string {
  return `tune ${target.handle} --${target.platform} ${message}`;
}

export const TunedRail: React.FC<TunedRailProps> = ({
  onSendCommand,
  onCommandPreview,
}) => {
  const tuned = useStore(
    (s) => (s.clientState["cockpit.tuned"] as TunedTarget[] | undefined) ?? [],
  );
  const [selectedHandle, setSelected] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");

  const selected =
    tuned.find((t) => t.handle === selectedHandle) ?? tuned[0] ?? null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !selected.canPost || draft.trim() === "") return;
    onSendCommand(postCommand(selected, draft.trim()));
    setDraft("");
  };

  return (
    <Rail data-testid="tuned-rail">
      <Label>Tuned</Label>
      {tuned.length === 0 && (
        <Note>
          Following nothing. <code>tune twitch.tv/&lt;channel&gt;</code>{" "}
          follows a chat.
        </Note>
      )}
      {tuned.map((t) => (
        <Row
          key={`${t.platform}:${t.handle}`}
          data-tuned={t.handle}
          $on={selected?.handle === t.handle}
          onClick={() => setSelected(t.handle)}
        >
          <Platform $hue={PLATFORM_HUE[t.platform]}>{t.platform}</Platform>
          <span>{t.handle}</span>
          {/*
            ⚠ The capability is STATED, not implied by a missing control.
            "read only" is information; a silently-absent composer is not.
          */}
          <Cap data-cap={t.canPost ? "post" : "read"}>
            {t.canPost ? "read · post" : "read only"}
          </Cap>
        </Row>
      ))}

      {selected && (
        <>
          <Composer onSubmit={submit}>
            <Input
              data-testid="tuned-composer"
              disabled={!selected.canPost}
              placeholder={
                selected.canPost
                  ? `say something to #${selected.handle}…`
                  : `${selected.platform} chat is read-only this cycle`
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() =>
                selected.canPost &&
                onCommandPreview(postCommand(selected, "<msg>"))
              }
              onBlur={() => onCommandPreview(null)}
            />
          </Composer>
          <Sends>
            {selected.canPost
              ? `sends as ${postCommand(selected, "<msg>")}`
              : `${selected.platform} chat is read-only this cycle — nothing to send`}
          </Sends>
        </>
      )}
    </Rail>
  );
};
