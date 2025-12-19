// src/hooks/useCalendarSocket.ts
// MODIFICADO: Ahora usa polling en vez de WebSocket para mayor confiabilidad
import { useEffect, useRef } from "react";
import { api } from "../services/api";

type Params = {
  socketUrl?: string; // Ya no se usa, mantenido por compatibilidad
  tenantId: string | number | undefined;
  token?: string;
  onAnyChange: (payload: { type: "created" | "updated" | "status"; data: any }) => void;
  pollingInterval?: number; // En milisegundos, por defecto 30 segundos
};

export default function useCalendarSocket({
  tenantId,
  onAnyChange,
  pollingInterval = 30000
}: Params) {
  const lastCheckRef = useRef<Date>(new Date());
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tenantId) return;

    console.log(`🔄 [CALENDAR POLLING] Iniciando polling cada ${pollingInterval / 1000}s para tenant ${tenantId}`);

    const checkForNewAppointments = async () => {
      try {
        const response = await api.get(`/appointments/recent/${tenantId}?minutes=2`);
        const appointments = response.data.appointments || [];

        const lastCheck = lastCheckRef.current;
        let hasChanges = false;

        appointments.forEach((apt: any) => {
          const createdAt = new Date(apt.createdAt);
          if (createdAt > lastCheck && !seenIdsRef.current.has(apt.id)) {
            console.log('📅 [CALENDAR POLLING] Nueva cita detectada:', apt);
            seenIdsRef.current.add(apt.id);
            hasChanges = true;
          }
        });

        // Si hay cambios, notificar para refrescar el calendario
        if (hasChanges) {
          onAnyChange({ type: "created", data: { refresh: true } });
        }

        lastCheckRef.current = new Date();
      } catch (error) {
        console.warn('⚠️ [CALENDAR POLLING] Error:', error);
      }
    };

    // Verificar inmediatamente
    checkForNewAppointments();

    // Configurar intervalo
    const intervalId = setInterval(checkForNewAppointments, pollingInterval);

    return () => {
      console.log('🛑 [CALENDAR POLLING] Deteniendo polling');
      clearInterval(intervalId);
    };
  }, [tenantId, onAnyChange, pollingInterval]);
}
