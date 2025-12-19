// src/hooks/useNotifications.ts
import { useEffect, useCallback, useState } from "react";
import { getSocket } from "../sockets/calendarSocket";

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
    socketUrl: string;
    tenantId: string | undefined;
    token?: string;
}

export default function useNotifications({ socketUrl, tenantId, token }: UseNotificationsParams) {
    const [state, setState] = useState<NotificationsState>({
        notifications: [],
        unreadCount: 0,
    });

    const addNotification = useCallback((data: any) => {
        const notification: AppointmentNotification = {
            id: data.id,
            clientName: data.clientName || 'Cliente',
            stylistName: data.stylistName || 'Estilista',
            serviceName: data.serviceName || 'Servicio',
            startTime: data.startTime,
            createdVia: data.createdVia || 'web',
            createdAt: new Date(),
            read: false,
        };

        setState(prev => ({
            notifications: [notification, ...prev.notifications].slice(0, 20), // Máximo 20 notificaciones
            unreadCount: prev.unreadCount + 1,
        }));
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

    useEffect(() => {
        if (!socketUrl || !tenantId) return;

        const socket = getSocket({ url: socketUrl, token });

        // Unirse al room del tenant si no se ha hecho
        socket.emit("join:tenant", String(tenantId));

        // Escuchar eventos de citas
        const onAppointmentCreated = (data: any) => {
            console.log("📬 [NOTIFICATION] Nueva cita creada:", data);
            addNotification(data);
        };

        socket.on("appointment:created", onAppointmentCreated);

        return () => {
            socket.off("appointment:created", onAppointmentCreated);
        };
    }, [socketUrl, tenantId, token, addNotification]);

    return {
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
    };
}
