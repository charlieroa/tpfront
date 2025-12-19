// =============================================
// File: src/pages/Calendar/index.tsx
// =============================================
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardBody, Container, Row, Col } from "reactstrap";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";

// ⬇️ Hook de sockets
import useCalendarSocket from "../../hooks/useCalendarSocket";

// ✅ Thunks de Calendar
import {
  getCalendarData as onGetCalendarData,
  updateAppointment as onUpdateAppointment,
} from "../../slices/thunks";

// ✅ Thunk de Settings (importado directamente)
import { fetchTenantSettings } from "../../slices/Settings/settingsSlice";

// Componentes
import BreadCrumb from "../../Components/Common/BreadCrumb";
import CentroDeCitasDiarias from "../../Components/Calendar/CentroDeCitasDiarias";
import AppointmentModal from "../../Components/Calendar/AppointmentModal";

// ✅ HELPER: Verificar si una fecha es pasada (solo fecha, sin hora)
const isDateInPast = (date: Date): boolean => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return checkDate < today;
};

// ✅ HELPER: Verificar si una fecha/hora específica es pasada
const isDateTimeInPast = (date: Date): boolean => date < new Date();

// ✅ HELPER: ¿El día está abierto según workingHours?
const isDayOpen = (date: Date, workingHours: any): boolean => {
  if (!workingHours || typeof workingHours !== "object" || Object.keys(workingHours).length === 0) {
    // Si no hay configuración, permitimos por defecto
    return true;
  }
  const dayIndex = date.getDay(); // 0: domingo ... 6: sábado
  const esKey = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][dayIndex];
  const enKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayIndex];
  const daySchedule = (workingHours as any)[esKey] || (workingHours as any)[enKey];

  if (daySchedule === undefined) return true;

  // Puede venir como string ("09:00-17:00" o "cerrado")
  if (typeof daySchedule === "string") {
    const s = daySchedule.toLowerCase();
    if (s === "cerrado" || s === "closed") return false;
    return true;
  }

  // O como objeto { active: boolean, start: string, end: string }
  if (typeof daySchedule === "object" && daySchedule !== null) {
    if ((daySchedule as any).active === false) return false;
    return true;
  }

  return true;
};

