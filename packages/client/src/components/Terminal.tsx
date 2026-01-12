/**
 * Terminal - Game output display component
 *
 * Displays message buffer with auto-scroll to bottom on new messages.
 * Phase 3: Simple text rendering
 * Phase 4+: Rich MML (Mud Markup Language) formatting
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

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
}

export function Terminal({ messages }: TerminalProps) {
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
        <Message key={idx}>{msg}</Message>
      ))}
    </TerminalContainer>
  );
}
