// src/pages/Calendar/index.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Card, CardBody, Container, Form, Input, Label,
  Modal, ModalBody, ModalHeader, Row, Col, Button, Spinner
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
  suggestStylist
} from "../../slices/thunks";

// Componentes
import BreadCrumb from "../../Components/Common/BreadCrumb";
import CentroDeCitasDiarias from "../../Components/Calendar/CentroDeCitasDiarias";

// Tipos
interface AppointmentFormValues {
  client_id: string;
  service_id: string;
  stylist_id: string;
  date: string | Date;
  start_time: string; // HH:mm
  newClientFirstName: string;
  newClientLastName: string;
  newClientPhone: string;
  newClientEmail: string;
}

type Stylist = { id: string | number; first_name?: string; last_name?: string };

type ExtraRow = { service_id: string; stylist_id: string };

// ——————————————————————————————————————————————————————————————————————
// Helpers
const toHHmmLocal = (d: string | Date) => {
  const dt = new Date(d);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const generateTimes = (start = 8, end = 20, stepMin = 30): string[] => {
  const out: string[] = [];
  for (let h = start; h <= end; h++) {
    for (let m = 0; m < 60; m += stepMin) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      out.push(`${hh}:${mm}`);
    }
  }
  return out;
};
// ——————————————————————————————————————————————————————————————————————

