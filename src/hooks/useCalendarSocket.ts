// src/hooks/useCalendarSocket.ts
import { useEffect } from "react";
import { getSocket } from "../sockets/calendarSocket";

type Params = {
  socketUrl: string;
  tenantId: string | number | undefined;
  token?: string; // opcional si luego envías JWT
  onAnyChange: (payload: { type: "created"|"updated"|"status"; data: any }) => void;
};

export default function useCalendarSocket({ socketUrl, tenantId, token, onAnyChange }: Params) {
  useEffect(() => {
    if (!socketUrl || !tenantId) return;

    const s = getSocket({ url: socketUrl, token });

    // Unirse al room del tenant
    s.emit("join:tenant", String(tenantId));

    const onCreated = (data: any) => onAnyChange({ type: "created", data });
    const onUpdated = (data: any) => onAnyChange({ type: "updated", data });
    const onStatus  = (data: any) => onAnyChange({ type: "status",  data });

    s.on("appointment:created", onCreated);
    s.on("appointment:updated", onUpdated);
    s.on("appointment:status",  onStatus);

    return () => {
      s.off("appointment:created", onCreated);
      s.off("appointment:updated", onUpdated);
      s.off("appointment:status",  onStatus);
    };
  }, [socketUrl, tenantId, token, onAnyChange]);
}
