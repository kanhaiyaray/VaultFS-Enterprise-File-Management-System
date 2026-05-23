/**
 * hooks/useSocket.js
 * Provides a singleton Socket.IO connection for the current user.
 * Returns { on, off, emit, disconnect }.
 */
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let _socket = null; // Module-level singleton
let reconnectAttempts = 0;

function getSocket() {
  if (!_socket) {
    const token = localStorage.getItem("token");
    _socket = io(import.meta.env.VITE_SOCKET_URL || "", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    
    _socket.on("reconnect_attempt", () => {
      reconnectAttempts++;
      const newToken = localStorage.getItem("token");
      if (newToken && _socket) {
        _socket.auth = { token: newToken };
      }
    });
    
    _socket.on("reconnect", () => {
      reconnectAttempts = 0;
    });
  }
  return _socket;
}

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = getSocket();
    return () => {
      // Don't automatically disconnect on unmount — but allow manual disconnect
    };
  }, []);

  const on  = (event, handler) => getSocket().on(event, handler);
  const off = (event, handler) => getSocket().off(event, handler);
  const emit = (event, data)   => getSocket().emit(event, data);
  const disconnect = () => {
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
  };

  return { on, off, emit, disconnect };
}