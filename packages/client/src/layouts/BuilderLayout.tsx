/**
 * BuilderLayout — the authoring cockpit.
 *
 * ⭐⭐ **The CMS stopped being a surface and became CARDS.** It shipped
 * as one `CmsSurface` with its own four-tab mode bar — Files · Kinds ·
 * Diagnostics · Git — which was a second switcher, in the second
 * column, doing exactly what the right column's switcher did and for
 * the same expired reason. `cms`, `git` and `studio` are catalogue
 * cards now, opened by their own verbs, living in one feed with one
 * lifetime rule and one pin.
 *
 * A Monitor split (the composition grammar): the card feed is the
 * dominant work surface, with a glance terminal + command bar as a
 * narrow rail so live play stays legible and typeable while you author
 * (never-blind).
 *
 * ⚠ The feed FILLS its column here rather than sitting at the rail's
 * fixed 360px. That is a layout decision, not a card one: in `build`
 * mode the cards ARE the work, and Monaco in a 360px rail would be a
 * surface that technically rendered.
 */

import React from "react";
import type { LayoutProps } from "./types";
import { Cockpit, SideColumn } from "./primitives";
import { CardFeed } from "../components/cards/CardFeed";
import { Terminal } from "../components/Terminal";
import { CommandBar } from "../components/CommandBar";

export const BuilderLayout: React.FC<LayoutProps> = ({
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandClick,
  onCommandPreview,
  resultDisplay,
}) => {
  return (
    <Cockpit>
      {/*
        ⚠ `compact` means *fill the slot*, not *this is a phone*. The
        prop is named for the viewport that first needed it; what it
        controls is whether the feed declares a fixed width.
      */}
      <CardFeed
        onSendCommand={onCommandClick}
        onCommandPreview={onCommandPreview}
        compact
        resultDisplay={resultDisplay}
      />
      <SideColumn $wide>
        <Terminal
          frames={frames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
        <CommandBar
          barId="builder"
          onSendCommand={onSendCommand}
          onSendPromptResponse={onSendPromptResponse}
          onCancelPrompt={onCancelPrompt}
        />
      </SideColumn>
    </Cockpit>
  );
};
