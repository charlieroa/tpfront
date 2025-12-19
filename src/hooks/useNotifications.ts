// src/hooks/useNotifications.ts
import { useEffect, useCallback, useState, useRef } from "react";
import { api } from "../services/api";

export interface AppointmentNotification {
    id: string;
    clientName: string;
    stylistName: string;
    serviceName: string;
    startTime: string;
    createdVia: 'whatsapp' | 'web' | 'manual';
    createdAt: Date;
    read: boolean;
}

type NotificationsState = {
    notifications: AppointmentNotification[];
    unreadCount: number;
};

interface UseNotificationsParams {
    tenantId: string | undefined;
    pollingInterval?: number; // En milisegundos, por defecto 30 segundos
}

export default function useNotifications({ tenantId, pollingInterval = 30000 }: UseNotificationsParams) {
    const [state, setState] = useState<NotificationsState>({
        notifications: [],
        unreadCount: 0,
    });
    const seenIdsRef = useRef<Set<string>>(new Set());
    const lastPollRef = useRef<Date>(new Date());

    const addNotification = useCallback((data: any) => {
        // Evitar duplicados
        if (seenIdsRef.current.has(data.id)) {
            return;
        }
        seenIdsRef.current.add(data.id);

        const notification: AppointmentNotification = {
            id: data.id,
            clientName: data.clientName || 'Cliente',
            stylistName: data.stylistName || 'Estilista',
            serviceName: data.serviceName || 'Servicio',
            startTime: data.startTime,
            createdVia: data.createdVia || 'whatsapp',
            createdAt: new Date(data.createdAt || Date.now()),
            read: false,
        };

        setState(prev => ({
            notifications: [notification, ...prev.notifications].slice(0, 20),
            unreadCount: prev.unreadCount + 1,
        }));

        // Mostrar notificación del navegador si está permitido
        if (Notification.permission === 'granted') {
            new Notification('📅 Nueva cita agendada', {
                body: `${data.clientName} - ${data.serviceName} con ${data.stylistName}`,
                icon: '/favicon.ico',
                tag: data.id, // Evita duplicados de notificación del navegador
            });
        }
    }, []);

    const markAsRead = useCallback((notificationId: string) => {
        setState(prev => ({
            ...prev,
            notifications: prev.notifications.map(n =>
                n.id === notificationId ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
    }, []);

    const markAllAsRead = useCallback(() => {
        setState(prev => ({
            ...prev,
            notifications: prev.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0,
        }));
    }, []);

    const clearAll = useCallback(() => {
        setState({ notifications: [], unreadCount: 0 });
    }, []);

    // Polling para obtener citas recientes
    const pollRecentAppointments = useCallback(async () => {
        if (!tenantId) return;

        try {
            const response = await api.get(`/appointments/recent/${tenantId}?minutes=2`);
            const appointments = response.data.appointments || [];

            // Solo agregar citas creadas después del último polling
            const lastPoll = lastPollRef.current;
            appointments.forEach((apt: any) => {
                const createdAt = new Date(apt.createdAt);
                if (createdAt > lastPoll && !seenIdsRef.current.has(apt.id)) {
                    console.log('📬 [POLLING] Nueva cita detectada:', apt);
                    addNotification(apt);
                }
            });

            lastPollRef.current = new Date();
        } catch (error) {
            console.warn('⚠️ [POLLING] Error al consultar citas recientes:', error);
        }
    }, [tenantId, addNotification]);

    // Solicitar permiso de notificaciones
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Iniciar polling
    useEffect(() => {
        if (!tenantId) return;

        console.log(`🔄 [POLLING] Iniciando polling de notificaciones cada ${pollingInterval / 1000}s para tenant ${tenantId}`);

        // Poll inmediatamente al iniciar
        pollRecentAppointments();

        // Configurar intervalo de polling
        const intervalId = setInterval(pollRecentAppointments, pollingInterval);

        return () => {
            console.log('🛑 [POLLING] Deteniendo polling de notificaciones');
            clearInterval(intervalId);
        };
    }, [tenantId, pollingInterval, pollRecentAppointments]);

    return {
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        refresh: pollRecentAppointments, // Permite forzar un refresh manual
    };
}
