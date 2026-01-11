/**
 * ConnectionStatus - Display connection and auth status
 *
 * Shows:
 * - Authentication status
 * - Connection status
 * - User/player information
 * - Login/logout buttons
 */

import React from 'react';
import styled from 'styled-components';
import { useStore } from '../store/index';

const Container = styled.div`
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const StatusLabel = styled.span`
  font-weight: 500;
  min-width: 120px;
`;

const StatusValue = styled.span<{ $status?: 'success' | 'error' | 'warning' }>`
  color: ${(props: { $status?: 'success' | 'error' | 'warning' }) => {
    switch (props.$status) {
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  }};
  font-weight: 500;
`;

const Button = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background-color: ${(props: { $variant?: 'primary' | 'danger' }) =>
    props.$variant === 'danger' ? '#ef4444' : '#3b82f6'};
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${(props: { $variant?: 'primary' | 'danger' }) =>
      props.$variant === 'danger' ? '#dc2626' : '#2563eb'};
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
`;

const ErrorMessage = styled.div`
  padding: 10px;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 6px;
  color: #991b1b;
  margin-top: 10px;
`;

/**
 * ConnectionStatus component.
 */
export const ConnectionStatus: React.FC = () => {
  const auth = useStore((state) => state.auth);
  const connection = useStore((state) => state.connection);

  const handleLogin = () => {
    // Redirect to OAuth endpoint
    window.location.href = 'http://localhost:2010/auth/google';
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:2010/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // Clear store and reload
        useStore.getState().clearAuth();
        useStore.getState().setDisconnected();
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Container>
      <Title>Status</Title>

      <StatusRow>
        <StatusLabel>Authentication:</StatusLabel>
        <StatusValue $status={auth.isAuthenticated ? 'success' : 'error'}>
          {auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
        </StatusValue>
      </StatusRow>

      <StatusRow>
        <StatusLabel>Connection:</StatusLabel>
        <StatusValue $status={connection.isConnected ? 'success' : 'error'}>
          {connection.isConnected ? 'Connected' : 'Disconnected'}
        </StatusValue>
      </StatusRow>

      {auth.player && (
        <>
          <StatusRow>
            <StatusLabel>Character:</StatusLabel>
            <StatusValue $status="success">
              {auth.player.firstName} {auth.player.lastName}
            </StatusValue>
          </StatusRow>

          <StatusRow>
            <StatusLabel>Pronouns:</StatusLabel>
            <StatusValue>{auth.player.pronouns}</StatusValue>
          </StatusRow>
        </>
      )}

      {connection.socketId && (
        <StatusRow>
          <StatusLabel>Socket ID:</StatusLabel>
          <StatusValue>{connection.socketId.substring(0, 16)}...</StatusValue>
        </StatusRow>
      )}

      {connection.error && <ErrorMessage>{connection.error}</ErrorMessage>}

      <ButtonGroup>
        {!auth.isAuthenticated ? (
          <Button onClick={handleLogin}>Login with Google</Button>
        ) : (
          <Button $variant="danger" onClick={handleLogout}>
            Logout
          </Button>
        )}
      </ButtonGroup>
    </Container>
  );
};
