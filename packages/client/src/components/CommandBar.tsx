/**
 * CommandBar - Command input component
 *
 * Text input with send button for entering game commands.
 * Handles Enter key to submit, clears input after send.
 */

import React, { useState } from 'react';
import styled from 'styled-components';

const BarContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: #2d2d2d;
  border-top: 1px solid #444;
`;

const Input = styled.input`
  flex: 1;
  padding: 0.5rem;
  background: #1e1e1e;
  color: #d4d4d4;
  border: 1px solid #444;
  font-family: 'Courier New', monospace;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #007acc;
  }
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background: #007acc;
  color: white;
  border: none;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 14px;

  &:hover {
    background: #005a9e;
  }

  &:active {
    background: #004578;
  }
`;

interface CommandBarProps {
  onSend: (text: string) => void;
}

export function CommandBar({ onSend }: CommandBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <BarContainer>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter command..."
        autoFocus
      />
      <Button onClick={handleSubmit}>Send</Button>
    </BarContainer>
  );
}
