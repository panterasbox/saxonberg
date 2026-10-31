/**
 * ButtonBar — explore on the phone (client-surface W6): the commands card
 * at line width. The exits first, then the top few things this place
 * affords, then "⋯" for the full list (the radial). Every button is a
 * real command. Chat has no button bar.
 */

import React from "react";
import styled from "styled-components";
import type { StuffDetailRecord } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import { tokens } from "../ui";
import { actionCommand, useLinkMode } from "../cards/clickTarget";

const Bar = styled.div`
  flex: none;
  display: flex;
  gap: ${tokens.space.xs};
  overflow-x: auto;
  padding: ${tokens.space.xs} ${tokens.space.md};
  border-top: 1px solid ${tokens.color.borderMuted};
`;

const Btn = styled.button<{ $exit?: boolean }>`
  flex: none;
  font: inherit;
  font-size: ${tokens.font.small};
  min-height: 44px;
  padding: 0 ${tokens.space.md};
  border: 1px solid ${(p) => (p.$exit ? tokens.color.accent : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fgEmphasis};
`;

/** How many of the place's own verbs ride the bar before "⋯". */
const TOP_VERBS = 3;

export function ButtonBar({
  onCommandClick,
}: {
  onCommandClick: (command: string) => void;
}): React.ReactElement | null {
  const cards = useStore((s) => s.cards);
  const openRadial = useStore((s) => s.openRadial);
  const here = Object.values(cards).find((c) => c.role === "here" && !c.closed);
  const record = here?.records[0] as StuffDetailRecord | undefined;
  const stuffId = record?.stuffId;
  const answer = useStore((s) => (stuffId ? s.affordances[stuffId] : undefined));
  const mode = useLinkMode();
  React.useEffect(() => {
    if (stuffId && !answer) websocketClient.resolveAffordances(stuffId);
  }, [stuffId, answer]);
  if (!record) return null;
  const exits = record.exits ?? [];
  const verbs = (answer?.verbs ?? [])
    .filter((v) => v.source === "subject" && v.state !== "disabled")
    .slice(0, TOP_VERBS);
  return (
    <Bar data-testid="button-bar">
      {exits.map((x) => (
        <Btn
          key={x.direction}
          type="button"
          $exit
          data-testid="button-exit"
          onClick={() => onCommandClick(`go ${x.direction}`)}
        >
          {x.direction}
        </Btn>
      ))}
      {verbs.map((v) => (
        <Btn
          key={v.verb}
          type="button"
          data-testid="button-verb"
          onClick={() => onCommandClick(actionCommand(v, stuffId, mode))}
        >
          {v.verb}
        </Btn>
      ))}
      <Btn
        type="button"
        aria-label="more things to do here"
        data-testid="button-more"
        onClick={() => openRadial({ stuffId: stuffId!, displayName: record.displayName ?? "here" })}
      >
        ⋯
      </Btn>
    </Bar>
  );
}
