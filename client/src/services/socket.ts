import { io, Socket } from 'socket.io-client';

const DEFAULT_BACKEND_URL = 'https://regionguard-backend.onrender.com';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : DEFAULT_BACKEND_URL);

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});
