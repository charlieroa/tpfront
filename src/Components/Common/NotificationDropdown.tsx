import React, { useState, useMemo } from 'react';
import { Col, Dropdown, DropdownMenu, DropdownToggle, Row } from 'reactstrap';
import { Link } from 'react-router-dom';
import SimpleBar from "simplebar-react";
import useNotifications, { AppointmentNotification } from '../../hooks/useNotifications';

// Función para formatear tiempo relativo
const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
};

// Formatear hora de cita
const formatAppointmentTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const NotificationDropdown = () => {
    const [isNotificationDropdown, setIsNotificationDropdown] = useState<boolean>(false);

    // Obtener tenantId del storage
    const tenantId = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem('authUser') || '{}');
            return user.tenant_id || user.tenantId;
        } catch {
            return undefined;
        }
    }, []);

    // Usar polling cada 30 segundos para detectar nuevas citas
    const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications({
        tenantId,
        pollingInterval: 30000, // 30 segundos
    });

    const toggleNotificationDropdown = () => {
        setIsNotificationDropdown(!isNotificationDropdown);
    };

    const handleNotificationClick = (notification: AppointmentNotification) => {
        markAsRead(notification.id);
    };

    return (
        <React.Fragment>
            <Dropdown isOpen={isNotificationDropdown} toggle={toggleNotificationDropdown} className="topbar-head-dropdown ms-1 header-item">
                <DropdownToggle type="button" tag="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle shadow-none">
                    <i className='bx bx-bell fs-22'></i>
                    {unreadCount > 0 && (
                        <span className="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">
                            {unreadCount > 9 ? '9+' : unreadCount}
                            <span className="visually-hidden">notificaciones sin leer</span>
                        </span>
                    )}
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-lg dropdown-menu-end p-0">
                    <div className="dropdown-head bg-primary bg-pattern rounded-top">
                        <div className="p-3">
                            <Row className="align-items-center">
                                <Col>
                                    <h6 className="m-0 fs-16 fw-semibold text-white">Notificaciones</h6>
                                </Col>
                                <div className="col-auto dropdown-tabs">
                                    <span className="badge bg-light-subtle text-body fs-13">
                                        {unreadCount} Nueva{unreadCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </Row>
                        </div>
                    </div>

                    <SimpleBar style={{ maxHeight: "300px" }} className="pe-2">
                        {notifications.length === 0 ? (
                            <div className="text-center py-4">
                                <i className="bx bx-bell-off fs-48 text-muted"></i>
                                <p className="text-muted mt-2 mb-0">No hay notificaciones</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`text-reset notification-item d-block dropdown-item position-relative ${!notification.read ? 'active' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="d-flex">
                                        <div className="avatar-xs me-3">
                                            <span className={`avatar-title ${notification.createdVia === 'whatsapp' ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'} rounded-circle fs-16`}>
                                                {notification.createdVia === 'whatsapp' ? (
                                                    <i className="ri-whatsapp-line"></i>
                                                ) : (
                                                    <i className="bx bx-calendar-check"></i>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex-grow-1">
                                            <Link to="/dashboard" className="stretched-link">
                                                <h6 className="mt-0 mb-1 fs-13 fw-semibold">
                                                    {notification.createdVia === 'whatsapp' ? '📱 ' : ''}
                                                    Nueva cita agendada
                                                </h6>
                                            </Link>
                                            <div className="fs-13 text-muted">
                                                <p className="mb-1">
                                                    <strong>{notification.clientName}</strong> - {notification.serviceName}
                                                </p>
                                                <p className="mb-1">
                                                    👤 {notification.stylistName} • 📅 {formatAppointmentTime(notification.startTime)}
                                                </p>
                                            </div>
                                            <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                                <span><i className="mdi mdi-clock-outline"></i> {getRelativeTime(notification.createdAt)}</span>
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="px-2">
                                                <span className="badge bg-primary">Nuevo</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </SimpleBar>

                    {notifications.length > 0 && (
                        <div className="p-2 border-top">
                            <div className="d-flex justify-content-between">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-soft-secondary"
                                    onClick={markAllAsRead}
                                >
                                    Marcar todas como leídas
                                </button>
                                <Link to="/dashboard" className="btn btn-sm btn-soft-success">
                                    Ver calendario <i className="ri-arrow-right-line align-middle"></i>
                                </Link>
                            </div>
                        </div>
                    )}
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default NotificationDropdown;