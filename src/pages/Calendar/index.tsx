// Archivo COMPLETO y FINAL: src/pages/Calendar/index.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Card, CardBody, Container, Form, Input, Label, Modal, ModalBody, ModalHeader,
  Row, Col, Button, Spinner, FormFeedback, Alert
} from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";
import { toast } from "react-toastify";
import Flatpickr from "react-flatpickr";
import { Link, useNavigate } from "react-router-dom";

// Redux
import { useSelector, useDispatch } from "react-redux";
import {
  getCalendarData as onGetCalendarData,
  createAppointment as onCreateAppointment,
  updateAppointment as onUpdateAppointment,
  fetchAvailability as onFetchAvailability,
  suggestStylist as onSuggestStylist,
  clearSlots,
  createNewClient as onCreateNewClient,
  getStylistsForService,
} from "../../slices/thunks";

// Componentes
import BreadCrumb from "../../Components/Common/BreadCrumb";
import CentroDeCitasDiarias from "../../Components/Calendar/CentroDeCitasDiarias";

// Interfaces
interface AppointmentFormValues {
  client_id: string; service_id: string; stylist_id: string;
  date: string | Date; start_time: string;
  newClientFirstName: string; newClientLastName: string; newClientPhone: string; newClientEmail: string;
}

type Stylist = { id: string | number; first_name?: string; last_name?: string; };

