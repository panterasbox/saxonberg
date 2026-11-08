/**
 * TargetChip — "say ▾" in the phone's command bar (client-surface W6):
 * what a bare line becomes. A tap offers the targets; choosing one sends
 * `cockpit cli <bar> --prefix "<target>"`, the server's per-bar prefix —
 * so the chip shows the truth and a typed `/look` still escapes it.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";

const Chip = styled.button`
  flex: none;
  font: inherit;
  font-size: ${tokens.font.small};
  min-height: 36px;
  padding: 0 ${tokens.space.sm};
  margin-left: ${tokens.space.xs};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surface};
  color: ${tokens.color.fgEmphasis};
`;

const Menu = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
`;

const Option = styled.button`
  font: inherit;
  text-align: left;
  min-height: 44px;
  padding: 0 ${tokens.space.md};
  background: transparent;
  border: none;
  color: ${tokens.color.fg};
`;

export function TargetChip({
  barId,
  channel,
  onSendCommand,
}: {
  barId: string;
  /** The channel the terminal shows, if any. */
  channel?: string;
  onSendCommand: (text: string, barId?: string) => void;
}): React.ReactElement {
  const prefix = useStore(
    (s) => (s.clientState["cockpit.inputModes"] as Record<string, string> | undefined)?.[barId] ?? "",
  );
  const [open, setOpen] = React.useState(false);
  const targets = ["say", ...(channel ? [`chat ${channel}`] : []), "off"];
  return (
    <span style={{ position: "relative" }}>
      <Chip type="button" data-testid="target-chip" onClick={() => setOpen((v) => !v)}>
        {prefix || "command"} ▾
      </Chip>
      {open ? (
        <Menu data-testid="target-menu">
          {targets.map((t) => {
            const cmd = t === "off" ? `cockpit cli ${barId} --clear` : `cockpit cli ${barId} --prefix "${t}"`;
            return (
              <Option
                key={t}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSendCommand(cmd, barId);
                }}
              >
                {t === "off" ? "a command" : t}
              </Option>
            );
          })}
        </Menu>
      ) : null}
    </span>
  );
}
