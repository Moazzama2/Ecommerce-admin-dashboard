import { io } from 'socket.io-client';
import { getAccessToken } from './token';

// One shared Socket.io connection for the dashboard.
//
// Same-origin URL: in development the Vite proxy forwards /socket.io to
// the backend (ws: true), in production it's served by the API host.
//
// `auth` is a function, so socket.io asks for a token on EVERY
// (re)connect attempt — the server drops sockets when the 15-minute
// access token expires, and this hands it a fresh one automatically.
let socket = null;

export const connectSocket = () => {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io({
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    auth: (cb) => cb({ token: getAccessToken() }),
  });

  socket.connect();
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
