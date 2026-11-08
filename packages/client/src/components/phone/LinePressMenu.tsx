/**
 * LinePressMenu — long-press on a line (client-surface W6): react, reply,
 * tell, look — each SHOWING the command it sends, because a phone has no
 * hover to preview one. React opens the emote sheet.
 */

import React from "react";
import styled from "styled-components";
import type { Frame } from "../../store/index";
import { tokens } from "../ui";

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  background: ${tokens.color.scrim};
  z-index: 50;
`;

const Menu = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 51;
  background: ${tokens.color.surface};
  border-top: 1px solid ${tokens.color.border};
  padding: ${tokens.space.md};
  padding-bottom: calc(${tokens.space.md} + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

const Item = styled.button`
  font: inherit;
  text-align: left;
  min-height: 44px;
  padding: 0 ${tokens.space.md};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
`;

const Cmd = styled.code`
  margin-left: ${tokens.space.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

export interface LineAction {
  label: string;
  /** What it does: send, seed the bar, or open the react sheet. */
  command: string;
  kind: "send" | "seed" | "react";
}

/** The actions a line offers, given who spoke it. */
export function lineActions(frame: Frame): LineAction[] {
  const out: LineAction[] = [];
  if (frame.frameId !== undefined) {
    out.push({ label: "React", command: `react --msg ${frame.frameId} …`, kind: "react" });
  }
  const who = frame.speaker?.displayName?.split(/\s+/)[0]?.toLowerCase();
  if (frame.channelName) {
    out.push({ label: "Reply", command: `chat ${frame.channelName} `, kind: "seed" });
  } else if (who) {
    out.push({ label: "Reply", command: "say ", kind: "seed" });
  }
  if (who) out.push({ label: "Tell", command: `tell ${who} `, kind: "seed" });
  if (frame.speaker) {
    out.push({ label: "Look", command: `look #${frame.speaker.stuffId}`, kind: "send" });
  }
  return out;
}

export function LinePressMenu({
  frame,
  onSend,
  onSeed,
  onReact,
  onClose,
}: {
  frame: Frame;
  onSend: (command: string) => void;
  onSeed: (text: string) => void;
  onReact: (frame: Frame) => void;
  onClose: () => void;
}): React.ReactElement {
  const actions = lineActions(frame);
  return (
    <>
      <Scrim onClick={onClose} />
      <Menu data-testid="line-menu" role="menu">
        {actions.map((a) => (
          <Item
            key={a.label}
            type="button"
            role="menuitem"
            data-testid={`line-${a.label.toLowerCase()}`}
            onClick={() => {
              onClose();
              if (a.kind === "send") onSend(a.command);
              else if (a.kind === "seed") onSeed(a.command);
              else onReact(frame);
            }}
          >
            {a.label}
            <Cmd>{a.command}</Cmd>
          </Item>
        ))}
      </Menu>
    </>
  );
}
