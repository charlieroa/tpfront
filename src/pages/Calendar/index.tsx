import React, { useEffect, useMemo, useState } from "react";
import {
  Card, CardBody, Container, Form, Input, Label, Modal, ModalBody, ModalHeader,
  Row, Col, Button, Spinner
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
import { useNavigate } from "react-router-dom";

// Redux
import { useSelector, useDispatch } from "react-redux";
import {
  getCalendarData as onGetCalendarData,
  createAppointment as onCreateAppointment,
  updateAppointment as onUpdateAppointment,
  fetchAvailability as onFetchAvailability,
  clearSlots,
  createNewClient as onCreateNewClient,
  getStylistsForService,
  createAppointmentsBatch as onCreateAppointmentsBatch,
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

type ExtraRow = { service_id: string; stylist_id: string };

// ——————————————————————————————————————————————————————————————————————
// Helpers
// Normaliza un Date/string a HH:mm en zona local para evitar desfases
const toHHmmLocal = (d: string | Date) => {
  const dt = new Date(d);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};
// ——————————————————————————————————————————————————————————————————————

const Calendar = () => {
  document.title = "Calendario | Sistema de Peluquerías";
  const dispatch: any = useDispatch();
  const navigate = useNavigate();

  const { events, clients, services, availableSlots, loading } = useSelector(
    (state: any) => state.Calendar
  );
  
  const [modal, setModal] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isSlotLoading, setIsSlotLoading] = useState<boolean>(false);
  const [showNewClientForm, setShowNewClientForm] = useState<boolean>(false);
  const [stylistsForService, setStylistsForService] = useState<Stylist[]>([]);
  const [isLoadingStylists, setIsLoadingStylists] = useState<boolean>(false);

  // ▼▼ Estados para multi-servicio (únicos)
  const [extraRows, setExtraRows] = useState<ExtraRow[]>([]);
  const [stylistsForRows, setStylistsForRows] = useState<Record<number, Stylist[]>>({});
  const [isLoadingStylistsRow, setIsLoadingStylistsRow] = useState<Record<number, boolean>>({});
  const [stylistConflict, setStylistConflict] = useState<string | null>(null);

  useEffect(() => {
    dispatch(onGetCalendarData());
  }, [dispatch]);

  const resetModalState = () => {
    setSelectedEvent(null);
    setShowNewClientForm(false);
    setStylistsForService([]);
    setExtraRows([]);
    setStylistsForRows({});
    setIsLoadingStylistsRow({});
    dispatch(clearSlots());
    validation.resetForm();
  };

  // Toggle del modal con limpieza segura al cerrar
  const toggle = () => {
    setModal(prev => {
      if (prev) {
        resetModalState();
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
        const dateObj = new Date(values.date as any);
        const [hours, minutes] = values.start_time.split(':').map(Number);
        dateObj.setHours(hours, minutes, 0, 0);
        const utcDateTimeString = dateObj.toISOString();

        let finalClientId = values.client_id;
        if (showNewClientForm) {
          const newClientAction = await dispatch(onCreateNewClient({
            first_name: values.newClientFirstName, last_name: values.newClientLastName,
            phone: values.newClientPhone, email: values.newClientEmail,
          }));
          finalClientId = newClientAction.payload.id;
        }
        if (!finalClientId && !selectedEvent) throw new Error("ID de cliente no válido.");
        
        if (selectedEvent) {
          // EDICIÓN: solo una cita
          await dispatch(onUpdateAppointment({
            id: selectedEvent.id, client_id: selectedEvent.client_id,
            service_id: values.service_id, stylist_id: values.stylist_id, start_time: utcDateTimeString,
          }));
          toast.success("Cita actualizada con éxito");
        } else {
          // CREACIÓN: batch (cita principal + extras)
          // Validación mínima de filas extra
          for (let i = 0; i < extraRows.length; i++) {
            const r = extraRows[i];
            if (!r.service_id || !r.stylist_id) {
              toast.error(`Completa servicio y estilista en la fila #${i + 1}`);
              setSubmitting(false);
              return;
            }
          }
          
          // Evitar estilistas duplicados en el mismo batch
          const allStylistIds = [values.stylist_id, ...extraRows.map(r => r.stylist_id)].filter(Boolean).map(String);
          const uniqueCount = new Set(allStylistIds).size;
          if (uniqueCount !== allStylistIds.length) {
            toast.error("No puedes repetir el mismo estilista en servicios simultáneos.");
            setSubmitting(false);
            return;
          }

          const appointments = [
            { service_id: values.service_id, stylist_id: values.stylist_id, start_time: utcDateTimeString },
            ...extraRows.map(r => ({ service_id: r.service_id, stylist_id: r.stylist_id, start_time: utcDateTimeString }))
          ];

          await dispatch(onCreateAppointmentsBatch({ client_id: finalClientId, appointments }));
          toast.success("Citas agendadas con éxito");
        }
        toggle();
      } catch (error: any) {
        toast.error(error.message || "No se pudo completar la operación.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Efecto 1 (EDICIÓN): Carga datos y rellena la mayor parte del formulario
  useEffect(() => {
    const populateFormForEdit = async () => {
      if (selectedEvent && modal) {
        const { client_id, service_id, stylist_id, start_time } = selectedEvent;
        const startTimeDate = new Date(start_time);

        setIsLoadingStylists(true);
        const filteredStylists = await dispatch(getStylistsForService(service_id));
        setStylistsForService(filteredStylists);
        setIsLoadingStylists(false);

        const dateStr = startTimeDate.toISOString().slice(0, 10);
        setIsSlotLoading(true);
        dispatch(onFetchAvailability(stylist_id, dateStr)).finally(() => {
            setIsSlotLoading(false);
        });
        
        // Seteamos hora inmediatamente para evitar que quede vacío si el backend no trae el slot ya reservado
        const timeValue = toHHmmLocal(start_time);

        validation.setValues({
          ...validation.initialValues,
          client_id: String(client_id || ""),
          service_id: String(service_id || ""),
          stylist_id: String(stylist_id || ""),
          date: startTimeDate,
          start_time: timeValue,
        });
      }
    };
    populateFormForEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent, modal, dispatch]);

  // Efecto 2 (EDICIÓN): Si la hora existe en los slots disponibles, la reafirma
  useEffect(() => {
    if (selectedEvent && modal && availableSlots.length > 0) {
      const current = toHHmmLocal(selectedEvent.start_time);
      const exists = availableSlots.some((slot: string) => toHHmmLocal(slot) === current);
      if (exists) validation.setFieldValue('start_time', current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSlots, selectedEvent, modal]);

  const { service_id, date, stylist_id } = validation.values;

  // Efecto para la lógica de CREACIÓN de citas (filtra estilistas por servicio principal)
  useEffect(() => {
    if (!selectedEvent && service_id) {
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
        .finally(() => setIsLoadingStylists(false));
    }
  }, [service_id, selectedEvent, dispatch]);

  // Efecto que busca horarios cuando CAMBIAN el estilista o la fecha manualmente
  useEffect(() => {
    if (stylist_id && date) {
      const dateObj = new Date(date as any);
      const dateStr = dateObj.toISOString().slice(0, 10);
      setIsSlotLoading(true);
      dispatch(onFetchAvailability(stylist_id, dateStr)).finally(() => setIsSlotLoading(false));
    } else if (!selectedEvent) {
        dispatch(clearSlots());
    }
  }, [date, stylist_id, dispatch, selectedEvent]);

  // Aviso si se repite estilista entre servicios simultáneos
  useEffect(() => {
    const selected: string[] = [];
    if (validation.values.stylist_id) selected.push(String(validation.values.stylist_id));
    if (extraRows && extraRows.length) {
      extraRows.forEach((r) => { if (r.stylist_id) selected.push(String(r.stylist_id)); });
    }
    const hasDup = new Set(selected).size !== selected.length;
    setStylistConflict(hasDup ? 'No puedes elegir al mismo estilista en varios servicios a la vez.' : null);
  }, [validation.values.stylist_id, extraRows]);

  // Handlers Multi-servicio
  const addExtraRow = () => setExtraRows(prev => [...prev, { service_id: '', stylist_id: '' }]);

  const removeExtraRow = (idx: number) => {
    setExtraRows(prev => prev.filter((_, i) => i !== idx));
    setStylistsForRows(prev => { const c = { ...prev }; delete c[idx]; return c; });
    setIsLoadingStylistsRow(prev => { const c = { ...prev }; delete c[idx]; return c; });
  };

  const changeExtraRow = (idx: number, field: keyof ExtraRow, value: string) => {
    setExtraRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  // ¿Este estilista ya está tomado por otra fila o por la cita principal?
  const isTakenByOtherRows = (id: string, rowIndex?: number) => {
    const idStr = String(id);
    // Lo usa la cita principal y estoy en una fila extra
    if (String(validation.values.stylist_id) === idStr && rowIndex !== undefined) return true;
    // Lo usa alguna otra fila distinta a esta
    return extraRows.some((r, i) => i !== rowIndex && String(r.stylist_id) === idStr);
  };

  const handleExtraServiceChange = async (idx: number, serviceId: string) => {
    changeExtraRow(idx, 'service_id', serviceId);
    changeExtraRow(idx, 'stylist_id', '');
    if (!serviceId) return;
    setIsLoadingStylistsRow(p => ({ ...p, [idx]: true }));
    try {
      const filtered = await dispatch(getStylistsForService(serviceId));
      setStylistsForRows(p => ({ ...p, [idx]: filtered || [] }));
      // Autoseleccionar si solo hay uno
      if (filtered && filtered.length === 1) {
        changeExtraRow(idx, 'stylist_id', String(filtered[0].id));
      }
    } finally {
      setIsLoadingStylistsRow(p => ({ ...p, [idx]: false }));
    }
  };

  // Opciones de hora combinando slots + hora actual de la cita (en edición)
  const timeOptions: string[] = useMemo(() => {
    const fromSlots = availableSlots.map((slot: string) => toHHmmLocal(slot));
    if (selectedEvent?.start_time) {
      const current = toHHmmLocal(selectedEvent.start_time);
      if (!fromSlots.includes(current)) fromSlots.unshift(current);
    }
    // quitar duplicados sin usar Set iterable
    return fromSlots.filter((v: string, i: number, self: string[]) => self.indexOf(v) === i);
  }, [availableSlots, selectedEvent]);

  const canSubmit = useMemo(() => {
    return validation.isValid && !validation.isSubmitting;
  }, [validation.isValid, validation.isSubmitting]);

  const getStartTimePlaceholder = () => {
    if (!validation.values.service_id) return "Seleccione un servicio...";
    if (isLoadingStylists) return "Buscando especialistas...";
    if (validation.values.service_id && !validation.values.stylist_id && stylistsForService.length > 1) {
        return "Seleccione un estilista primero";
    }
    if (isSlotLoading) return "Buscando horarios...";
    if (!validation.values.stylist_id) return "Seleccione un estilista...";
    return "Seleccione un horario...";
  };

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
              <Col xs={12} className="mb-3">
                <Label>Estilista*</Label>
                <Input type="select" name="stylist_id" onChange={validation.handleChange} value={validation.values.stylist_id} disabled={!service_id || isLoadingStylists}>
                  <option value="">{isLoadingStylists ? "Cargando especialistas..." : "Seleccione..."}</option>
                  {stylistsForService.map((s: Stylist) => (
                    <option
                      key={String(s.id)}
                      value={String(s.id)}
                      disabled={String(validation.values.stylist_id) !== String(s.id) && extraRows.some(r => String(r.stylist_id) === String(s.id))}
                    >
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
                </Input>
              </Col>
              <Col md={6} className="mb-3">
                <Label>Fecha*</Label>
                <Flatpickr className="form-control" value={validation.values.date as any} onChange={([d]) => validation.setFieldValue('date', d)} options={{ dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y", minDate: "today" }}/>
              </Col>
              <Col md={6} className="mb-3">
                <Label>Hora*</Label>
                <Input 
                  type="select" 
                  name="start_time" 
                  onChange={validation.handleChange} 
                  value={validation.values.start_time}
                  disabled={!validation.values.stylist_id || !validation.values.date || isSlotLoading}
                >
                  <option value="">{getStartTimePlaceholder()}</option>
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </Input>
              </Col>

              {/* Servicios adicionales (solo en creación) */}
              {!selectedEvent && (
                <Col xs={12} className="mb-2">
                  <div className="d-flex align-items-center justify-content-between">
                    <h6 className="mb-0">Servicios adicionales</h6>
                    <Button color="secondary" size="sm" onClick={addExtraRow}>Añadir Servicio</Button>
                  </div>
                  <small className="text-muted">Se usan la misma <b>fecha</b> y <b>hora</b> de la cita principal.</small>
                </Col>
              )}

              {!selectedEvent && extraRows.map((row, idx) => {
                const rowStylists = stylistsForRows[idx] || [];
                const rowLoading = !!isLoadingStylistsRow[idx];
                return (
                  <Col xs={12} key={`extra-row-${idx}`} className="border rounded p-3 mb-2">
                    <Row className="align-items-end">
                      <Col md={6} className="mb-2">
                        <Label>Servicio (#{idx + 1})*</Label>
                        <Input
                          type="select"
                          value={row.service_id}
                          onChange={(e) => handleExtraServiceChange(idx, e.target.value)}
                        >
                          <option value="">Seleccione un servicio...</option>
                          {services.map((s: any) => (
                            <option key={s.id} value={String(s.id)}>{s.name}</option>
                          ))}
                        </Input>
                      </Col>
                      <Col md={5} className="mb-2">
                        <Label>Estilista*</Label>
                        <Input
                          type="select"
                          value={row.stylist_id}
                          onChange={(e) => changeExtraRow(idx, 'stylist_id', e.target.value)}
                          disabled={!row.service_id || rowLoading}
                        >
                          <option value="">{!row.service_id ? "Seleccione un servicio primero..." : (rowLoading ? "Cargando estilistas..." : "Seleccione un estilista...")}</option>
                          {rowStylists.map((s: any) => (
                            <option
                              key={s.id}
                              value={String(s.id)}
                              disabled={
                                String(row.stylist_id) !== String(s.id) &&
                                (
                                  String(validation.values.stylist_id) === String(s.id) ||
                                  isTakenByOtherRows(String(s.id), idx)
                                )
                              }
                            >
                              {s.first_name} {s.last_name}
                            </option>
                          ))}
                        </Input>
                      </Col>
                      <Col md={1} className="mb-2 d-flex justify-content-end">
                        <Button color="link" className="text-danger" onClick={() => removeExtraRow(idx)} title="Eliminar fila">
                          <i className="ri-delete-bin-6-line"></i>
                        </Button>
                      </Col>
                    </Row>
                  </Col>
                );
              })}
            </Row>
            {stylistConflict && (
              <div className="alert alert-warning py-1 px-2 mb-2">
                <small>{stylistConflict}</small>
              </div>
            )}
            <div className="hstack gap-2 justify-content-end">
              <Button type="button" color="light" onClick={toggle}>Cancelar</Button>
              <Button type="submit" color="success" disabled={!canSubmit || !!stylistConflict}>
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
