/**
 * Zustand Store - Client-side state management
 *
 * Manages:
 * - Authentication state
 * - Connection state
 * - User actions
 */

import { create } from 'zustand';
import type {
  AuthState,
  ConnectionState,
  Pronouns,
} from '@saxonberg/types';

interface ConnectionEstablishedPayload {
  userId: string;
  socketId: string;
  sessionId: string;
  player: {
    _id: string;
    firstName: string;
    lastName: string;
    pronouns: Pronouns;
  };
}

/**
 * Combined store state.
 */
interface StoreState {
  // Auth state
  auth: AuthState;
  setAuth: (auth: Partial<AuthState>) => void;
  clearAuth: () => void;

  // Connection state
  connection: ConnectionState;
  setConnection: (connection: Partial<ConnectionState>) => void;
  setConnected: (payload: ConnectionEstablishedPayload) => void;
  setDisconnected: (error?: string) => void;
}

/**
 * Initial auth state.
 */
const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  player: null,
};

/**
 * Initial connection state.
 */
const initialConnectionState: ConnectionState = {
  isConnected: false,
  socketId: null,
  sessionId: null,
  error: null,
};

/**
 * Zustand store.
 */
export const useStore = create<StoreState>((set) => ({
  // Auth state
  auth: initialAuthState,

  setAuth: (auth) =>
    set((state) => ({
      auth: { ...state.auth, ...auth },
    })),

  clearAuth: () =>
    set({
      auth: initialAuthState,
    }),

  // Connection state
  connection: initialConnectionState,

  setConnection: (connection) =>
    set((state) => ({
      connection: { ...state.connection, ...connection },
    })),

  setConnected: (payload) =>
    set({
      connection: {
        isConnected: true,
        socketId: payload.socketId,
        sessionId: payload.sessionId,
        error: null,
      },
      auth: {
        isAuthenticated: true,
        user: {
          id: payload.userId,
          email: '',
          displayName: `${payload.player.firstName} ${payload.player.lastName}`,
        },
        player: payload.player,
      },
    }),

  setDisconnected: (error) =>
    set({
      connection: {
        isConnected: false,
        socketId: null,
        sessionId: null,
        error: error || null,
      },
    }),
}));
