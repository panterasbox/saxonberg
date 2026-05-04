/**
 * App - Main application component
 *
 * Handles:
 * - Authentication flow
 * - WebSocket connection
 * - Terminal UI for game interaction
 */

import React, { useEffect, useState } from 'react';
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
      console.log('App: Authenticated - connecting to WebSocket...');
      websocketClient.connect('ws://localhost:2010');
    }
  }, [auth.isAuthenticated, connection.isConnected]);

  useEffect(() => {
    // Render every frame body the server sends. MML tags appear as
    // literal text for now (parsing deferred per §14). We listen on
    // the topics the v1 server actually emits to the terminal.
    const renderTopics = [
      'world.speech.say',
      'world.speech.tell',
      'world.perception.look',
      'world.perception.inventory',
      'world.narration.movement',
      'world.narration.teleport',
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
      <Terminal messages={messages} />
      <CommandBar onSend={sendCommand} />
    </AppContainer>
  );
}

export default App;
