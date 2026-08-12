/**
 * Terminal - Game output display component
 *
 * Displays the typed frame buffer with auto-scroll to bottom on new
 * frames. Each frame routes through the per-message-type template
 * registry (`lib/templates/`), which picks `chat` / `say` / `tell` /
 * `emote` / `default` by topic prefix. Templates own layout
 * (chat's gutter + hanging indent); the inner MML rendering still
 * runs through `MmlRenderer` for click-routing.
 *
 * Sigils (input-echo prompt prefixes) are held separately on each
 * Frame and concatenated at render time, so the underlying body
 * stays clean for topic-keyed templates.
 *
 * Each row carries a `GutterStripe` colored by topic family for
 * visual delimitation; the stripe is the frame-inspection surface
 * (hover tooltip + click-action popover).
 */

import { useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { GutterStripe } from './GutterStripe';
import { ReactionBar, REVEAL_REACTION_ADD } from './ReactionBar';
import { useStore } from '../store';
import type { Frame } from '../store/index';
import { parseMml } from '../lib/mml/parseMml';
import { pickTemplate } from '../lib/templates/TemplateRegistry';
import { useStylesheet } from '../lib/style/useStylesheet';
import { tokens } from './ui';

const TerminalContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-size: 14px;
  /* The cross-register rhythm anchor — keep line-height HERE on the
     common ancestor, never per-register on Body, so a serif frame and
     a mono frame both advance the baseline at 1.5 × font-size and
     switching register can't jolt the vertical rhythm. font-size is
     likewise uniform across registers. (Bump this single value if the
     serif's x-height reads loose; it moves both registers together.)
     No font-family here: each frame's Body sets its own per register. */
  line-height: 1.5;
`;

const FrameRow = styled.div`
  display: flex;
  align-items: stretch;
  margin-bottom: 0.5rem;

  /* The reaction "+" affordance is hover-revealed (Slack/Discord model):
     it is visually hidden + focusable at rest (no footprint, but kept in
     the tab order — see ReactionBar's AddWrap), and reveals on row hover.
     Keyboard focus (:focus-within) and the open palette reveal it via
     AddWrap's own rules. The reaction chips render inline regardless. */
  &:hover .reaction-add {
    ${REVEAL_REACTION_ADD}
  }
`;

// Per-frame font register: the family is resolved from the frame's
// topic via the stylesheet's longest-prefix cascade and applied on this
// per-frame ancestor, so the template's inner spans inherit it. An
// element with its own font-family (`<pre>`/`<code>` in MmlRenderer)
// keeps that rule by CSS specificity, so code stays mono inside a
// proportional frame.
const Body = styled.div<{ $fontFamily: string }>`
  flex: 1;
  white-space: pre-wrap;
  font-family: ${(p) => p.$fontFamily};
`;

interface TerminalProps {
  frames: Frame[];
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
  viewerStuffId?: string;
}

export function Terminal({
  frames,
  onCommandClick,
  onCommandPreview,
  viewerStuffId,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Default the viewer's stuffId to the store's `selfAvatarId` so the
  // owning component doesn't have to pass it explicitly. Callers can
  // still override via prop if they want a different perspective
  // (e.g. inspection rendering of another player's view).
  const selfAvatarId = useStore((s) => s.selfAvatarId);
  const effectiveViewerId = viewerStuffId ?? selfAvatarId ?? undefined;
  const stylesheet = useStylesheet(effectiveViewerId ?? null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [frames]);

  // `data-testid` so the e2e theme drive can read the transcript's
  // RESOLVED colour. That assertion cannot live in the unit suite —
  // jsdom leaves `var()` unsubstituted — and it is the only check that
  // the transcript and the chrome resolved the same theme.
  return (
    <TerminalContainer ref={containerRef} data-testid="terminal">
      {frames.map((frame) => (
        <FrameRow key={frame.id}>
          <GutterStripe topic={frame.topic} timestamp={frame.timestamp} />
          <Body $fontFamily={stylesheet.fontFamilyForTopic(frame.topic)}>
            {frame.sigil ? `${frame.sigil} ` : ''}
            <FrameBody
              frame={frame}
              onCommandClick={onCommandClick}
              onCommandPreview={onCommandPreview}
              viewerStuffId={effectiveViewerId}
              stylesheet={stylesheet}
            />
            <ReactionBar
              frame={frame}
              onCommandClick={onCommandClick}
              onCommandPreview={onCommandPreview}
            />
          </Body>
        </FrameRow>
      ))}
    </TerminalContainer>
  );
}

interface FrameBodyProps {
  frame: Frame;
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
  viewerStuffId?: string;
  stylesheet: ReturnType<typeof useStylesheet>;
}

function FrameBody({
  frame,
  onCommandClick,
  onCommandPreview,
  viewerStuffId,
  stylesheet,
}: FrameBodyProps) {
  const tree = useMemo(() => parseMml(frame.body), [frame.body]);
  const template = pickTemplate(frame.topic);
  return template({
    frame,
    tree,
    stylesheet,
    onCommandClick,
    onCommandPreview,
    viewerStuffId,
  });
}