const Calendar = () => {
  document.title = "Calendario | Sistema de Peluquerías";
  const dispatch: any = useDispatch();

  const { events, loading, tenantWorkingHours } = useSelector((state: any) => state.Calendar);

  // ✅ Lee directamente desde el slice de Settings
  const settingsState = useSelector((state: any) => state.Settings || state.settings);
  const settingsLoaded = settingsState?.loaded === true;
  const allowPastAppointments = settingsState?.data?.allow_past_appointments ?? false;

  // ✅ Debug temporal (puedes quitar esto después de verificar que funciona)
  console.log('🔍 [Calendar] Settings:', {
    settingsLoaded,
    allowPastAppointments,
    'settingsState.data': settingsState?.data
  });

  // Toma tenantId desde tu store
  const auth = useSelector((s: any) => s.Auth || s.auth || {});
  const tenantId = auth?.user?.tenant_id || auth?.tenantId;

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  useEffect(() => {
    dispatch(onGetCalendarData());
    dispatch(fetchTenantSettings());
  }, [dispatch]);

  // Refrescar eventos cuando llegue un cambio por polling
  const refreshCalendar = useCallback(() => {
    dispatch(onGetCalendarData());
  }, [dispatch]);

  // Polling para detectar cambios en citas (cada 30 segundos)
  useCalendarSocket({
    tenantId,
    onAnyChange: () => {
      console.log('🔄 [CALENDAR] Refrescando por polling...');
      refreshCalendar();
    },
    pollingInterval: 30000, // 30 segundos
  });

  const handleDateClick = (arg: any) => {
    const clickedDate = arg.date as Date;

    // ✅ VALIDACIÓN 1: Verificar si el día está abierto
    if (!isDayOpen(clickedDate, tenantWorkingHours)) {
      Swal.fire({
        title: "Día no disponible",
        text: "Este día no está seleccionado en tu configuración de horarios.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Entendido",
      });
      return;
    }

    // ✅ VALIDACIÓN 2: Solo bloquear pasado cuando YA cargaron settings
    if (settingsLoaded && !allowPastAppointments && isDateInPast(clickedDate)) {
      Swal.fire({
        title: "Fecha pasada",
        html:
          "No se pueden crear citas en fechas pasadas.<br><small class='text-muted'>Puedes habilitarlo en Configuración &rarr; Datos de la peluquería.</small>",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Entendido",
      });
      return;
    }

    // ✅ Si pasa ambas validaciones, abrir modal
    setSelectedEvent(null);
    setDefaultDate(clickedDate);
    setModalOpen(true);
  };

  const handleEventClick = (arg: any) => {
    setSelectedEvent(arg.event.extendedProps);
    setDefaultDate(null);
    setModalOpen(true);
  };

  const handleNewAppointmentClick = () => {
    setSelectedEvent(null);
    setDefaultDate(null);
    setModalOpen(true);
  };

  const handleEventDrop = (dropInfo: any) => {
    const { event } = dropInfo;
    const newStartTime: Date = event.start as Date;

    // ✅ VALIDACIÓN 3: Solo bloquear drag & drop a pasado cuando settings estén cargados
    if (settingsLoaded && !allowPastAppointments && newStartTime && isDateTimeInPast(newStartTime)) {
      Swal.fire({
        title: "No permitido",
        text: "No puedes mover citas a fechas u horas pasadas.",
        icon: "error",
        confirmButtonColor: "#d33",
        confirmButtonText: "Entendido",
      });
      dropInfo.revert();
      return;
    }

    // ✅ VALIDACIÓN 4: Verificar si el día está abierto según horario
    if (!isDayOpen(newStartTime, tenantWorkingHours)) {
      Swal.fire({
        title: "Día no disponible",
        text: "No puedes mover citas a días cerrados según tu configuración.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Entendido",
      });
      dropInfo.revert();
      return;
    }

    // Si pasa las validaciones, proceder con la actualización
    const updatedPayload = {
      ...event.extendedProps,
      id: event.id,
      start_time: newStartTime.toISOString(),
    };

    dispatch(onUpdateAppointment(updatedPayload))
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "¡Cita actualizada!",
          text: "La cita se movió correctamente.",
          timer: 2000,
          showConfirmButton: false,
        });
      })
      .catch((error: any) => {
        console.error("Error al mover cita:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error?.response?.data?.error || "No se pudo mover la cita.",
          confirmButtonColor: "#d33",
        });
        dropInfo.revert();
      });
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Calendario" pageTitle="Citas" />

          {/* ✅ Indicador visual si las citas pasadas están permitidas (y settings ya cargaron) */}
          {settingsLoaded && allowPastAppointments && (
            <Row className="mb-3">
              <Col>
                <div className="alert alert-info alert-dismissible fade show" role="alert">
                  <i className="ri-information-line me-2"></i>
                  <strong>Modo especial activo:</strong> Se permite crear y mover citas en fechas pasadas.
                  <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
              </Col>
            </Row>
          )}

          <Row>
            <Col xl={3}>
              <CentroDeCitasDiarias events={events} onNewAppointmentClick={handleNewAppointmentClick} />
            </Col>
            <Col xl={9}>
              <Card className="card-h-100">
                <CardBody>
                  <FullCalendar
                    plugins={[BootstrapTheme, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                    }}
                    events={events}
                    editable={true}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    locale={esLocale}
                    buttonText={{
                      today: "Hoy",
                      month: "Mes",
                      week: "Semana",
                      day: "Día",
                      list: "Lista",
                    }}
                    dayMaxEvents={2}
                    moreLinkText="más"
                    eventTimeFormat={{
                      hour: "2-digit",
                      minute: "2-digit",
                      meridiem: false,
                      hour12: false,
                    }}
                    slotLabelFormat={{
                      hour: "2-digit",
                      minute: "2-digit",
                      meridiem: false,
                      hour12: false,
                    }}
                    // ✅ Configuración adicional para mejor UX
                    height="auto"
                    nowIndicator={true}
                    navLinks={true}
                    eventResizableFromStart={false}
                    selectMirror={true}
                    allDaySlot={false}
                  />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedEvent={selectedEvent}
        defaultDate={defaultDate}
        // ✅ Prop consistente en camelCase (el Modal la recibe así)
        allowPastAppointments={allowPastAppointments}
      />
    </React.Fragment>
  );
};

export default Calendar;