/**
 * `PromptFormatBar` — the at-rest occupant of the prompt slot, and the
 * chips that edit it.
 *
 * ## ⚠ The prompt is rendered SERVER-side, and always was
 *
 * `prompt.format` is a Liquid template the player owns, and
 * `PromptApi.renderPromptRefresh` renders it into a `PromptRefreshNote`
 * after every command. The record-layer plan flags this explicitly:
 * *"the slate's `prompt.format` is not rendered client-side is a CLIENT
 * observation. There is no server work here; it was in this build's
 * scope by mistake."* So the client's whole job is **displaying the
 * note it already receives** — this component renders `basePrompt` and
 * never evaluates a template.
 *
 * ## The chips
 *
 * Each token chip sends a real `settings set prompt.format …` command,
 * appending the token to the current format. ⭐ Not a local edit and
 * not a preview: `prompt.format` is a persisted setting, so the chip
 * that changes it has to be the same act as typing the command — which
 * is also what makes it aliasable and scriptable.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../store/index";
import { tokens } from "./ui";

/**
 * The tokens `prompt.format`'s context exposes.
 *
 * ⚠ This is a CLIENT convenience list, not a claim about the template
 * language. A token the server does not resolve renders as itself,
 * which is Liquid's own behaviour and is honest; the chips exist to
 * save typing, not to certify a vocabulary.
 */
const TOKENS = ["{{ focus }}", "{{ posture }}", "{{ time }}", "{{ hp }}"];

const Bar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.xs} ${tokens.space.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const Rendered = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fg};
`;

const Chip = styled.button`
  font: inherit;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  cursor: pointer;
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgDim};
  padding: 0 ${tokens.space.xs};
  min-height: 44px;

  &:hover {
    border-color: ${tokens.color.fgEmphasis};
    color: ${tokens.color.fg};
  }
`;

export interface PromptFormatBarProps {
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
  /**
   * Phone layout — the four token chips collapse behind one control.
   *
   * ⚠ Found by driving at 390px. The chips wrap onto three rows there,
   * so this bar plus the routing toggle were holding **~180px of an
   * 844px screen permanently above the input** — over a fifth of the
   * phone, given to two controls that EDIT SETTINGS rather than play.
   * The rendered prompt stays (it is information); appending a token to
   * your format is a settings act and can cost a tap.
   *
   * ⭐ The toggle is honest about being local: it changes what this
   * strip shows and nothing else, so it carries no command preview —
   * the same line `open <feed>` and the tab strip sit on.
   */
  compact?: boolean;
}

/**
 * The command a chip sends — appending the token to the current format.
 *
 * ⚠ Quoted, because a Liquid template contains braces and spaces that
 * the command tokenizer would otherwise split.
 */
export function commandForToken(current: string, token: string): string {
  return `settings set prompt.format "${current}${token}"`;
}

export function PromptFormatBar({
  onSendCommand,
  onCommandPreview,
  compact = false,
}: PromptFormatBarProps): React.ReactElement {
  // What the SERVER rendered. Never re-evaluated here.
  const basePrompt = useStore((s) => s.basePrompt);
  const clientState = useStore((s) => s.clientState);
  const preview = onCommandPreview ?? (() => undefined);
  const [expanded, setExpanded] = React.useState(false);
  const current =
    typeof clientState["prompt.format"] === "string"
      ? (clientState["prompt.format"] as string)
      : "";
  const showTokens = !compact || expanded;

  return (
    <Bar data-testid="prompt-format-bar">
      <span>prompt</span>
      <Rendered data-testid="prompt-format-rendered">{basePrompt}</Rendered>
      {compact && (
        <Chip
          data-testid="prompt-format-toggle"
          aria-label={
            expanded ? "hide prompt format tokens" : "edit prompt format"
          }
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "×" : "⋯"}
        </Chip>
      )}
      {showTokens &&
        TOKENS.map((token) => {
          const command = commandForToken(current, token);
          return (
            <Chip
              key={token}
              title={`Click to send: ${command}`}
              aria-label={command}
              onClick={() => onSendCommand(command)}
              onMouseEnter={() => preview(command)}
              onMouseLeave={() => preview(null)}
            >
              {token}
            </Chip>
          );
        })}
    </Bar>
  );
}
