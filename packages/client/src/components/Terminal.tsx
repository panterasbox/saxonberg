/**
 * Terminal - Game output display component
 *
 * Displays message buffer with auto-scroll to bottom on new messages.
 * Each message is rendered through `MmlRenderer`, which turns
 * semantic tags into clickable affordances that emit real commands
 * via `onCommandClick`. The slate's principle is command-bus
 * primacy — every click sends a command, no exceptions.
 */

import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { MmlRenderer } from './MmlRenderer';

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
  messages: string[];
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}

export function Terminal({
  messages,
  onCommandClick,
  onCommandPreview,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <TerminalContainer ref={containerRef}>
      {messages.map((msg, idx) => (
        <Message key={idx}>
          <MmlRenderer
            text={msg}
            onCommandClick={onCommandClick}
            onCommandPreview={onCommandPreview}
          />
        </Message>
      ))}
    </TerminalContainer>
  );
}
