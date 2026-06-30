/**
 * ForumLayout — the forum board view (the old `mainView === 'forum'`).
 *
 * The forum board in the primary column with the chat sidecar as the side
 * rail, plus a live-scene peek so a forum-reading player never goes dark
 * on live play (the never-blind law — a `world.*` scene frame surfaces as
 * a corner toast). The command bar persists at the column's foot.
 */

import React from "react";
import styled from "styled-components";
import type { LayoutProps } from "./types";
import { Cockpit, LeftColumn, tokens } from "./primitives";
import { ForumView } from "../components/ForumView";
import { ForumChatSidecar } from "../components/ForumChatSidecar";
import { CommandBar } from "../components/CommandBar";

/**
 * A live-scene peek so the player never goes dark on live play while the
 * forum view is active — the most recent in-world scene frame, stripped
 * of MML, as a corner toast.
 */
const ScenePeek = styled.div`
  position: absolute;
  bottom: 4.5rem;
  right: 1rem;
  max-width: 22rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderEmphasis};
  color: ${tokens.color.fgMuted};
  font-size: 0.85rem;
  pointer-events: none;
`;

export const ForumLayout: React.FC<LayoutProps> = ({
  frames,
  onSendCommand,
  onSendPromptResponse,
  onCancelPrompt,
  onCommandPreview,
}) => {
  // Most recent in-world scene frame, MML-stripped, for the peek toast.
  const scenePeek = React.useMemo(() => {
    for (let i = frames.length - 1; i >= 0; i--) {
      const f = frames[i]!;
      if (f.topic.startsWith("world.")) {
        return f.body
          .replace(/<[^>]+>/g, "")
          .trim()
          .slice(0, 160);
      }
    }
    return null;
  }, [frames]);

  return (
    <>
      <Cockpit>
        <LeftColumn>
          <ForumView
            onSendCommand={onSendCommand}
            onCommandPreview={onCommandPreview}
          />
          <CommandBar
            barId="forum"
            onSendCommand={onSendCommand}
            onSendPromptResponse={onSendPromptResponse}
            onCancelPrompt={onCancelPrompt}
          />
        </LeftColumn>
        <ForumChatSidecar onSendCommand={onSendCommand} />
      </Cockpit>
      {scenePeek && <ScenePeek>{scenePeek}</ScenePeek>}
    </>
  );
};
