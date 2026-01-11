/**
 * App - Main application component
 *
 * Handles:
 * - Authentication flow
 * - WebSocket connection
 * - Echo test UI
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useStore } from './store/index.js';
import { websocketClient } from './services/websocket.js';
import { ConnectionStatus } from './components/ConnectionStatus.tsx';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 10px 0;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #6b7280;
  margin: 0;
`;

const Section = styled.section`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 15px 0;
`;

const EchoTestContainer = styled.div`
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #ffffff;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 10px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background-color: #3b82f6;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2563eb;
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

const InfoMessage = styled.div`
  padding: 15px;
  background-color: #dbeafe;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #1e40af;
  margin-top: 20px;
`;

/**
 * App component.
 */
function App() {
  const auth = useStore((state) => state.auth);
  const connection = useStore((state) => state.connection);
  const [echoMessage, setEchoMessage] = useState('Hello, server!');

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

  const handleEchoTest = () => {
    if (!connection.isConnected) {
      alert('Not connected to server');
      return;
    }

    websocketClient.sendEcho(echoMessage);
  };

  const handlePing = () => {
    if (!connection.isConnected) {
      alert('Not connected to server');
      return;
    }

    websocketClient.sendPing();
  };

  return (
    <Container>
      <Header>
        <Title>Saxonberg 2.0</Title>
        <Subtitle>Immersive Multiplayer Role-Playing Educational Platform</Subtitle>
      </Header>

      <Section>
        <ConnectionStatus />
      </Section>

      {auth.isAuthenticated && connection.isConnected && (
        <Section>
          <SectionTitle>Echo Test</SectionTitle>
          <EchoTestContainer>
            <Input
              type="text"
              value={echoMessage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEchoMessage(e.target.value)}
              placeholder="Enter message to echo..."
            />
            <Button onClick={handleEchoTest}>Send Echo</Button>{' '}
            <Button onClick={handlePing}>Send Ping</Button>
            <InfoMessage>
              Open browser console to see echo and ping responses.
            </InfoMessage>
          </EchoTestContainer>
        </Section>
      )}

      {!auth.isAuthenticated && (
        <Section>
          <InfoMessage>
            Please log in with your Google account to connect to the server.
          </InfoMessage>
        </Section>
      )}
    </Container>
  );
}

export default App;
