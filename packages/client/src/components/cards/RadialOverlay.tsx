/**
 * `RadialOverlay` — the radial's one mounting point.
 *
 * Rendered once, at the layout level, reading the open subject from the
 * store. ⭐ That is what lets the gesture live on `EntityName` and
 * therefore work on *every* named thing — the transcript, a card's
 * contents list, an exit, a roster row — rather than on whichever
 * surfaces remembered to thread a callback.
 *
 * ## ⭐ Picking a verb opens the subject's card
 *
 * *Cards are caused by what you just did.* Acting on something through
 * the radial is the clearest case of that there is, so the same click
 * that sends the verb opens a card about the thing it was aimed at.
 *
 * ⚠ Which card is derived from the subject's **active composition** —
 * the same resolver answer the radial is already showing. Not from the
 * verb: `look tomas` and `talk tomas` are both about a person, and a
 * verb-keyed rule would open an `instrument` card for `analyze tomas`.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";
import { AffordanceRadial } from "./AffordanceRadial";

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  background: ${tokens.color.scrim};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${tokens.space.lg};
  z-index: 40;
`;

const Holder = styled.div`
  max-width: 520px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

export interface RadialOverlayProps {
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

export function RadialOverlay({
  onSendCommand,
  onCommandPreview,
}: RadialOverlayProps): React.ReactElement | null {
  const subject = useStore((s) => s.radialSubject);
  const closeRadial = useStore((s) => s.closeRadial);
  React.useEffect(() => {
    if (!subject) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRadial();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [subject, closeRadial]);

  if (!subject) return null;

  const send = (text: string) => {
    /*
     * ⭐⭐ **The radial no longer opens a card; the COMMAND does.**
     *
     * It used to open one here, guessing the card KIND from the
     * subject's mixin composition — `Organism` → agent, `Container` →
     * manifest, everything else → instrument. That guess is gone with
     * the three cards it chose between: there is one subject card, and
     * whichever verb the player picked opens whatever card its own view
     * declares. A client inferring a card from a composition is the
     * same category error as a client inferring one from a changed
     * query result.
     */
    closeRadial();
    onSendCommand(text);
  };

  return (
    <Scrim
      data-testid="radial-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeRadial();
      }}
    >
      <Holder>
        <AffordanceRadial
          stuffId={subject.stuffId}
          displayName={subject.displayName}
          onSendCommand={send}
          onCommandPreview={onCommandPreview}
        />
      </Holder>
    </Scrim>
  );
}