const Calendar = () => {
  document.title = "Calendario | Sistema de Peluquerías";
  const dispatch: any = useDispatch();
  const navigate = useNavigate();

  const { events, clients, services, stylists, availableSlots, loading } = useSelector(
    (state: any) => state.Calendar
  );
  
  const [modal, setModal] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSlotLoading, setIsSlotLoading] = useState<boolean>(false);
  const [showNewClientForm, setShowNewClientForm] = useState<boolean>(false);
  const [stylistsForService, setStylistsForService] = useState<Stylist[]>([]);
  const [isLoadingStylists, setIsLoadingStylists] = useState<boolean>(false);

  useEffect(() => {
    dispatch(onGetCalendarData());
  }, [dispatch]);

  const toggle = () => {
    setModal(prev => {
      if (prev) {
        setSelectedEvent(null);
        setShowNewClientForm(false);
        setStylistsForService([]);
        dispatch(clearSlots());
        validation.resetForm();
      }
      return !prev;
    });
  };

  const handleDateClick = (arg: any) => {
    setSelectedEvent(null);
    validation.resetForm();
    validation.setFieldValue("date", arg.date);
    setModal(true);
  };
  
  const handleEventClick = (arg: any) => {
    setSelectedEvent(arg.event.extendedProps);
    setModal(true);
  };
  
  const handleNewAppointmentClick = () => {
    setSelectedEvent(null);
    validation.resetForm();
    setModal(true);
  };
  
  const handleEventDrop = (dropInfo: any) => {
    const { event } = dropInfo;
    const updatedPayload = { ...event.extendedProps, id: event.id, start_time: event.start.toISOString() };
    dispatch(onUpdateAppointment(updatedPayload)).catch(() => dropInfo.revert());
  };

  const validation = useFormik<AppointmentFormValues>({
    enableReinitialize: true,
    validationSchema: Yup.object({
      service_id: Yup.string().required("Seleccione un servicio."),
      stylist_id: Yup.string().required("Seleccione un estilista."),
      date: Yup.mixed().required("Seleccione una fecha."),
      start_time: Yup.string().required("Seleccione un horario."),
      client_id: Yup.string().when([], {
        is: () => !showNewClientForm && !selectedEvent,
        then: schema => schema.required("Seleccione un cliente."),
        otherwise: schema => schema.notRequired(),
      }),
      newClientFirstName: Yup.string().when([], {
        is: () => showNewClientForm,
        then: schema => schema.required("El nombre es requerido."),
        otherwise: schema => schema.notRequired(),
      }),
      newClientEmail: Yup.string().when([], {
        is: () => showNewClientForm,
        then: schema => schema.email("Email inválido").required("El email es requerido."),
        otherwise: schema => schema.notRequired(),
      }),
    }),
    initialValues: {
      client_id: "", service_id: "", stylist_id: "", date: "", start_time: "",
      newClientFirstName: "", newClientLastName: "", newClientPhone: "", newClientEmail: "",
    },
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true);
      try {
        const dateISO = new Date(values.date as any).toISOString().slice(0, 10);
        const localDateTimeString = `${dateISO}T${values.start_time}`;
        const utcDateTimeString = new Date(localDateTimeString).toISOString();

        let finalClientId = values.client_id;
        if (showNewClientForm) {
          const newClient = await dispatch(onCreateNewClient({
            first_name: values.newClientFirstName, last_name: values.newClientLastName,
            phone: values.newClientPhone, email: values.newClientEmail,
          }));
          finalClientId = newClient.id;
        }
        if (!finalClientId && !selectedEvent) throw new Error("ID de cliente no válido.");
        
        if (selectedEvent) {
          await dispatch(onUpdateAppointment({
            id: selectedEvent.id, client_id: selectedEvent.client_id,
            service_id: values.service_id, stylist_id: values.stylist_id, start_time: utcDateTimeString,
          }));
          toast.success("Cita actualizada con éxito");
        } else {
          await dispatch(onCreateAppointment({
            client_id: finalClientId, service_id: values.service_id,
            stylist_id: values.stylist_id, start_time: utcDateTimeString,
          }));
          toast.success("Cita agendada con éxito");
        }
        toggle();
      } catch (error: any) {
        toast.error(error.message || "No se pudo completar la operación.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (selectedEvent && modal) {
      const startTime = new Date(selectedEvent.start_time);
      validation.setValues({
        ...validation.initialValues,
        client_id: String(selectedEvent.client_id || ""),
        service_id: String(selectedEvent.service_id || ""),
        stylist_id: String(selectedEvent.stylist_id || ""),
        date: startTime,
        start_time: startTime.toTimeString().slice(0, 8),
      });
    }
  }, [selectedEvent, modal]);

  const { service_id, date, stylist_id } = validation.values;

  useEffect(() => {
    if (!service_id) {
      setStylistsForService([]);
      validation.setFieldValue('stylist_id', '');
      return;
    }
    setIsLoadingStylists(true);
    dispatch(getStylistsForService(service_id))
      .then((filtered: any[]) => {
        setStylistsForService(filtered);
        if (filtered.length === 1) {
          validation.setFieldValue('stylist_id', filtered[0].id);
        } else {
          validation.setFieldValue('stylist_id', '');
        }
      })
      .catch(() => {
        setStylistsForService(stylists);
        toast.warn("No se encontraron especialistas, mostrando todos.");
      })
      .finally(() => setIsLoadingStylists(false));
  }, [service_id, dispatch, stylists]);

  useEffect(() => {
    if (stylist_id && date) {
      const dateObj = new Date(date);
      const dateStr = dateObj.toISOString().slice(0, 10);
      setIsSlotLoading(true);
      dispatch(onFetchAvailability(stylist_id, dateStr)).finally(() => setIsSlotLoading(false));
    } else {
      dispatch(clearSlots());
    }
  }, [date, stylist_id, dispatch]);

  const canSubmit = useMemo(() => {
    return validation.isValid && !validation.isSubmitting;
  }, [validation.isValid, validation.isSubmitting]);

  if (loading) { return <div className="page-content"><Container fluid><p>Cargando...</p></Container></div>; }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Calendario" pageTitle="Citas" />
          <Row>
            <Col xl={3}>
              <CentroDeCitasDiarias events={events} onNewAppointmentClick={handleNewAppointmentClick} />
            </Col>
            <Col xl={9}>
              <Card className="card-h-100">
                <CardBody>
                  {!loading && (
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
                  )}
                  {loading && <div className="d-flex justify-content-center align-items-center" style={{minHeight: '400px'}}><p>Cargando calendario...</p></div>}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Modal isOpen={modal} toggle={toggle} centered size="lg">
        <ModalHeader toggle={toggle} tag="h5" className="p-3 bg-light">{!!selectedEvent ? "Editar Cita" : "Agendar Cita"}</ModalHeader>
        <ModalBody>
          <Form onSubmit={(e) => { e.preventDefault(); validation.handleSubmit(); }}>
            <Row>
              <Col xs={12} className="mb-3">
                {showNewClientForm ? (
                  <div>
                    <h5>Datos del Nuevo Cliente</h5>
                    <Row>
                      <Col md={6} className="mb-2"><Label>Nombre*</Label><Input name="newClientFirstName" onChange={validation.handleChange} value={validation.values.newClientFirstName} invalid={!!(validation.touched.newClientFirstName && validation.errors.newClientFirstName)} /></Col>
                      <Col md={6} className="mb-2"><Label>Apellido</Label><Input name="newClientLastName" onChange={validation.handleChange} value={validation.values.newClientLastName} /></Col>
                      <Col md={6} className="mb-2"><Label>Email*</Label><Input name="newClientEmail" type="email" onChange={validation.handleChange} value={validation.values.newClientEmail} invalid={!!(validation.touched.newClientEmail && validation.errors.newClientEmail)}/></Col>
                      <Col md={6} className="mb-2"><Label>Teléfono</Label><Input name="newClientPhone" onChange={validation.handleChange} value={validation.values.newClientPhone} /></Col>
                    </Row>
                    <Button color="link" size="sm" onClick={() => setShowNewClientForm(false)} className="ps-0">O seleccionar cliente existente</Button>
                  </div>
                ) : (
                  <div style={{ display: selectedEvent ? "none" : "block" }}>
                    <Label>Cliente Existente*</Label>
                    <Input type="select" name="client_id" onChange={validation.handleChange} value={validation.values.client_id} disabled={!!selectedEvent}>
                      <option value="">Seleccione...</option>
                      {clients.map((c: any) => (<option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>))}
                    </Input>
                    <Button color="link" size="sm" onClick={() => setShowNewClientForm(true)} className="ps-0">Crear nuevo cliente</Button>
                  </div>
                )}
                {selectedEvent && (<div><Label>Cliente</Label><Input type="text" value={`${selectedEvent.client_first_name || ''} ${selectedEvent.client_last_name || ''}`} disabled /></div>)}
              </Col>
              <Col md={12} className="mb-3">
                <Label>Servicio*</Label>
                <Input type="select" name="service_id" onChange={validation.handleChange} value={validation.values.service_id}>
                  <option value="">Seleccione un servicio...</option>
                  {services.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </Input>
              </Col>
              <Col md={6} className="mb-3">
                <Label>Fecha*</Label>
                <Flatpickr className="form-control" value={validation.values.date} onChange={([d]) => validation.setFieldValue('date', d)} options={{ dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y", minDate: "today" }}/>
              </Col>
              <Col md={6} className="mb-3">
                <Label>Hora*</Label>
                <Input type="select" name="start_time" onChange={validation.handleChange} value={validation.values.start_time} disabled={!date || isSlotLoading}>
                  <option value="">{isSlotLoading ? "Buscando..." : "Seleccione horario..."}</option>
                  {availableSlots.map((slot: string) => {
                    const time = new Date(slot).toTimeString().slice(0, 5);
                    return <option key={slot} value={time}>{time}</option>;
                  })}
                </Input>
              </Col>
              <Col xs={12} className="mb-3">
                <Label>Estilista*</Label>
                <Input type="select" name="stylist_id" onChange={validation.handleChange} value={validation.values.stylist_id} disabled={!service_id || isLoadingStylists}>
                  <option value="">{isLoadingStylists ? "Cargando especialistas..." : "Seleccione..."}</option>
                  {stylistsForService.map((s: Stylist) => (<option key={String(s.id)} value={String(s.id)}>{s.first_name} {s.last_name}</option>))}
                </Input>
              </Col>
            </Row>
            <div className="hstack gap-2 justify-content-end">
              <Button type="button" color="light" onClick={toggle}>Cancelar</Button>
              <Button type="submit" color="success" disabled={!canSubmit}>
                {validation.isSubmitting ? <Spinner size="sm" /> : !!selectedEvent ? "Guardar Cambios" : "Agendar Cita"}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>
    </React.Fragment>
  );
};

export default Calendar;