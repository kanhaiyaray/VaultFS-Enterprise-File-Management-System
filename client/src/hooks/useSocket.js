/**
 * hooks/useSocket.js
 * Provides a singleton Socket.IO connection for the current user.
 * Returns { on, off, emit, disconnect }.
 */
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let _socket = null;
let reconnectAttempts = 0;

function getSocket() {
  if (!_socket) {
    const token = localStorage.getItem("token");
    // Use VITE_SOCKET_URL if set, otherwise fallback to VITE_API_URL
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "";

    _socket = io(socketUrl, {
      auth: { token },
      // 👇 Order matters: polling first as fallback, then websocket
      transports: ["polling", "websocket"],
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

  // ── Handle bfcache ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handlePageHide = () => {
      // Gracefully close the socket before the page is cached
      if (_socket && _socket.connected) {
        _socket.disconnect();
      }
    };

    const handlePageShow = (event) => {
      // If the page was restored from bfcache, reconnect if needed
      if (event.persisted) {
        const socket = getSocket();
        if (socket && socket.disconnected) {
          socket.connect();
        }
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  // ── Existing socket instance ──────────────────────────────────────────────
  useEffect(() => {
    socketRef.current = getSocket();
    return () => {
      // Don't disconnect on unmount; keep singleton alive
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