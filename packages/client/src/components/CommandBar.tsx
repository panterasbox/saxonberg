/**
 * CommandBar - Command input component with history
 *
 * Text input with send button for entering game commands.
 * Features:
 * - Enter key to submit
 * - Up/Down arrow keys for command history navigation
 * - Escape key to clear input
 * - History persisted to localStorage
 */

import React, { useState, useEffect } from 'react';
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

const HISTORY_KEY = 'saxonberg-command-history';
const MAX_HISTORY = 100;

export function CommandBar({ onSend }: CommandBarProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse command history:', e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }, [history]);

  const handleSubmit = () => {
    if (input.trim()) {
      const command = input.trim();
      onSend(command);

      // Add to history (avoid consecutive duplicates)
      setHistory((prev) => {
        const filtered = prev[0] === command ? prev : [command, ...prev];
        return filtered.slice(0, MAX_HISTORY);
      });

      setInput('');
      setHistoryIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Move backward in history (toward older commands)
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Move forward in history (toward newer commands)
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      } else if (historyIndex === 0) {
        // At newest command, clear input
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setInput('');
      setHistoryIndex(-1);
    }
  };

  return (
    <BarContainer>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter command..."
        autoFocus
      />
      <Button onClick={handleSubmit}>Send</Button>
    </BarContainer>
  );
}
