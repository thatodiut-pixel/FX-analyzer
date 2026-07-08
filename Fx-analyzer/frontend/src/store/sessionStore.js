'use client';
import { create } from 'zustand';

/**
 * sessionStore — User authentication, socket connection status, and model provider info.
 */
const useSessionStore = create((set) => ({
  // ── State ──────────────────────────────────────────────────────────
  user: null,
  isConnected: false,
  provider: 'openrouter',
  modelName: 'openrouter:google/gemma-4-26b-a4b-it:free',
  lastSignalTime: null,
  connectionError: null,

  // ── Actions ────────────────────────────────────────────────────────
  login: (user) =>
    set({
      user: {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'Trader',
        email: user.email,
        role: user.role || 'user',
        subscription: user.subscription || 'free',
      },
    }),

  logout: () =>
    set({
      user: null,
      isConnected: false,
      lastSignalTime: null,
      connectionError: null,
    }),

  setConnected: (connected) =>
    set({ isConnected: connected, connectionError: connected ? null : undefined }),

  setConnectionError: (error) =>
    set({ isConnected: false, connectionError: error }),

  setProvider: (provider) => set({ provider }),

  setModelName: (modelName) => set({ modelName }),

  setLastSignalTime: (timestamp) => set({ lastSignalTime: timestamp }),
}));

export default useSessionStore;
