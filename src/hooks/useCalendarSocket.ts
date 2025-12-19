// src/hooks/useCalendarSocket.ts
// Implementación con WebSocket REAL usando Socket.IO
import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

type Params = {
  tenantId: string | number | undefined;
  onAnyChange: (payload: { type: "created" | "updated" | "status"; data: any }) => void;
};

export default function useCalendarSocket({ tenantId, onAnyChange }: Params) {
  const socketRef = useRef<Socket | null>(null);
  const onAnyChangeRef = useRef(onAnyChange);

  // Mantener la referencia actualizada
  useEffect(() => {
    onAnyChangeRef.current = onAnyChange;
  }, [onAnyChange]);

  useEffect(() => {
    if (!tenantId) return;

    const wsUrl = process.env.REACT_APP_API_WS_URL || "http://localhost:3005";

    console.log(`🔌 [SOCKET] Conectando a ${wsUrl} para tenant ${tenantId}...`);

    // Crear conexión Socket.IO
    const socket = io(wsUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`✅ [SOCKET] Conectado! ID: ${socket.id}`);
      // Unirse al room del tenant
      socket.emit("join:tenant", tenantId);
    });

    socket.on("tenant:joined", (data) => {
      console.log(`🏠 [SOCKET] Unido al room:`, data);
    });

    // Escuchar eventos de citas
    socket.on("appointment:created", (data) => {
      console.log("📅 [SOCKET] Nueva cita creada:", data);
      onAnyChangeRef.current({ type: "created", data });
    });

    socket.on("appointment:updated", (data) => {
      console.log("📝 [SOCKET] Cita actualizada:", data);
      onAnyChangeRef.current({ type: "updated", data });
    });

    socket.on("appointment:status", (data) => {
      console.log("🔄 [SOCKET] Estado de cita cambiado:", data);
      onAnyChangeRef.current({ type: "status", data });
    });

    socket.on("disconnect", (reason) => {
      console.log(`⚡ [SOCKET] Desconectado:`, reason);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ [SOCKET] Error de conexión:", error.message);
    });

    // Cleanup al desmontar
    return () => {
      console.log("🛑 [SOCKET] Cerrando conexión...");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tenantId]);
}
