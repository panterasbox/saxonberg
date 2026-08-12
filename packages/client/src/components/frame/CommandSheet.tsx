/**
 * `CommandSheet` — a tap names its command before it sends.
 *
 * ## ⭐ It CONFIRMS; it does not preview
 *
 * Desktop hover asks *what would this send?* — there is a moment before
 * you commit, and the status bar fills it. **On a phone there is no
 * before: a tap is the commit.** So this is not a preview surface with
 * a different shape. It is the moment that a phone otherwise does not
 * have, inserted deliberately: the affordance opens a sheet naming the
 * verbatim command, and the player sends it or does not.
 *
 * ⭐ The axiom the whole click model advertises — *every click sends a
 * command, and the interface shows which* — is preserved and arguably
 * strengthened here. The interface still shows which command, and still
 * *before* it goes. What changes is that on a phone the showing costs a
 * tap instead of a hover.
 *
 * ⚠ **Every affordance, with no "obvious case" exception.** An
 * unambiguous `look anvil` gets a sheet too. The extra tap IS the
 * pedagogical dividend — clicks are how a player learns the command
 * line exists — and a rule with an exception for cases the client
 * judges obvious is a rule nobody can predict, which is worse than
 * either uniform answer.
 *
 * ⚠⚠ **It does not read `ghostPreview`.** Its state is its own slice.
 * The one-preview-surface guard passes unmodified, and a second test
 * asserts this module never touches that slice — not because the guard
 * needs help, but because the two facts really are different and
 * conflating them is the mistake worth naming twice.
 *
 * ⚠ The command is rendered in the COMMAND register (mono) and
 * verbatim, unwrapped: what the sheet shows is byte-for-byte what
 * `sendCommand` receives. A sheet that pretty-printed would be showing
 * a command that is not the one sent.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: ${tokens.color.scrim};
`;

const Sheet = styled.div`
  background: ${tokens.color.surfaceAlt};
  border-top: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md} ${tokens.radius.md} 0 0;
  padding: ${tokens.space.lg} ${tokens.space.md}
    calc(${tokens.space.lg} + env(safe-area-inset-bottom, 0px));
  overflow-x: hidden;
`;

const Label = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.19em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
  margin-bottom: ${tokens.space.xs};
`;

/**
 * ⚠ The command register — mono, verbatim, and wrapping rather than
 * truncating. An ellipsis here would hide the half of the command the
 * player most needs to see before sending it.
 */
const Command = styled.code`
  display: block;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  color: ${tokens.color.fgEmphasis};
  background: ${tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.sm};
  margin-bottom: ${tokens.space.lg};
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const Row = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
`;

const Button = styled.button<{ $primary?: boolean }>`
  flex: 1;
  min-height: 44px;
  border-radius: ${tokens.radius.sm};
  font: inherit;
  font-size: ${tokens.font.small};
  cursor: pointer;
  background: ${(p) =>
    p.$primary ? tokens.color.primary : "transparent"};
  color: ${(p) => (p.$primary ? tokens.color.onField : tokens.color.fg)};
  border: 1px solid
    ${(p) => (p.$primary ? tokens.color.primary : tokens.color.border)};
`;

interface CommandSheetProps {
  /** Send the confirmed command. The sheet closes itself either way. */
  onSend: (command: string) => void;
}

export const CommandSheet: React.FC<CommandSheetProps> = ({ onSend }) => {
  const command = useStore((s) => s.commandSheet);
  const close = useStore((s) => s.closeCommandSheet);
  if (command === null) return null;

  return (
    <Scrim
      data-testid="command-sheet-scrim"
      // Tapping the scrim dismisses. A sheet you can only escape by
      // finding its Cancel button is the one that gets confirmed by
      // accident.
      onClick={close}
    >
      <Sheet
        role="dialog"
        aria-label="Confirm command"
        data-testid="command-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <Label>This will send</Label>
        <Command data-testid="command-sheet-command">{command}</Command>
        <Row>
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            $primary
            data-testid="command-sheet-send"
            onClick={() => {
              // ⚠ Read from the slice, not from a closure captured at
              // render: the confirmed string must be the one on screen.
              onSend(command);
              close();
            }}
          >
            Send
          </Button>
        </Row>
      </Sheet>
    </Scrim>
  );
};
