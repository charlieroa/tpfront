import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Card, CardBody, Col, Container, Row, Badge, Spinner, Input, Progress, Button
} from 'reactstrap';
import { useDispatch, useSelector } from 'react-redux';
import { getCalendarData, fetchAvailableStylists } from '../../slices/thunks';
import axios from 'axios';

// =================================================================================
// 1. TARJETAS VISUALES
// =================================================================================

const BusyStylistCard = ({ stylist, currentServiceId }: { stylist: any, currentServiceId: string }) => {
    const initial = stylist.name ? stylist.name.charAt(0).toUpperCase() : "?";
    const isInProgress = stylist.timeRemaining !== undefined;
    const isOtherService = stylist.serviceId && String(stylist.serviceId) !== String(currentServiceId);

    const progressValue = useMemo(() => {
        const val = Number(stylist.progress);
        if (Number.isNaN(val)) return 0;
        return Math.min(100, Math.max(0, val));
    }, [stylist.progress]);

    return (
        <Card className="border border-danger shadow-none mb-2 overflow-hidden bg-white">
            <div className="bg-danger position-absolute w-100 h-100" style={{ opacity: 0.08, zIndex: 0 }}></div>
            <CardBody className="p-2 position-relative">
                <div className="d-flex align-items-center">
                    <div className="avatar-xs flex-shrink-0 me-2">
                        <span className="avatar-title rounded bg-danger text-white fw-bold fs-10">
                            {initial}
                        </span>
                    </div>
                    <div className="flex-grow-1 overflow-hidden">
                        <h6 className="fs-13 mb-0 text-truncate fw-bold text-dark">{stylist.name}</h6>
                        <div className="d-flex align-items-center text-muted fs-11">
                            <i className="ri-user-line me-1 text-danger"></i>
                            <span className="text-truncate">{stylist.clientName}</span>
                        </div>
                        {isOtherService && stylist.serviceName && (
                            <div className="d-flex align-items-center fs-10 text-danger mt-1">
                                <i className="ri-scissors-cut-line me-1"></i>
                                <span className="text-truncate fst-italic">En: {stylist.serviceName}</span>
                            </div>
                        )}
                    </div>
                    <div className="text-end">
                        {isInProgress ? (
                            <Badge color="danger" className="fs-10">
                                <i className="ri-timer-line me-1"></i>
                                {stylist.timeRemaining}m restantes
                            </Badge>
                        ) : (
                            <>
                                <Badge color="danger" className="fs-10">
                                    <i className="ri-time-line me-1"></i>
                                    {stylist.startsIn}
                                </Badge>
                                <div className="fs-10 text-muted mt-1">
                                    {stylist.startTime}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {isInProgress && (
                    <>
                        <Progress
                            value={progressValue}
                            color="danger"
                            style={{ height: "6px" }}
                            className="mt-2 bg-danger-subtle"
                        />
                        <div className="d-flex justify-content-between mt-1">
                            <small className="text-muted fs-10">En servicio</small>
                            <small className="text-danger fs-10 fw-semibold">{Math.round(progressValue)}%</small>
                        </div>
                    </>
                )}
            </CardBody>
        </Card>
    );
};

const NextAvailableCard = ({ stylist, index, isNext }: { stylist: any, index: number, isNext: boolean }) => {
    return (
        <div
            className={`d-flex align-items-center p-2 mb-2 rounded position-relative shadow-sm ${isNext
                ? 'bg-success bg-opacity-10 border border-success'
                : 'bg-white border border-success-subtle'
                }`}
        >
            <div
                className={`position-absolute start-0 top-0 bottom-0 ${isNext ? 'bg-warning' : 'bg-success'}`}
                style={{ width: isNext ? '4px' : '3px' }}
            ></div>

            <div className="flex-shrink-0 me-2 ms-2">
                <div className="avatar-xs">
                    <span
                        className={`avatar-title rounded-circle fw-bold fs-12 border ${isNext
                            ? 'bg-warning text-dark border-warning'
                            : 'bg-success-subtle text-success border-success'
                            }`}
                    >
                        {index + 1}
                    </span>
                </div>
            </div>

            <div className="flex-grow-1 overflow-hidden">
                <div className="d-flex align-items-center">
                    <h6 className={`fs-13 mb-0 fw-bold text-truncate ${isNext ? 'text-success' : 'text-dark'}`}>
                        {stylist.name}
                    </h6>
                    {isNext && (
                        <Badge color="warning" className="ms-2 fs-9 px-2">
                            <i className="ri-star-fill me-1"></i>
                            Siguiente
                        </Badge>
                    )}
                </div>
                <small className="text-muted fs-11">
                    <i className={`ri-history-line me-1 ${isNext ? 'text-warning' : 'text-success'}`}></i>
                    {stylist.timeSinceLastService === "1er turno"
                        ? "Sin atender hoy"
                        : `Esperando: ${stylist.timeSinceLastService}`
                    }
                </small>
            </div>

            <div className="flex-shrink-0 ms-1">
                {isNext ? (
                    <div className="text-center">
                        <div className="avatar-xs mx-auto">
                            <span className="avatar-title rounded-circle bg-warning text-dark fs-12">
                                <i className="ri-arrow-right-line"></i>
                            </span>
                        </div>
                    </div>
                ) : (
                    <Badge color="success" pill className="fs-10 px-2">Listo</Badge>
                )}
            </div>
        </div>
    );
};

// =================================================================================
// 2. LÓGICA DEL CARRIL
// =================================================================================

const ServiceLane = ({ serviceId, serviceName, onRemove, events, stylists, services, digiturnoQueue, apiQueue }: any) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    const { busyStylists, availableStylists } = useMemo(() => {
        const now = currentTime;

        const serviceStylistsMap = new Map<string, any>();

        const digiturnoForThisService = (digiturnoQueue || []).filter((item: any) => String(item.service_id) === String(serviceId));
        digiturnoForThisService.forEach((item: any) => {
            const sId = String(item.stylist_id);
            serviceStylistsMap.set(sId, {
                id: sId,
                name: item.stylist_name || 'Estilista',
                last_completed_at: item.last_completed_at,
                total_completed: item.total_completed || 0,
                order: item.order || 999,
                source: 'digiturno'
            });
        });

        (apiQueue || []).forEach((item: any) => {
            const sId = String(item.stylist_id || item.id);
            if (!serviceStylistsMap.has(sId)) {
                const name = item.stylist_name || (item.first_name ? `${item.first_name || ''} ${item.last_name || ''}`.trim() : 'Estilista');
                serviceStylistsMap.set(sId, {
                    id: sId,
                    name: name,
                    last_completed_at: item.last_completed_at,
                    total_completed: item.total_completed || 0,
                    order: 999,
                    source: 'apiQueue'
                });
            }
        });

        (events || []).forEach((e: any) => {
            if (!e.extendedProps) return;
            const eventServiceId = String(e.extendedProps.service_id || '');
            if (eventServiceId !== String(serviceId)) return;
            const sId = String(e.extendedProps.stylist_id);
            if (!serviceStylistsMap.has(sId)) {
                const name = `${e.extendedProps.stylist_first_name || ''} ${e.extendedProps.stylist_last_name || ''}`.trim() || 'Estilista';
                serviceStylistsMap.set(sId, {
                    id: sId,
                    name: name,
                    last_completed_at: null,
                    total_completed: 0,
                    order: 999,
                    source: 'event-fallback'
                });
            }
        });

        const allServiceStylistIds = new Set(Array.from(serviceStylistsMap.keys()));

        const resolveServiceName = (svcId: any, eventProps: any = null) => {
            if (eventProps?.service_name) return eventProps.service_name;
            const svc = services?.find((s: any) => String(s.id) === String(svcId));
            return svc?.name || "Otro servicio";
        };

        const formatTime = (date: Date) => {
            return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
        };

        const busyIdsMap = new Map<string, any>();
        const UPCOMING_WINDOW_MS = 60 * 60 * 1000;

        (events || []).forEach((e: any) => {
            if (!e.extendedProps) return;
            const sId = String(e.extendedProps.stylist_id);
            const stylistName = `${e.extendedProps.stylist_first_name || ''} ${e.extendedProps.stylist_last_name || ''}`.trim();

            if (!allServiceStylistIds.has(sId)) return;

            const start = new Date(e.start);
            const end = new Date(e.end);
            const status = (e.extendedProps.status || '').toLowerCase();
            const excludedStatuses = ['checked_out', 'cancelled', 'completed', 'no_show'];

            if (excludedStatuses.includes(status)) return;

            const stylistData = serviceStylistsMap.get(sId);
            const clientName = `${e.extendedProps.client_first_name || 'Cliente'} ${e.extendedProps.client_last_name || ''}`.trim();
            const eventServiceId = String(e.extendedProps.service_id || '');
            const eventServiceName = resolveServiceName(eventServiceId, e.extendedProps);

            const isHappeningNow = start <= now && end >= now;
            const isUpcoming = start > now && (start.getTime() - now.getTime()) <= UPCOMING_WINDOW_MS;

            if (isHappeningNow) {
                const minsLeft = Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000));
                const totalDuration = Math.round((end.getTime() - start.getTime()) / 60000);
                const safeDuration = totalDuration > 0 ? totalDuration : 1;
                const progress = Math.min(100, Math.max(0, ((totalDuration - minsLeft) / safeDuration) * 100));

                busyIdsMap.set(sId, {
                    id: sId,
                    name: stylistData?.name || stylistName,
                    clientName,
                    timeRemaining: minsLeft,
                    progress,
                    status,
                    serviceId: eventServiceId,
                    serviceName: eventServiceName,
                    priority: 1,
                    sortTime: now.getTime()
                });
            } else if (isUpcoming) {
                const existing = busyIdsMap.get(sId);
                if (!existing || existing.priority > 1) {
                    const minsUntilStart = Math.round((start.getTime() - now.getTime()) / 60000);
                    const startsIn = minsUntilStart <= 1 ? '¡Ya!' : `en ${minsUntilStart} min`;

                    if (!existing || start.getTime() < existing.sortTime) {
                        busyIdsMap.set(sId, {
                            id: sId,
                            name: stylistData?.name || stylistName,
                            clientName,
                            startsIn,
                            startTime: formatTime(start),
                            serviceId: eventServiceId,
                            serviceName: eventServiceName,
                            priority: 2,
                            sortTime: start.getTime()
                        });
                    }
                }
            }
        });

        const busyArray = Array.from(busyIdsMap.values()).sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.sortTime - b.sortTime;
        });

        const busyIds = new Set(busyArray.map(s => s.id));

        const available = Array.from(serviceStylistsMap.values())
            .filter((s: any) => !busyIds.has(s.id))
            .sort((a: any, b: any) => {
                if (!a.last_completed_at && b.last_completed_at) return -1;
                if (a.last_completed_at && !b.last_completed_at) return 1;

                if (a.last_completed_at && b.last_completed_at) {
                    const aTime = new Date(a.last_completed_at).getTime();
                    const bTime = new Date(b.last_completed_at).getTime();
                    if (aTime !== bTime) return aTime - bTime;
                }

                if (a.total_completed !== b.total_completed) return a.total_completed - b.total_completed;

                return (a.order || 0) - (b.order || 0);
            })
            .map((s: any) => {
                let timeSince = "1er turno";
                if (s.last_completed_at) {
                    const diff = Math.floor((now.getTime() - new Date(s.last_completed_at).getTime()) / 60000);
                    if (diff > 60) {
                        timeSince = `${Math.floor(diff / 60)}h ${diff % 60}m`;
                    } else {
                        timeSince = `${diff} min`;
                    }
                }
                return {
                    id: s.id,
                    name: s.name,
                    timeSinceLastService: timeSince,
                    total_completed: s.total_completed
                };
            });

        return {
            busyStylists: busyArray,
            availableStylists: available
        };
    }, [digiturnoQueue, apiQueue, events, services, currentTime, serviceId]);

    return (
        <Card className="h-100 shadow-none border border-dashed border-secondary-subtle" style={{ minWidth: '300px' }}>
            <div className="p-3 border-bottom bg-light-subtle d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center overflow-hidden">
                    <h6 className="mb-0 fw-bold text-dark text-truncate" title={serviceName}>
                        {serviceName}
                    </h6>
                </div>
                <button onClick={() => onRemove(serviceId)} className="btn btn-sm btn-icon btn-ghost-danger">
                    <i className="ri-close-line"></i>
                </button>
            </div>

            <CardBody className="p-0 bg-light-subtle d-flex flex-column" style={{ height: 'calc(100vh - 250px)' }}>
                <div className="flex-grow-1 p-2 overflow-auto custom-scrollbar">

                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center px-1 mb-2">
                            <span className="text-uppercase fs-11 fw-bold text-success ls-1">
                                <i className="ri-user-follow-line me-1"></i>
                                En Cola ({availableStylists.length})
                            </span>
                        </div>

                        {availableStylists.length > 0 ? (
                            availableStylists.map((s: any, idx: number) => (
                                <NextAvailableCard
                                    key={s.id}
                                    stylist={s}
                                    index={idx}
                                    isNext={idx === 0}
                                />
                            ))
                        ) : (
                            <div className="text-center py-2 border border-dashed border-success-subtle rounded bg-white">
                                <i className="ri-user-unfollow-line fs-5 text-muted d-block mb-1"></i>
                                <span className="text-muted fs-11">
                                    {busyStylists.length > 0
                                        ? 'Todos ocupados'
                                        : 'Sin estilistas en cola'}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="position-relative my-2 text-center">
                        <hr className="border-secondary-subtle my-2" />
                        <span className="position-absolute top-50 start-50 translate-middle bg-light-subtle px-2 text-muted fs-10 text-uppercase">
                            <i className="ri-scissors-2-line me-1"></i>
                            Ocupados
                        </span>
                    </div>

                    <div>
                        <div className="d-flex justify-content-between align-items-center px-1 mb-2">
                            <span className="text-uppercase fs-11 fw-bold text-danger ls-1">
                                <i className="ri-service-line me-1"></i>
                                Ocupados ({busyStylists.length})
                            </span>
                            {busyStylists.length > 0 && (
                                <Badge color="danger" pill className="fs-10">No disponible</Badge>
                            )}
                        </div>

                        {busyStylists.length > 0 ? (
                            busyStylists.map((s: any) => (
                                <BusyStylistCard
                                    key={s.id}
                                    stylist={s}
                                    currentServiceId={serviceId}
                                />
                            ))
                        ) : (
                            <div className="text-center py-3 opacity-50">
                                <i className="ri-checkbox-circle-line fs-3 text-success d-block mb-1"></i>
                                <span className="text-muted fs-11">Todos disponibles</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-top p-2 bg-white">
                    <div className="d-flex justify-content-around text-center">
                        <div>
                            <span className="fs-12 fw-bold text-success">{availableStylists.length}</span>
                            <small className="d-block text-muted fs-10">Libres</small>
                        </div>
                        <div className="border-start px-3">
                            <span className="fs-12 fw-bold text-danger">{busyStylists.length}</span>
                            <small className="d-block text-muted fs-10">Ocupados</small>
                        </div>
                        <div className="border-start ps-3">
                            <span className="fs-12 fw-bold text-primary">
                                {availableStylists.length + busyStylists.length}
                            </span>
                            <small className="d-block text-muted fs-10">Total</small>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};

// =================================================================================
// 3. DASHBOARD PRINCIPAL
// =================================================================================

const SmartQueueDashboard = () => {
    document.title = "Monitor de Turnos | Sistema";
    const dispatch: any = useDispatch();

    const { events, services, stylists } = useSelector((state: any) => state.Calendar);
    const tenantId = useSelector((state: any) => state.Login?.user?.tenant_id);

    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [dropdownValue, setDropdownValue] = useState("");
    const [digiturnoQueue, setDigiturnoQueue] = useState<any[]>([]);
    const [apiQueues, setApiQueues] = useState<{ [key: string]: any[] }>({});
    const [loadingQueue, setLoadingQueue] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchDigiturnoQueue = useCallback(async () => {
        if (!tenantId) return;
        try {
            const response = await axios.get(`/api/appointments/digiturno/queue/${tenantId}`);
            setDigiturnoQueue(response.data.queue || []);
        } catch (err) {
            console.error('❌ [Digiturno Queue] Error:', err);
            setDigiturnoQueue([]);
        }
    }, [tenantId]);

    const fetchApiQueues = useCallback(async () => {
        if (selectedServiceIds.length === 0) return;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const newQueues: { [key: string]: any[] } = {};

        for (const serviceId of selectedServiceIds) {
            try {
                const data = await dispatch(fetchAvailableStylists(dateStr, timeStr, serviceId));
                newQueues[serviceId] = data || [];
            } catch (err) {
                newQueues[serviceId] = [];
            }
        }

        setApiQueues(newQueues);
    }, [dispatch, selectedServiceIds]);

    useEffect(() => {
        const loadData = async () => {
            setLoadingQueue(true);
            await dispatch(getCalendarData());
            await fetchDigiturnoQueue();
            await fetchApiQueues();
            setLastRefresh(new Date());
            setLoadingQueue(false);
        };

        loadData();
    }, [dispatch, fetchDigiturnoQueue, fetchApiQueues]);

    useEffect(() => {
        if (selectedServiceIds.length > 0) {
            fetchApiQueues();
        }
    }, [selectedServiceIds, fetchApiQueues]);

    const handleAdd = (id: string) => {
        if (id && !selectedServiceIds.includes(id)) {
            setSelectedServiceIds([...selectedServiceIds, id]);
        }
        setDropdownValue("");
    };

    const handleRemove = (id: string) => {
        setSelectedServiceIds(prev => prev.filter(s => s !== id));
    };

    const handleRefreshAll = async () => {
        setLoadingQueue(true);
        await dispatch(getCalendarData());
        await fetchDigiturnoQueue();
        await fetchApiQueues();
        setLastRefresh(new Date());
        setLoadingQueue(false);
    };

    return (
        <div className="page-content bg-light" style={{ minHeight: '100vh', overflow: 'hidden' }}>
            <Container fluid className="h-100 d-flex flex-column">

                <Row className="flex-shrink-0 mb-3">
                    <Col xs={12}>
                        <div className="bg-white p-3 rounded shadow-sm d-flex flex-column flex-md-row justify-content-between align-items-md-center border">
                            <div className="mb-2 mb-md-0">
                                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                                    <i className="ri-dashboard-3-line me-2 text-primary"></i>
                                    Monitor de Turnos
                                    {events && events.length > 0 && (
                                        <Badge color="soft-primary" className="ms-2 fs-10">
                                            {events.length} citas hoy
                                        </Badge>
                                    )}
                                </h5>
                                <small className="text-muted">
                                    <i className="ri-time-line me-1"></i>
                                    Actualizado: {lastRefresh.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                    {loadingQueue && <Spinner size="sm" color="primary" className="ms-2" style={{ width: '0.7rem', height: '0.7rem' }} />}
                                </small>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                {/* Selector de servicio - AMPLIADO */}
                                <div style={{ width: '280px' }}>
                                    <Input
                                        type="select"
                                        className="form-select"
                                        value={dropdownValue}
                                        onChange={(e) => handleAdd(e.target.value)}
                                    >
                                        <option value="">+ Añadir Servicio...</option>
                                        {(services || []).map((s: any) => (
                                            <option
                                                key={s.id}
                                                value={s.id}
                                                disabled={selectedServiceIds.includes(String(s.id))}
                                            >
                                                {s.name}
                                            </option>
                                        ))}
                                    </Input>
                                </div>

                                {/* Botones Refrescar y Limpiar juntos */}
                                <Button
                                    color="soft-success"
                                    size="sm"
                                    onClick={handleRefreshAll}
                                    disabled={loadingQueue}
                                >
                                    <i className={`ri-refresh-line me-1 ${loadingQueue ? 'spin' : ''}`}></i>
                                    Refrescar
                                </Button>

                                {selectedServiceIds.length > 0 && (
                                    <Button
                                        color="soft-danger"
                                        size="sm"
                                        onClick={() => setSelectedServiceIds([])}
                                    >
                                        <i className="ri-delete-bin-line me-1"></i>
                                        Limpiar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Col>
                </Row>

                <Row className="flex-nowrap flex-grow-1 pb-3 px-2" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                    {selectedServiceIds.length === 0 ? (
                        <Col xs={12} className="d-flex align-items-center justify-content-center">
                            <div className="text-center opacity-75">
                                <div className="avatar-lg mx-auto mb-3">
                                    <div className="avatar-title bg-light text-primary rounded-circle display-4">
                                        <i className="ri-layout-column-line"></i>
                                    </div>
                                </div>
                                <h5>Selecciona un servicio</h5>
                                <p className="text-muted mb-3">Elige uno o más servicios para ver sus colas</p>
                                {services && services.length > 0 && (
                                    <div>
                                        {services.slice(0, 5).map((s: any) => (
                                            <Badge
                                                key={s.id}
                                                color="soft-primary"
                                                className="me-1 mb-1"
                                                onClick={() => handleAdd(String(s.id))}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {s.name}
                                            </Badge>
                                        ))}
                                        {services.length > 5 && (
                                            <small className="text-muted d-block mt-2">+{services.length - 5} más</small>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Col>
                    ) : (
                        selectedServiceIds.map(sid => {
                            const sName = services?.find((s: any) => String(s.id) === String(sid))?.name || "Servicio";
                            return (
                                <Col key={sid} xs={12} md={6} lg={4} xl={3} className="h-100 px-2" style={{ minWidth: '320px' }}>
                                    <ServiceLane
                                        serviceId={sid}
                                        serviceName={sName}
                                        onRemove={handleRemove}
                                        events={events}
                                        stylists={stylists}
                                        services={services}
                                        digiturnoQueue={digiturnoQueue}
                                        apiQueue={apiQueues[sid] || []}
                                    />
                                </Col>
                            );
                        })
                    )}
                </Row>
            </Container>
        </div>
    );
};

export default SmartQueueDashboard;