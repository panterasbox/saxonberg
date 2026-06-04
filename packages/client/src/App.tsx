/**
 * App - Main application component
 *
 * Handles:
 * - Authentication flow
 * - WebSocket connection
 * - Terminal UI for game interaction
 */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useStore } from './store/index';
import { websocketClient } from './services/websocket';
import { ConnectionStatus } from './components/ConnectionStatus';
import { Terminal } from './components/Terminal';
import { CommandBar } from './components/CommandBar';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e1e1e;
`;

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
`;

const LoginMessage = styled.div`
  padding: 2rem;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 8px;
  text-align: center;
  max-width: 500px;
`;

const LoginTitle = styled.h1`
  margin: 0 0 1rem 0;
  font-size: 24px;
  color: #007acc;
`;

const LoginText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
`;

/**
 * App component.
 */
function App() {
  const auth = useStore((state) => state.auth);
  const connection = useStore((state) => state.connection);
  const [messages, setMessages] = useState<string[]>([]);
  // Single display value for the input. Three sources can drive it:
  //   1. The user typing (kept in userTypedRef as the canonical text).
  //   2. A hover preview from a clickable affordance (transient).
  //   3. The post-click flash showing the sent command (transient).
  // userTypedRef stays untouched during hover so we can restore it
  // on mouse-leave even if the user moved between adjacent
  // clickables. The restore is deferred by one tick so a leave →
  // enter sequence can cancel the pending restore.
  const [inputValue, setInputValue] = useState('');
  const [flashing, setFlashing] = useState(false);
  const userTypedRef = useRef('');
  const previewActiveRef = useRef(false);
  const restoreTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (restoreTimerRef.current !== null)
        window.clearTimeout(restoreTimerRef.current);
      if (flashTimerRef.current !== null)
        window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Check auth status on mount
    checkAuthStatus();

    // Check for auth callback
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('auth');

    if (authResult === 'success') {
      // Remove query param from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Check auth status and connect
      checkAuthStatus();
    } else if (authResult === 'failure') {
      console.error('Authentication failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Connect to WebSocket when authenticated
    if (auth.isAuthenticated && !connection.isConnected) {
      console.info('App: Authenticated - connecting to WebSocket...');
      websocketClient.connect('ws://localhost:2010');
    }
  }, [auth.isAuthenticated, connection.isConnected]);

  useEffect(() => {
    // Render every frame body the server sends. MML tags appear as
    // literal text for now (parsing deferred per §14). We listen on
    // the topics the v1 server actually emits to the terminal —
    // every `world.*` topic (in-fiction prose) and the `system.shell.*`
    // family (engine-talking-back-to-the-avatar), plus the
    // dispatcher-emitted `system.command.error` for framework-level
    // command failures (parse / MQL / validator / controller-throw)
    // so a bad command surfaces WHY without relying on envelope
    // rendering.
    const renderTopics = [
      'world.speech.say',
      'world.speech.tell',
      'world.perception.look',
      'world.perception.inventory',
      'world.perception.scry',
      'world.perception.locate',
      'world.narration.movement',
      'world.narration.teleport',
      'world.narration.action',
      'world.identity.change',
      'system.shell.fs',
      'system.shell.author',
      'system.shell.help',
      'system.shell.movement',
      'system.command.error',
      'system.log.command.info',
      'system.log.command.warn',
      'system.connection.established',
    ];
    const handle = (frame: { body: string }) => {
      if (frame.body) setMessages((prev) => [...prev, frame.body]);
    };
    for (const topic of renderTopics) {
      websocketClient.onTopic(topic, handle);
    }
    return () => {
      for (const topic of renderTopics) {
        websocketClient.offTopic(topic, handle);
      }
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:2010/auth/status', {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.isAuthenticated) {
        useStore.getState().setAuth({
          isAuthenticated: true,
          user: data.user || null,
          player: data.player || null,
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const sendCommand = (text: string) => {
    if (!websocketClient.isConnected()) {
      console.warn('Cannot send command: not connected');
      return;
    }

    websocketClient.send({
      type: 'command',
      payload: { text },
    });
  };

  /**
   * Mirror keystrokes into the canonical userTyped buffer and clear
   * any in-flight preview state (a keystroke ends a preview).
   */
  const handleInputChange = (value: string) => {
    if (previewActiveRef.current) {
      previewActiveRef.current = false;
      if (restoreTimerRef.current !== null) {
        window.clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
    }
    userTypedRef.current = value;
    setInputValue(value);
  };

  /**
   * Hover preview. `null` means "stop previewing" (mouseleave); a
   * string means "start previewing this command" (mouseenter). The
   * restore is deferred by one tick so an immediately-following
   * mouseenter on an adjacent clickable cancels it — without that,
   * a sweep across two affordances flashes the userTyped buffer
   * mid-transition.
   */
  const handleCommandPreview = (command: string | null) => {
    if (restoreTimerRef.current !== null) {
      window.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }
    if (command === null) {
      restoreTimerRef.current = window.setTimeout(() => {
        previewActiveRef.current = false;
        setInputValue(userTypedRef.current);
        restoreTimerRef.current = null;
      }, 0);
    } else {
      previewActiveRef.current = true;
      setInputValue(command);
    }
  };

  /**
   * Click-to-send: command-bus primacy. The input already shows the
   * command (via the preview) when the click lands. Send, flash for
   * 150ms, clear. Any user-typed buffer is also cleared — a click
   * commits to sending, so the prior typing is no longer relevant.
   */
  const handleCommandClick = (command: string) => {
    if (restoreTimerRef.current !== null) {
      window.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }
    previewActiveRef.current = false;
    userTypedRef.current = '';

    setInputValue(command);
    sendCommand(command);
    setFlashing(true);
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setFlashing(false);
      setInputValue('');
      flashTimerRef.current = null;
    }, 150);
  };

  useEffect(() => {
    // Debug hook: lets us inject a fake server message from the
    // browser console while semantic tag emission is still being
    // built out on the server. Example:
    //   __injectMessage('Exits: <exit dir="north">north</exit>, <exit dir="south">south</exit>.')
    const w = window as unknown as {
      __injectMessage?: (text: string) => void;
    };
    w.__injectMessage = (text: string) => {
      console.info('__injectMessage:', text);
      setMessages((prev) => [...prev, text]);
    };
    return () => {
      delete w.__injectMessage;
    };
  }, []);

  // Show login screen if not authenticated
  if (!auth.isAuthenticated) {
    return (
      <LoginContainer>
        <LoginMessage>
          <LoginTitle>Saxonberg 2.0</LoginTitle>
          <LoginText>
            Please log in with your Google account to enter the world.
            <br />
            <br />
            <a
              href="http://localhost:2010/auth/google"
              style={{ color: '#007acc', textDecoration: 'none' }}
            >
              Login with Google
            </a>
          </LoginText>
        </LoginMessage>
      </LoginContainer>
    );
  }

  // Show game UI when authenticated and connected
  return (
    <AppContainer>
      <ConnectionStatus />
      <Terminal
        messages={messages}
        onCommandClick={handleCommandClick}
        onCommandPreview={handleCommandPreview}
      />
      <CommandBar
        value={inputValue}
        onChange={handleInputChange}
        onSend={sendCommand}
        flashing={flashing}
      />
    </AppContainer>
  );
}

export default App;