const Calendar = () => {
  document.title = "Calendario | Sistema de Peluquerías";
  const dispatch: any = useDispatch();
  const navigate = useNavigate();

  const { events, clients, services, loading } = useSelector((state: any) => state.Calendar);

  const [modal, setModal] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showNewClientForm, setShowNewClientForm] = useState<boolean>(false);

  // Estilistas del servicio principal (sin filtrar por hora)
  const [stylistsForService, setStylistsForService] = useState<Stylist[]>([]);
  const [isLoadingStylists, setIsLoadingStylists] = useState<boolean>(false);

  // Estilistas libres (filtrados por fecha + hora)
  const [freeStylistsMain, setFreeStylistsMain] = useState<Stylist[]>([]);
  const [checkingMainFree, setCheckingMainFree] = useState<boolean>(false);

  // ▼▼ Estados para multi-servicio (extras)
  const [extraRows, setExtraRows] = useState<ExtraRow[]>([]);
  const [stylistsForRows, setStylistsForRows] = useState<Record<number, Stylist[]>>({});
  const [freeStylistsForRows, setFreeStylistsForRows] = useState<Record<number, Stylist[]>>({});
  const [isLoadingStylistsRow, setIsLoadingStylistsRow] = useState<Record<number, boolean>>({});
  const [checkingRowFree, setCheckingRowFree] = useState<Record<number, boolean>>({});

  // Estados para “Digiturno”
  const [isSuggestingMain, setIsSuggestingMain] = useState<boolean>(false);
  const [isSuggestingRow, setIsSuggestingRow] = useState<Record<number, boolean>>({});

  // Caché de disponibilidad por (stylistId + fecha)
  const availabilityCache = useRef<Record<string, Set<string>>>({});

  useEffect(() => {
    dispatch(onGetCalendarData());
  }, [dispatch]);

  const toggle = () => {
    setModal(prev => {
      if (prev) {
        setSelectedEvent(null);
        setShowNewClientForm(false);
        setStylistsForService([]);
        setFreeStylistsMain([]);
        setExtraRows([]);
        setStylistsForRows({});
        setFreeStylistsForRows({});
        setIsLoadingStylistsRow({});
        setCheckingRowFree({});
        availabilityCache.current = {};
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
    const updatedPayload = {
      ...event.extendedProps,
      id: event.id,
      start_time: event.start.toISOString()
    };
    dispatch(onUpdateAppointment(updatedPayload)).catch(() => dropInfo.revert());
  };

  const validation = useFormik<AppointmentFormValues>({
    enableReinitialize: true,
    validationSchema: Yup.object({
      service_id: Yup.string().required("Seleccione un servicio."),
      date: Yup.mixed().required("Seleccione una fecha."),
      start_time: Yup.string().required("Seleccione un horario."),
      stylist_id: Yup.string().required("Seleccione un estilista."),
      client_id: Yup.string().when([], {
        is: () => !showNewClientForm && !selectedEvent,
        then: schema => schema.required("Seleccione un cliente."),
        otherwise: schema => schema.notRequired()
      }),
      newClientFirstName: Yup.string().when([], {
        is: () => showNewClientForm,
        then: schema => schema.required("El nombre es requerido."),
        otherwise: schema => schema.notRequired()
      }),
      newClientEmail: Yup.string().when([], {
        is: () => showNewClientForm,
        then: schema => schema.email("Email inválido").required("El email es requerido."),
        otherwise: schema => schema.notRequired()
      })
    }),
    initialValues: {
      client_id: "",
      service_id: "",
      stylist_id: "",
      date: "",
      start_time: "",
      newClientFirstName: "",
      newClientLastName: "",
      newClientPhone: "",
      newClientEmail: ""
    },
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true);
      try {
        // Construir fecha/hora UTC
        const dateObj = new Date(values.date as any);
        const [hours, minutes] = values.start_time.split(":").map(Number);
        dateObj.setHours(hours, minutes, 0, 0);
        const utcDateTimeString = dateObj.toISOString();

        // Alta de cliente nuevo si corresponde
        let finalClientId = values.client_id;
        if (showNewClientForm) {
          const newClientAction = await dispatch(
            onCreateNewClient({
              first_name: values.newClientFirstName,
              last_name: values.newClientLastName,
              phone: values.newClientPhone,
              email: values.newClientEmail
            })
          );
          finalClientId = newClientAction.payload.id;
        }
        if (!finalClientId && !selectedEvent) throw new Error("ID de cliente no válido.");

        if (selectedEvent) {
          // EDICIÓN
          await dispatch(
            onUpdateAppointment({
              id: selectedEvent.id,
              client_id: selectedEvent.client_id,
              service_id: values.service_id,
              stylist_id: values.stylist_id,
              start_time: utcDateTimeString
            })
          );
          toast.success("Cita actualizada con éxito");
        } else {
          // CREACIÓN (principal + extras)
          // Evitar estilistas duplicados en el mismo turno
          const allStylistIds = [
            values.stylist_id,
            ...extraRows.map((r: ExtraRow) => r.stylist_id)
          ]
            .filter(Boolean)
            .map(String);
          const uniqueCount = new Set(allStylistIds).size;
          if (uniqueCount !== allStylistIds.length) {
            toast.error("No puedes repetir el mismo estilista en servicios simultáneos.");
            setSubmitting(false);
            return;
          }

          // principal
          await dispatch(
            onCreateAppointment({
              client_id: finalClientId,
              service_id: values.service_id,
              stylist_id: values.stylist_id,
              start_time: utcDateTimeString
            })
          );

          // extras (mismo horario)
          for (const r of extraRows) {
            if (!r.service_id || !r.stylist_id) continue;
            await dispatch(
              onCreateAppointment({
                client_id: finalClientId,
                service_id: r.service_id,
                stylist_id: r.stylist_id,
                start_time: utcDateTimeString
              })
            );
          }

          toast.success("Citas agendadas con éxito");
        }
        toggle();
      } catch (error: any) {
        toast.error(error.message || "No se pudo completar la operación.");
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Limpia el estilista si cambia el servicio (evita estados inconsistentes)
  useEffect(() => {
    validation.setFieldValue("stylist_id", "");
  }, [validation.values.service_id]);

  // —————————————————————————————————————————————
  // Carga de formulario en EDICIÓN
  // —————————————————————————————————————————————
  useEffect(() => {
    const populateFormForEdit = async () => {
      if (selectedEvent && modal) {
        const { client_id, service_id, stylist_id, start_time } = selectedEvent;
        const startTimeDate = new Date(start_time);

        // servicio principal
        setIsLoadingStylists(true);
        const actionFS: any = await dispatch(getStylistsForService(service_id));
        const filteredStylists: Stylist[] = (actionFS && 'payload' in actionFS) ? actionFS.payload : actionFS || [];
        setStylistsForService(filteredStylists || []);
        setIsLoadingStylists(false);

        const timeValue = toHHmmLocal(start_time);
        validation.setValues({
          ...validation.initialValues,
          client_id: String(client_id || ""),
          service_id: String(service_id || ""),
          stylist_id: String(stylist_id || ""),
          date: startTimeDate,
          start_time: timeValue,
          newClientFirstName: "",
          newClientLastName: "",
          newClientPhone: "",
          newClientEmail: ""
        });

        await recalcFreeStylistsMain(String(service_id), startTimeDate, timeValue, String(stylist_id));
      }
    };
    populateFormForEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent, modal, dispatch]);

  // —————————————————————————————————————————————
  // CREACIÓN: cuando cambia el servicio principal, cargo estilistas
  // —————————————————————————————————————————————
  useEffect(() => {
    if (!selectedEvent && validation.values.service_id) {
      setIsLoadingStylists(true);
      dispatch(getStylistsForService(validation.values.service_id))
        .then((action: any) => {
          const filtered: Stylist[] = (action && 'payload' in action) ? action.payload : action || [];
          setStylistsForService(filtered || []);
          setFreeStylistsMain(filtered || []); // lista base visible aunque no haya fecha/hora
        })
        .finally(() => setIsLoadingStylists(false));
    } else if (!validation.values.service_id) {
      setStylistsForService([]);
      setFreeStylistsMain([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.values.service_id, selectedEvent]);

  // —————————————————————————————————————————————
  // Recalcular estilistas libres al cambiar fecha/hora/servicio
  // —————————————————————————————————————————————
  useEffect(() => {
    const dateVal = validation.values.date;
    const timeVal = validation.values.start_time;
    const serviceId = validation.values.service_id;
    if (serviceId && dateVal && timeVal) {
      recalcFreeStylistsMain(
        String(serviceId),
        new Date(dateVal as any),
        timeVal,
        selectedEvent?.stylist_id ? String(selectedEvent.stylist_id) : undefined
      );
    } else {
      setFreeStylistsMain(stylistsForService);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.values.service_id, validation.values.date, validation.values.start_time, stylistsForService]);

  // —————————————————————————————————————————————
  // Helpers de disponibilidad
  // —————————————————————————————————————————————
  const getAvailSet = async (stylistId: string | number, dateStr: string): Promise<Set<string>> => {
    const key = `${stylistId}:${dateStr}`;
    if (availabilityCache.current[key]) return availabilityCache.current[key];

    const slots: any[] = await dispatch(onFetchAvailability(String(stylistId), dateStr)).catch(() => []);
    const hhmmSet = new Set<string>();
    (slots || []).forEach((slot: string) => {
      hhmmSet.add(toHHmmLocal(slot));
    });
    availabilityCache.current[key] = hhmmSet;
    return hhmmSet;
  };

  const recalcFreeStylistsMain = async (
    serviceId: string,
    dateObj: Date,
    hhmm: string,
    ensureIncludeStylistId?: string
  ) => {
    if (!serviceId || !dateObj || !hhmm) return;
    // Usar fecha local (Bogotá) para evitar desajustes por UTC
    const dateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD local
    setCheckingMainFree(true);
    try {
      const base = stylistsForService || [];
      const free: Stylist[] = [];
      for (const s of base) {
        const set = await getAvailSet(s.id, dateStr);
        if (set.has(hhmm)) free.push(s);
      }
      if (ensureIncludeStylistId && !free.some(f => String(f.id) === ensureIncludeStylistId)) {
        const current = base.find(b => String(b.id) === ensureIncludeStylistId);
        if (current) free.unshift(current);
      }
      setFreeStylistsMain(free);
      if (validation.values.stylist_id && !free.some(f => String(f.id) === String(validation.values.stylist_id))) {
        validation.setFieldValue("stylist_id", "");
      }
    } finally {
      setCheckingMainFree(false);
    }
  };

  const recalcFreeStylistsRow = async (idx: number, serviceId: string, dateObj: Date, hhmm: string) => {
    if (!serviceId || !dateObj || !hhmm) {
      setFreeStylistsForRows(p => ({ ...p, [idx]: stylistsForRows[idx] || [] }));
      return;
    }
    const dateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD local
    setCheckingRowFree(p => ({ ...p, [idx]: true }));
    try {
      const base = stylistsForRows[idx] || [];
      const free: Stylist[] = [];
      for (const s of base) {
        const set = await getAvailSet(s.id, dateStr);
        if (set.has(hhmm)) free.push(s);
      }
      setFreeStylistsForRows(p => ({ ...p, [idx]: free }));
      const curr = extraRows[idx]?.stylist_id;
      if (curr && !free.some(f => String(f.id) === String(curr))) {
        changeExtraRow(idx, "stylist_id", "");
      }
    } finally {
      setCheckingRowFree(p => ({ ...p, [idx]: false }));
    }
  };

  // —————————————————————————————————————————————
  // Multi-servicio: handlers
  // —————————————————————————————————————————————
  const addExtraRow = () =>
    setExtraRows((prev: ExtraRow[]) => [...prev, { service_id: "", stylist_id: "" }]);

  const removeExtraRow = (idx: number) => {
    setExtraRows((prev: ExtraRow[]) => prev.filter((_, i: number) => i !== idx));
    setStylistsForRows(prev => {
      const c = { ...prev };
      delete c[idx];
      return c;
    });
    setFreeStylistsForRows(prev => {
      const c = { ...prev };
      delete c[idx];
      return c;
    });
    setIsLoadingStylistsRow(prev => {
      const c = { ...prev };
      delete c[idx];
      return c;
    });
    setCheckingRowFree(prev => {
      const c = { ...prev };
      delete c[idx];
      return c;
    });
  };

  const changeExtraRow = (idx: number, field: keyof ExtraRow, value: string) => {
    setExtraRows((prev: ExtraRow[]) =>
      prev.map((r: ExtraRow, i: number) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const isStylistUsedElsewhere = (stylistId: string | number, rowIndex?: number) => {
    const idStr = String(stylistId);
    if (String(validation.values.stylist_id) === idStr && rowIndex !== undefined) return true;
    return extraRows.some((r: ExtraRow, i: number) => i !== rowIndex && String(r.stylist_id) === idStr);
  };

  const handleExtraServiceChange = async (idx: number, serviceId: string) => {
    changeExtraRow(idx, "service_id", serviceId);
    changeExtraRow(idx, "stylist_id", "");
    if (!serviceId) {
      setStylistsForRows(p => ({ ...p, [idx]: [] }));
      setFreeStylistsForRows(p => ({ ...p, [idx]: [] }));
      return;
    }
    setIsLoadingStylistsRow(p => ({ ...p, [idx]: true }));
    try {
      const actionFSR: any = await dispatch(getStylistsForService(serviceId));
      const filtered: Stylist[] = (actionFSR && 'payload' in actionFSR) ? actionFSR.payload : actionFSR || [];
      setStylistsForRows(p => ({ ...p, [idx]: filtered || [] }));
      const d = validation.values.date as any;
      const t = validation.values.start_time;
      if (d && t) {
        await recalcFreeStylistsRow(idx, serviceId, new Date(d), t);
      } else {
        setFreeStylistsForRows(p => ({ ...p, [idx]: filtered || [] }));
      }
      const currentFree = freeStylistsForRows[idx] || [];
      const one = currentFree.length === 1 ? currentFree[0] : undefined;
      if (one && !isStylistUsedElsewhere(one.id, idx)) {
        changeExtraRow(idx, "stylist_id", String(one.id));
      }
    } finally {
      setIsLoadingStylistsRow(p => ({ ...p, [idx]: false }));
    }
  };

  useEffect(() => {
    const d = validation.values.date as any;
    const t = validation.values.start_time;
    if (!d || !t) return;
    extraRows.forEach((row, idx) => {
      if (row.service_id) recalcFreeStylistsRow(idx, row.service_id, new Date(d), t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.values.date, validation.values.start_time, extraRows.length]);

  // —————————————————————————————————————————————
  // Digiturno (principal y filas) — asegura selección automática
  // —————————————————————————————————————————————
  const ensureStylistOption = async (serviceId: string, stylist: Stylist, rowIndex?: number) => {
    if (rowIndex === undefined) {
      const exists = (stylistsForService || []).some(s => String(s.id) === String(stylist.id));
      if (!exists) {
        const actionList: any = await dispatch(getStylistsForService(serviceId));
        const list: Stylist[] = (actionList && 'payload' in actionList) ? actionList.payload : actionList || [];
        setStylistsForService(list || []);
      }
    } else {
      const base = stylistsForRows[rowIndex] || [];
      const exists = base.some(s => String(s.id) === String(stylist.id));
      if (!exists) {
        const actionList: any = await dispatch(getStylistsForService(serviceId));
        const list: Stylist[] = (actionList && 'payload' in actionList) ? actionList.payload : actionList || [];
        setStylistsForRows(p => ({ ...p, [rowIndex]: list || [] }));
      }
    }
  };

  const handleSuggestMain = async () => {
    const svc = validation.values.service_id;
    const d = validation.values.date as any;
    const t = validation.values.start_time;
    if (!svc || !d || !t) {
      toast.info("Selecciona servicio, fecha y hora antes de usar Digiturno.");
      return;
    }
    setIsSuggestingMain(true);
    try {
      const dateStr = new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD local
      const stylist: Stylist = await dispatch(suggestStylist(dateStr, t, String(svc)));

      if (extraRows.some(r => String(r.stylist_id) === String(stylist.id))) {
        toast.warning("Ese estilista ya está asignado a otro servicio en este turno.");
        return;
      }

      await ensureStylistOption(String(svc), stylist);
      await recalcFreeStylistsMain(String(svc), new Date(d), t, String(stylist.id));
      // 👉 Selección automática explícita
      validation.setFieldValue("stylist_id", String(stylist.id), true);
      toast.success(`Digiturno asignó a: ${stylist.first_name || "Estilista"} ${stylist.last_name || ""}`);
    } catch {
      // manejado por thunk
    } finally {
      setIsSuggestingMain(false);
    }
  };

  const handleSuggestForRow = async (idx: number) => {
    const row = extraRows[idx];
    const d = validation.values.date as any;
    const t = validation.values.start_time;
    if (!row?.service_id || !d || !t) {
      toast.info("Selecciona servicio, fecha y hora antes de usar Digiturno en esta fila.");
      return;
    }
    setIsSuggestingRow(p => ({ ...p, [idx]: true }));
    try {
      const dateStr = new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD local
      const stylist: Stylist = await dispatch(suggestStylist(dateStr, t, String(row.service_id)));

      if (String(validation.values.stylist_id) === String(stylist.id) || isStylistUsedElsewhere(stylist.id, idx)) {
        toast.warning("Ese estilista ya está asignado en otro servicio del mismo turno.");
        return;
      }

      await ensureStylistOption(String(row.service_id), stylist, idx);
      await recalcFreeStylistsRow(idx, String(row.service_id), new Date(d), t);
      // 👉 Selección automática explícita
      changeExtraRow(idx, "stylist_id", String(stylist.id));
      toast.success(`Digiturno (fila ${idx + 2}) asignó a: ${stylist.first_name || "Estilista"} ${stylist.last_name || ""}`);
    } catch {
      // manejado por thunk
    } finally {
      setIsSuggestingRow(p => ({ ...p, [idx]: false }));
    }
  };

  // —————————————————————————————————————————————
  // UI helpers
  // —————————————————————————————————————————————
  const timeOptions = useMemo(() => {
    const base = generateTimes(8, 20, 30);
    const current = selectedEvent?.start_time ? toHHmmLocal(selectedEvent.start_time) : null;
    if (current && !base.includes(current)) base.unshift(current);
    return base.filter((v: string, i: number, self: string[]) => self.indexOf(v) === i);
  }, [selectedEvent]);

  const canSubmit = useMemo(
    () => validation.isValid && !validation.isSubmitting,
    [validation.isValid, validation.isSubmitting]
  );

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

      {/* MODAL */}
      <Modal isOpen={modal} toggle={toggle} centered size="lg">
        <ModalHeader toggle={toggle} tag="h5" className="p-3 bg-light">
          {!!selectedEvent ? "Editar Cita" : "Agendar Cita"}
        </ModalHeader>
        <ModalBody>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              validation.handleSubmit();
            }}
          >
            <Row>
              {/* Cliente */}
              <Col xs={12} className="mb-3">
                {showNewClientForm ? (
                  <div>
                    <h5>Datos del Nuevo Cliente</h5>
                    <Row>
                      <Col md={6} className="mb-2">
                        <Label>Nombre*</Label>
                        <Input
                          name="newClientFirstName"
                          onChange={validation.handleChange}
                          value={validation.values.newClientFirstName}
                          invalid={!!(validation.touched.newClientFirstName && validation.errors.newClientFirstName)}
                        />
                      </Col>
                      <Col md={6} className="mb-2">
                        <Label>Apellido</Label>
                        <Input
                          name="newClientLastName"
                          onChange={validation.handleChange}
                          value={validation.values.newClientLastName}
                        />
                      </Col>
                      <Col md={6} className="mb-2">
                        <Label>Email*</Label>
                        <Input
                          name="newClientEmail"
                          type="email"
                          onChange={validation.handleChange}
                          value={validation.values.newClientEmail}
                          invalid={!!(validation.touched.newClientEmail && validation.errors.newClientEmail)}
                        />
                      </Col>
                      <Col md={6} className="mb-2">
                        <Label>Teléfono</Label>
                        <Input
                          name="newClientPhone"
                          onChange={validation.handleChange}
                          value={validation.values.newClientPhone}
                        />
                      </Col>
                    </Row>
                    <Button color="link" size="sm" onClick={() => setShowNewClientForm(false)} className="ps-0">
                      O seleccionar cliente existente
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: selectedEvent ? "none" : "block" }}>
                    <Label>Cliente Existente*</Label>
                    <Input
                      type="select"
                      name="client_id"
                      onChange={validation.handleChange}
                      value={validation.values.client_id}
                      disabled={!!selectedEvent}
                    >
                      <option value="">Seleccione...</option>
                      {clients.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </option>
                      ))}
                    </Input>
                    <Button color="link" size="sm" onClick={() => setShowNewClientForm(true)} className="ps-0">
                      Crear nuevo cliente
                    </Button>
                  </div>
                )}
                {selectedEvent && (
                  <div>
                    <Label>Cliente</Label>
                    <Input
                      type="text"
                      value={`${selectedEvent.client_first_name || ""} ${selectedEvent.client_last_name || ""}`}
                      disabled
                    />
                  </div>
                )}
              </Col>

              {/* Servicio a ancho completo */}
              <Col md={12} className="mb-3">
                <Label>Servicio*</Label>
                <Input
                  type="select"
                  name="service_id"
                  onChange={validation.handleChange}
                  value={validation.values.service_id}
                >
                  <option value="">Seleccione un servicio...</option>
                  {services.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Input>
              </Col>

              {/* Fecha y Hora lado a lado */}
              <Col md={6} className="mb-3">
                <Label>Fecha*</Label>
                <Flatpickr
                  className="form-control"
                  value={validation.values.date as any}
                  onChange={([d]) => validation.setFieldValue("date", d)}
                  options={{ dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y", minDate: "today" }}
                />
              </Col>
              <Col md={6} className="mb-3">
                <Label>Hora*</Label>
                <Input
                  type="select"
                  name="start_time"
                  onChange={validation.handleChange}
                  value={validation.values.start_time}
                  disabled={!validation.values.date}
                >
                  <option value="">
                    {!validation.values.date ? "Seleccione fecha primero..." : "Seleccione un horario..."}
                  </option>
                  {timeOptions.map((t: string) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Input>
              </Col>

              {/* Estilista (debajo) + Digiturno */}
              <Col xs={12} className="mb-3">
                <Label>Estilista*</Label>
                <div className="d-flex gap-2">
                  <Input
                    type="select"
                    name="stylist_id"
                    onChange={validation.handleChange}
                    value={validation.values.stylist_id}
                    // ✅ No bloqueamos por fecha/hora; mostramos lista base del servicio
                    disabled={
                      !validation.values.service_id ||
                      isLoadingStylists
                    }
                  >
                    <option value="">
                      {checkingMainFree ? "Calculando disponibilidad..." : "Seleccione..."}
                    </option>
                    {(freeStylistsMain.length ? freeStylistsMain : stylistsForService).map((s: Stylist) => {
                      const sid = String(s.id);
                      const disabled = extraRows.some(r => String(r.stylist_id) === sid);
                      return (
                        <option key={sid} value={sid} disabled={disabled}>
                          {s.first_name} {s.last_name}
                        </option>
                      );
                    })}
                  </Input>

                  <Button
                    color="info"
                    outline
                    onClick={handleSuggestMain}
                    title="Digiturno (sugerir estilista del turno)"
                    disabled={
                      isSuggestingMain ||
                      !validation.values.service_id ||
                      !validation.values.date ||
                      !validation.values.start_time
                    }
                  >
                    {isSuggestingMain ? <Spinner size="sm" /> : "Digiturno"}
                  </Button>
                </div>

                {extraRows.some(r => String(r.stylist_id) === String(validation.values.stylist_id)) && (
                  <div className="form-text text-danger mt-1">
                    No puedes repetir el mismo estilista en servicios simultáneos.
                  </div>
                )}
              </Col>

              {/* Filas extra (multi-servicio) */}
              {!selectedEvent && (
                <>
                  {extraRows.map((row: ExtraRow, idx: number) => {
                    const baseList = stylistsForRows[idx] || [];
                    const freeList = freeStylistsForRows[idx] || baseList;
                    const rowLoading = !!isLoadingStylistsRow[idx];
                    const rowChecking = !!checkingRowFree[idx];

                    const duplicateHere =
                      !!row.stylist_id &&
                      (String(row.stylist_id) === String(validation.values.stylist_id) ||
                        extraRows.some((r, i) => i !== idx && String(r.stylist_id) === String(row.stylist_id)));

                    return (
                      <Col xs={12} key={`extra-row-${idx}`} className="border rounded p-3 mb-2">
                        <Row className="g-3">
                          <Col md={8}>
                            <Label>Servicio #{idx + 2}</Label>
                            <Input
                              type="select"
                              value={row.service_id}
                              onChange={(e) => handleExtraServiceChange(idx, e.target.value)}
                            >
                              <option value="">Seleccione un servicio...</option>
                              {services.map((s: any) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </Input>
                          </Col>

                          <Col md={4} className="d-flex align-items-end">
                            <div className="w-100">
                              <Label>&nbsp;</Label>
                              <div className="d-flex gap-2">
                                <Button
                                  color="info"
                                  outline
                                  title="Digiturno para esta fila"
                                  onClick={() => handleSuggestForRow(idx)}
                                  disabled={
                                    isSuggestingRow[idx] ||
                                    !row.service_id ||
                                    !validation.values.date ||
                                    !validation.values.start_time
                                  }
                                >
                                  {isSuggestingRow[idx] ? <Spinner size="sm" /> : "Digiturno"}
                                </Button>
                                <Button color="danger" outline onClick={() => removeExtraRow(idx)} title="Quitar fila">
                                  <i className="ri-delete-bin-6-line"></i>
                                </Button>
                              </div>
                            </div>
                          </Col>

                          <Col md={12}>
                            <Label>Estilista (fila #{idx + 2})</Label>
                            <Input
                              type="select"
                              value={row.stylist_id}
                              onChange={(e) => changeExtraRow(idx, "stylist_id", e.target.value)}
                              // ✅ Permitimos seleccionar con la lista base aunque no haya fecha/hora
                              disabled={
                                !row.service_id ||
                                rowLoading
                              }
                            >
                              <option value="">
                                {rowLoading || rowChecking ? "Calculando disponibilidad..." : "Seleccione..."}
                              </option>
                              {(freeList.length ? freeList : baseList).map((s: Stylist) => {
                                const sid = String(s.id);
                                const disabled =
                                  String(validation.values.stylist_id) === sid ||
                                  extraRows.some((r, i) => i !== idx && String(r.stylist_id) === sid);
                                return (
                                  <option key={sid} value={sid} disabled={disabled}>
                                    {s.first_name} {s.last_name}
                                  </option>
                                );
                              })}
                            </Input>

                            {duplicateHere && (
                              <div className="form-text text-danger mt-1">
                                No puedes elegir el mismo estilista en servicios simultáneos.
                              </div>
                            )}
                          </Col>
                        </Row>
                      </Col>
                    );
                  })}

                  <Col xs={12} className="mt-2">
                    <Button color="secondary" outline onClick={addExtraRow}>
                      Añadir otro servicio
                    </Button>
                  </Col>
                </>
              )}
            </Row>

            <div className="hstack gap-2 justify-content-end mt-3">
              <Button type="button" color="light" onClick={toggle}>
                Cancelar
              </Button>
              <Button type="submit" color="success" disabled={!canSubmit}>
                {validation.isSubmitting ? (
                  <Spinner size="sm" />
                ) : !!selectedEvent ? (
                  "Guardar Cambios"
                ) : (
                  "Agendar Cita"
                )}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>
    </React.Fragment>
  );
};

export default Calendar;
