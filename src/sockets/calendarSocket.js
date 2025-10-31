// src/sockets/calendarSocket.js
import { io } from "socket.io-client";

let socket = null;

export function getSocket({ url, token } = {}) {
  if (!socket) {
    socket = io(url, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: token ? { token } : undefined,
    });

    socket.on("connect_error", (err) => {
      console.warn("WS connect_error:", err?.message);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
