// =============================================
// File: src/pages/Calendar/index.tsx
// =============================================
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody, Container, Row, Col } from "reactstrap";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

// Thunks
import {
  getCalendarData as onGetCalendarData,
  updateAppointment as onUpdateAppointment,
} from "../../slices/thunks";

// Componentes
import BreadCrumb from "../../Components/Common/BreadCrumb";
import CentroDeCitasDiarias from "../../Components/Calendar/CentroDeCitasDiarias";
import AppointmentModal from "../../Components/Calendar/AppointmentModal";

const Calendar = () => {
  document.title = "Calendario | Sistema de Peluquerías";
  const dispatch: any = useDispatch();
  const navigate = useNavigate();

  const { events, loading } = useSelector((state: any) => state.Calendar);

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  useEffect(() => {
    dispatch(onGetCalendarData());
  }, [dispatch]);

  // Handlers
  const handleDateClick = (arg: any) => {
    setSelectedEvent(null);
    setDefaultDate(arg.date);
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
    const updatedPayload = {
      ...event.extendedProps,
      id: event.id,
      start_time: event.start.toISOString(),
    };
    dispatch(onUpdateAppointment(updatedPayload)).catch(() => dropInfo.revert());
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <p>Cargando...</p>
        </Container>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Calendario" pageTitle="Citas" />
          <Row>
            <Col xl={3}>
              <CentroDeCitasDiarias
                events={events}
                onNewAppointmentClick={handleNewAppointmentClick}
              />
            </Col>
            <Col xl={9}>
              <Card className="card-h-100">
                <CardBody>
                  <FullCalendar
                    plugins={[BootstrapTheme, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }}
                    events={events}
                    editable={true}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    locale={esLocale}
                    buttonText={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día", list: "Lista" }}
                  />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Modal desacoplado */}
      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedEvent={selectedEvent}
        defaultDate={defaultDate}
      />
    </React.Fragment>
  );
};

export default Calendar;