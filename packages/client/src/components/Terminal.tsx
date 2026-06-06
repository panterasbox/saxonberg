/**
 * Terminal - Game output display component
 *
 * Displays the typed frame buffer with auto-scroll to bottom on new
 * frames. Each frame is rendered through `MmlRenderer`, which turns
 * semantic tags into clickable affordances that emit real commands
 * via `onCommandClick`. The slate's principle is command-bus
 * primacy — every click sends a command, no exceptions.
 *
 * Sigils (input-echo prompt prefixes) are held separately on each
 * Frame and concatenated at render time, so the underlying body
 * stays clean for topic-keyed renderers.
 */

import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { MmlRenderer } from './MmlRenderer';
import type { Frame } from '../store/index';

const TerminalContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
`;

const Message = styled.div`
  margin-bottom: 0.5rem;
  white-space: pre-wrap;
`;

interface TerminalProps {
  frames: Frame[];
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}

export function Terminal({
  frames,
  onCommandClick,
  onCommandPreview,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [frames]);

  return (
    <TerminalContainer ref={containerRef}>
      {frames.map((frame) => (
        <Message key={frame.id}>
          {frame.sigil ? `${frame.sigil} ` : ''}
          <MmlRenderer
            text={frame.body}
            onCommandClick={onCommandClick}
            onCommandPreview={onCommandPreview}
          />
        </Message>
      ))}
    </TerminalContainer>
  );
}
