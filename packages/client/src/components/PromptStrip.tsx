/**
 * `PromptStrip` — the WAITING queue, above the one input slot.
 *
 * ## One slot, three occupants
 *
 * At rest the slot renders `prompt.format` (already rendered
 * server-side — the client displays the note it receives). A
 * **foreground** prompt takes the slot. **Everything else waits here**,
 * so a guild vote arriving mid-forge joins the queue without seizing
 * input.
 *
 * ## ⚠⚠ Two cancels, and they are different verbs
 *
 * - The **×** on one card is `prompt-cancel` — *this one*. It goes
 *   over the prompt channel, not the command bus.
 * - **`prompt cancel`** on the strip is the VERB — *all of them*. It
 *   rides the command bus like everything else.
 *
 * Conflating them would make "I am done with this question" and "I am
 * done with every question" one gesture.
 *
 * ## ⚠⚠ The button names the command that dies
 *
 * Cancelling is not dismissing a dialog. It **rejects the awaiting
 * command** with `PromptCancelledError` — the verb the player ran stops
 * and unwinds. So *"cancel"* alone is a lie about what it does, and the
 * card says `Cancelling abandons \`true rim\`` instead.
 *
 * ⚠ Where the server could not say who asked (a prompt pushed outside a
 * command frame), the card says so rather than inventing a name. An
 * unattributed prompt is a real state; a fabricated attribution is a
 * defect.
 *
 * ## ⚠ Failure is not dismissal
 *
 * A validator returning a string emits `prompt-validation-failed` and
 * **the prompt stays alive**. This strip renders the error beside the
 * still-live card; nothing here clears an answer.
 */

import React from "react";
import styled from "styled-components";
import { useStore, type PromptEntry } from "../store/index";
import { tokens } from "./ui";

/** The badge each prompt kind wears. */
const KIND_BADGE: Readonly<Record<PromptEntry["kind"], string>> = {
  choice: "CHOICE",
  confirm: "CONFIRM",
  text: "TEXT",
  compose: "COMPOSE",
  "mql-object": "MQL-ONE",
  "mql-many": "MQL-MANY",
};

const Strip = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-top: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
`;

const Label = styled.span`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
`;

const CancelAll = styled.button`
  margin-left: auto;
  font: inherit;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  cursor: pointer;
  background: transparent;
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgMuted};
  padding: 0 ${tokens.space.sm};
  min-height: 44px;

  &:hover {
    color: ${tokens.color.fg};
    border-color: ${tokens.color.fgMuted};
  }
`;

const Card = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.space.sm};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surface};
  padding: ${tokens.space.sm};
`;

const Badge = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  letter-spacing: 0.06em;
  color: ${tokens.color.fgMuted};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  padding: 0 ${tokens.space.xs};
  white-space: nowrap;
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  overflow-wrap: anywhere;
`;

/** The waiting command, in the machine voice. It is a command, so mono. */
const Asked = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgEmphasis};
  overflow-wrap: anywhere;
`;

const Meta = styled.div`
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const Error = styled.div`
  font-size: ${tokens.font.label};
  color: ${tokens.color.danger};
`;

const Dismiss = styled.button`
  font: inherit;
  font-size: ${tokens.font.label};
  cursor: pointer;
  background: transparent;
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgMuted};
  padding: 0 ${tokens.space.xs};
  min-height: 44px;
  white-space: nowrap;

  &:hover {
    color: ${tokens.color.danger};
    border-color: ${tokens.color.danger};
  }
`;

/** How long a prompt has waited, in the coarsest true unit. */
export function elapsedLabel(askedAt: number | undefined, now: number): string {
  if (askedAt === undefined) return "";
  const s = Math.max(0, Math.round((now - askedAt) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

/**
 * What cancelling this prompt abandons, in words.
 *
 * ⭐ The whole point of `askedBy` riding the envelope. Where it is
 * absent the sentence says so — *"Cancelling abandons the command that
 * asked"* — rather than naming something the server never claimed.
 */
export function cancelSentence(entry: PromptEntry): string {
  return entry.askedBy
    ? `Cancelling abandons \`${entry.askedBy}\` — not just this card.`
    : "Cancelling abandons the command that asked — not just this card.";
}

export interface PromptStripProps {
  /** `prompt-cancel` for ONE prompt — the prompt channel, not the bus. */
  onCancelPrompt: (promptId: string) => void;
  /** `prompt cancel` — the VERB, over the command bus. All of them. */
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

export function PromptStrip({
  onCancelPrompt,
  onSendCommand,
  onCommandPreview,
}: PromptStripProps): React.ReactElement | null {
  const prompts = useStore((s) => s.prompts);
  const activeSlot = useStore((s) => s.activeSlot);
  const preview = onCommandPreview ?? (() => undefined);

  /*
   * ⚠ A ticking clock, not a timestamp resolved once. "22m" is only
   * true for a minute; a value computed at mount would be quietly wrong
   * for as long as the prompt waits — which, for a background prompt,
   * is exactly the interesting case.
   */
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (prompts.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [prompts.length]);

  // Everything except whatever currently holds the input slot: the
  // strip is the QUEUE, and showing the occupant twice would make the
  // depth badge lie about how many are waiting.
  const waiting = prompts.filter((p) => p.promptId !== activeSlot);
  if (waiting.length === 0) return null;

  return (
    <Strip data-testid="prompt-strip">
      <Head>
        <Label>Waiting</Label>
        <Meta data-testid="prompt-waiting-count">{waiting.length}</Meta>
        {/*
          ⚠⚠ The VERB, over the command bus — all of them. Distinct from
          the × on a card, which is `prompt-cancel` and means this one.
        */}
        <CancelAll
          title="Click to send: prompt cancel"
          aria-label="prompt cancel"
          onClick={() => onSendCommand("prompt cancel")}
          onMouseEnter={() => preview("prompt cancel")}
          onMouseLeave={() => preview(null)}
        >
          prompt cancel
        </CancelAll>
      </Head>

      {waiting.map((entry) => (
        <Card key={entry.promptId} data-testid={`prompt-card-${entry.promptId}`}>
          <Badge>{KIND_BADGE[entry.kind]}</Badge>
          <Body>
            <Title>{entry.label}</Title>
            {entry.askedBy ? (
              <Asked data-testid="prompt-asked-by">
                ASKED BY {entry.askedBy}
              </Asked>
            ) : (
              // ⚠ An honest absence. The server could not say who asked,
              // so neither does this.
              <Meta data-testid="prompt-asked-by-unknown">
                asked outside a command
              </Meta>
            )}
            <Meta>
              {[
                elapsedLabel(entry.askedAt, now),
                entry.foreground ? "foreground" : "background",
                "waiting",
              ]
                .filter(Boolean)
                .join(" · ")}
            </Meta>
            {/*
              ⚠ Failure is not dismissal. A validation error renders on a
              card that is still alive, and nothing here clears the
              player's answer.
            */}
            {entry.validationError && (
              <Error data-testid="prompt-validation-error">
                {entry.validationError}
              </Error>
            )}
          </Body>
          <Dismiss
            aria-label={cancelSentence(entry)}
            title={cancelSentence(entry)}
            onClick={() => onCancelPrompt(entry.promptId)}
          >
            × {entry.askedBy ?? "cancel"}
          </Dismiss>
        </Card>
      ))}
    </Strip>
  );
}
