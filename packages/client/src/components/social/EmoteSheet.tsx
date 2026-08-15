/**
 * EmoteSheet — the touch path to reacting.
 *
 * ⭐ **The hover affordance has to become a gesture.** Desktop hides the
 * bare `＋` until the row is hovered, which costs nothing and keeps a
 * quiet log quiet. Touch has no hover, and a permanent `＋` on every
 * frame is exactly the vertical spend the inline row was designed to
 * avoid — on a phone every row the chrome takes is a row the feed
 * loses. So the gesture is **long-press the frame**.
 *
 * ⚠ Only the *empty* case needs the gesture. An existing chip is its own
 * affordance and stays tappable where it sits; this sheet is how you
 * react to a frame nobody has reacted to yet.
 *
 * It renders the same {@link EmotePicker} the desktop popover does, so
 * an emote with grammar survives the phone rather than becoming
 * desktop-only.
 *
 * ⚠ Safe areas + `box-sizing` follow `CommandSheet` deliberately: a
 * fixed-width child inside an overflowing document widens the initial
 * containing block, which pushes `position: fixed` off-screen — and
 * jsdom cannot see it happen.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { EmotePicker } from "./EmotePicker";

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  z-index: 70;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: ${tokens.color.scrim};
`;

const Sheet = styled.div`
  box-sizing: border-box;
  background: ${tokens.color.surfaceAlt};
  border-top: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md} ${tokens.radius.md} 0 0;
  padding: ${tokens.space.md} ${tokens.space.md}
    calc(${tokens.space.lg} + env(safe-area-inset-bottom, 0px));
  overflow-x: hidden;
`;

const Close = styled.button`
  appearance: none;
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  background: transparent;
  color: ${tokens.color.fg};
  font: inherit;
  font-size: ${tokens.font.small};
  min-width: 44px;
  min-height: 32px;
  cursor: pointer;
`;

export interface EmoteSheetProps {
  /** The act being reacted to. */
  frameId: number;
  /** Verbs this viewer already reacted with. */
  mine: readonly string[];
  onSend: (command: string) => void;
  onClose: () => void;
}

export const EmoteSheet: React.FC<EmoteSheetProps> = ({
  frameId,
  mine,
  onSend,
  onClose,
}) => (
  <Scrim
    data-testid="emote-sheet-scrim"
    // Tapping the scrim dismisses. A sheet you can only escape by
    // finding its close button is the one that gets used by accident.
    onClick={onClose}
  >
    <Sheet
      data-testid="emote-sheet"
      onClick={(e) => e.stopPropagation()}
    >
      <EmotePicker
        frameId={frameId}
        mine={mine}
        onCommandClick={(c) => {
          onSend(c);
          onClose();
        }}
        /*
         * ⚠ A phone has no status bar preview, so the picker's own
         * verbatim command line IS the showing — there is nowhere else
         * for a hover to land. Deliberately a no-op rather than routed
         * to `ghostPreview`, which is a desktop surface.
         */
        onCommandPreview={() => undefined}
        trailing={<Close onClick={onClose}>✕</Close>}
      />
    </Sheet>
  </Scrim>
);
