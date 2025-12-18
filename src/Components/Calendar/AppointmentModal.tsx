import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Col,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Row,
  Spinner,
  FormFeedback,
  InputGroup,
} from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import Flatpickr from "react-flatpickr";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { unwrapResult } from '@reduxjs/toolkit';
import Swal from 'sweetalert2';
import axios from 'axios';

// Thunks
import {
  updateAppointment as onUpdateAppointment,
  createAppointmentsBatch as onCreateAppointmentsBatch,
  fetchTenantSlots,
  fetchAvailableStylists,
  addNewContact,
} from "../../slices/thunks";

// Tipos
interface AppointmentFormValues {
  client_id: string;
  service_id: string;
  stylist_id: string;
  date: string | Date;
  start_time: string;
}

// Definición de Estilista con la bandera clave
type Stylist = {
  id: string | number;
  first_name?: string;
  last_name?: string;
  is_busy?: boolean;
};

type ExtraRow = { service_id: string; stylist_id: string };

interface DigiturnoQueueItem {
  service_id: string;
  stylist_id: string;
  stylist_name: string;
  order: number;
  last_completed_at: string | null;
  total_completed: number;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: any | null;
  defaultDate?: Date | null;
  allowPastAppointments?: boolean;
}

// Helpers de fecha/hora
const toYyyyMmDd = (d: string | Date): string => {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().split("T")[0];
};

const toHHmmLocal = (d: string | Date) => {
  const dt = new Date(d);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const isSameDayLocal = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const hhmmToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const isDateInPast = (date: Date): boolean => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return checkDate < today;
};

const isDateTimeInPast = (date: Date, time: string): boolean => {
  const [hours, minutes] = time.split(":").map(Number);
  const checkDateTime = new Date(date);
  checkDateTime.setHours(hours, minutes, 0, 0);
  return checkDateTime < new Date();
};

function normalizeSlotsPayload(payload: any): string[] {
  const raw = Array.isArray(payload) ? payload : (payload?.slots ?? payload?.data?.slots ?? []);
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  const first = raw[0];
  if (typeof first === "string" && first.length === 5 && first.includes(":")) {
    return raw as string[];
  }
  if (first && typeof first === "object" && "local_time" in first) {
    return (raw as Array<{ local_time: string }>).map((s) => s.local_time);
  }
  if (typeof first === "string") {
    return (raw as string[]).map((iso) => toHHmmLocal(iso));
  }
  if (first && typeof first === "object" && "utc" in first) {
    return (raw as Array<{ utc: string }>).map((s) => toHHmmLocal(s.utc));
  }
  return [];
}

// =================================================================
// --- INICIO DEL COMPONENTE ---
// =================================================================
const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
  defaultDate,
  allowPastAppointments = false,
}) => {
  const dispatch: any = useDispatch();
  const { clients = [], services = [] } =
    useSelector((state: any) => state.calendar || state.Calendar || {}) || {};

  const tenantId = useSelector((state: any) => state.Login?.user?.tenant_id);

  // Estados
  const [showClientModal, setShowClientModal] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [extraRows, setExtraRows] = useState<ExtraRow[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState<boolean>(false);
  const [availableStylists, setAvailableStylists] = useState<Stylist[]>([]);
  const [isLoadingStylists, setIsLoadingStylists] = useState<boolean>(false);
  const [availableStylistsRows, setAvailableStylistsRows] = useState<Record<number, Stylist[]>>({});
  const [isLoadingStylistsRows, setIsLoadingStylistsRows] = useState<Record<number, boolean>>({});
  const [isSuggestingMain, setIsSuggestingMain] = useState<boolean>(false);
  const [isSuggestingRow, setIsSuggestingRow] = useState<Record<number, boolean>>({});
  const [digiturnoQueue, setDigiturnoQueue] = useState<DigiturnoQueueItem[]>([]);
  const [createdClientsMap, setCreatedClientsMap] = useState<Record<string, { first_name: string; last_name?: string }>>({});
  const [closeClientModalOnSave, setCloseClientModalOnSave] = useState<boolean>(true);

  const firstLoadEditRef = useRef<boolean>(false);
  const isEditMode = !!selectedEvent;

  // Cargar cola de digiturno (informativo)
  useEffect(() => {
    if (isOpen && tenantId) {
      axios.get(`/api/appointments/digiturno/queue/${tenantId}`)
        .then((response) => setDigiturnoQueue(response.data.queue || []))
        .catch((err) => console.error('Error Digiturno Queue:', err));
    }
  }, [isOpen, tenantId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isEditMode && defaultDate && !allowPastAppointments) {
      if (isDateInPast(defaultDate)) {
        Swal.fire({
          title: "Fecha no válida",
          html: "No se pueden crear citas en fechas pasadas.",
          icon: "warning",
          confirmButtonText: "Entendido",
        });
        onClose();
      }
    }
  }, [isOpen, isEditMode, defaultDate, allowPastAppointments, onClose]);

  // Formik Principal
  const validation = useFormik<AppointmentFormValues>({
    enableReinitialize: true,
    validationSchema: Yup.object({
      service_id: Yup.string().required("Seleccione un servicio."),
      date: Yup.mixed().required("Seleccione una fecha."),
      start_time: Yup.string().required("Seleccione un horario."),
      stylist_id: Yup.string().required("Seleccione un estilista."),
      client_id: Yup.string().when([], {
        is: () => !selectedEvent,
        then: (schema: any) => schema.required("Seleccione un cliente."),
        otherwise: (schema: any) => schema.notRequired(),
      }),
    }),
    initialValues: {
      client_id: "",
      service_id: "",
      stylist_id: "",
      date: "",
      start_time: "",
    },
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true);
      try {
        const dateObj = new Date(values.date as any);
        const [hours, minutes] = values.start_time.split(":").map(Number);
        dateObj.setHours(hours, minutes, 0, 0);
        const utcDateTimeString = dateObj.toISOString();

        if (!allowPastAppointments && isDateTimeInPast(dateObj, values.start_time)) {
          Swal.fire({ icon: 'warning', title: 'Fecha pasada', text: 'No se pueden crear citas en el pasado.' });
          setSubmitting(false);
          return;
        }
        if (!values.client_id && !selectedEvent) throw new Error("Seleccione un cliente.");

        if (selectedEvent) {
          await dispatch(onUpdateAppointment({
            id: selectedEvent.id,
            client_id: selectedEvent.client_id,
            service_id: values.service_id,
            stylist_id: values.stylist_id,
            start_time: utcDateTimeString,
          }));
          toast.success("Cita actualizada");
        } else {
          const allAppointments = [
            { service_id: values.service_id, stylist_id: values.stylist_id, start_time: utcDateTimeString },
            ...extraRows.filter((r) => r.service_id && r.stylist_id).map((r) => ({ ...r, start_time: utcDateTimeString })),
          ];
          await dispatch(onCreateAppointmentsBatch({ client_id: values.client_id, appointments: allAppointments }));
          toast.success("Cita(s) agendada(s)");
        }
        onClose();
      } catch (error: any) {
        toast.error(error?.message || "Error al agendar.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      if (selectedEvent) {
        firstLoadEditRef.current = true;
        const { client_id, service_id, stylist_id, start_time } = selectedEvent;
        const startTimeDate = new Date(start_time);
        validation.setValues({
          ...validation.initialValues,
          client_id: String(client_id || ""),
          service_id: String(service_id || ""),
          stylist_id: String(stylist_id || ""),
          date: startTimeDate,
          start_time: toHHmmLocal(start_time),
        });
      } else if (defaultDate) {
        validation.setFieldValue("date", new Date(defaultDate));
      }
    } else {
      validation.resetForm();
      setExtraRows([]);
      setTimeSlots([]);
      setAvailableStylists([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedEvent, defaultDate]);

  // Cargar Slots
  useEffect(() => {
    const { service_id, date } = validation.values;
    if (!(isEditMode && firstLoadEditRef.current)) validation.setFieldValue("start_time", "");

    if (service_id && date) {
      setIsLoadingTimeSlots(true);
      const dateStr = toYyyyMmDd(date);
      dispatch(fetchTenantSlots(dateStr, service_id))
        .then((payload: any) => {
          const fetched = normalizeSlotsPayload(payload);
          let filtered = fetched;
          if (!allowPastAppointments) {
            const selectedDate = new Date(date as any);
            const now = new Date();
            if (isSameDayLocal(selectedDate, now)) {
              const currentMins = now.getHours() * 60 + now.getMinutes();
              filtered = fetched.filter((t) => hhmmToMinutes(t) > currentMins);
            }
          }
          const current = validation.values.start_time;
          if (!filtered.includes(current) && current) validation.setFieldValue("start_time", "");
          setTimeSlots(filtered);
        })
        .finally(() => setIsLoadingTimeSlots(false));
    } else {
      setTimeSlots([]);
    }
  }, [validation.values.service_id, validation.values.date, dispatch]);

  // =========================================================
  // CARGA DE ESTILISTAS (LÓGICA SIMPLE, EL ORDEN SE HACE EN MEMO)
  // =========================================================
  useEffect(() => {
    const { service_id, date, start_time } = validation.values;
    if (!(isEditMode && firstLoadEditRef.current)) validation.setFieldValue("stylist_id", "");

    if (service_id && date && start_time) {
      setIsLoadingStylists(true);
      const dateStr = toYyyyMmDd(date);

      dispatch(fetchAvailableStylists(dateStr, start_time, service_id))
        .then((stylists: Stylist[]) => {
          // Guardamos la respuesta tal cual del backend (sin alterar orden aún)
          console.log("📥 Estilistas recibidos del backend:", stylists);
          setAvailableStylists(stylists);
        })
        .catch(() => setAvailableStylists([]))
        .finally(() => {
          setIsLoadingStylists(false);
          if (firstLoadEditRef.current) firstLoadEditRef.current = false;
        });
    } else {
      setAvailableStylists([]);
    }
  }, [validation.values.service_id, validation.values.date, validation.values.start_time, dispatch]);

  // =========================================================
  // 🔥 ORDENAMIENTO VISUAL FORZADO (MEMOIZADO) 🔥
  // =========================================================
  const sortedStylistsForDropdown = useMemo(() => {
    if (!availableStylists || availableStylists.length === 0) return [];

    // Creamos una copia para ordenar
    const sorted = [...availableStylists].sort((a, b) => {
      // Convertimos a booleano seguro
      const aBusy = Boolean(a.is_busy);
      const bBusy = Boolean(b.is_busy);

      // Queremos: Falsos (Libres) primero, Verdaderos (Ocupados) después
      if (aBusy === bBusy) return 0; // Si son iguales, respeta orden del backend
      return aBusy ? 1 : -1; // True va al final (1), False al principio (-1)
    });

    console.log("🔄 Lista Reordenada para UI (Libres primero):", sorted.map(s => `${s.first_name} (${s.is_busy})`));

    // Si hay un estilista seleccionado, lo ponemos al principio siempre (para que aparezca seleccionado)
    const currentId = validation.values.stylist_id;
    if (currentId && !sorted.find(s => String(s.id) === String(currentId))) {
      // Si el seleccionado no está en la lista (raro), no hacemos nada especial
      return sorted;
    }

    return sorted;
  }, [availableStylists, validation.values.stylist_id]);

  // Helpers
  const isStylistUsedElsewhere = (stylistId: string | number) => {
    return extraRows.some((r) => String(r.stylist_id) === String(stylistId));
  };

  // DIGITURNO
  const handleSuggestMain = async () => {
    const { service_id, date, start_time } = validation.values;
    if (!service_id || !date || !start_time) return toast.info("Complete los datos primero.");
    setIsSuggestingMain(true);
    try {
      const dateStr = toYyyyMmDd(date);
      // Pedimos de nuevo para tener el orden fresco "Justo" del backend
      const stylists: Stylist[] = await dispatch(fetchAvailableStylists(dateStr, start_time, service_id));

      // Lógica de asignación: El primero que NO esté ocupado y NO esté usado
      const nextStylist = stylists.find(s => !s.is_busy && !isStylistUsedElsewhere(s.id));

      if (nextStylist) {
        validation.setFieldValue("stylist_id", String(nextStylist.id));
        toast.success(`🎯 Asignado: ${nextStylist.first_name}`);
      } else {
        toast.warning("Todos los estilistas están ocupados.");
      }
    } catch (e) { toast.error("Error al consultar digiturno"); }
    finally { setIsSuggestingMain(false); }
  };

  // UI Helpers
  const canSubmit = useMemo(() => validation.isValid && !validation.isSubmitting, [validation.isValid, validation.isSubmitting]);
  const currentStylistLabel = (() => {
    const id = validation.values.stylist_id;
    if (!id) return "";
    const found = availableStylists.find((s) => String(s.id) === String(id));
    if (found) return `${found.first_name || ""} ${found.last_name || ""}`;
    return `Estilista Seleccionado`;
  })();

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered size="lg">
      <ModalHeader toggle={onClose} className="bg-light">
        {isEditMode ? "Editar Cita" : "Agendar Cita"}
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={(e) => { e.preventDefault(); validation.handleSubmit(); }}>
          <Row className="g-3">
            {/* Cliente */}
            <Col xs={12}>
              <FormGroup>
                <Label>Cliente*</Label>
                <Input type="select" name="client_id" onChange={validation.handleChange} value={validation.values.client_id} disabled={isEditMode}>
                  <option value="">Seleccione...</option>
                  {clients.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </Input>
              </FormGroup>
            </Col>

            {/* Servicio */}
            <Col xs={12}>
              <FormGroup>
                <Label>Servicio*</Label>
                <Input type="select" name="service_id" onChange={validation.handleChange} value={validation.values.service_id}>
                  <option value="">Seleccione...</option>
                  {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Input>
              </FormGroup>
            </Col>

            {/* Fecha/Hora */}
            <Col md={6}>
              <FormGroup>
                <Label>Fecha*</Label>
                <Flatpickr className="form-control" value={validation.values.date as any} onChange={([d]) => validation.setFieldValue("date", d)} options={{ dateFormat: "Y-m-d", minDate: "today" }} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Hora*</Label>
                <Input type="select" name="start_time" onChange={validation.handleChange} value={validation.values.start_time} disabled={isLoadingTimeSlots}>
                  <option value="">Seleccione...</option>
                  {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </Input>
              </FormGroup>
            </Col>

            {/* Estilista */}
            <Col xs={12}>
              <FormGroup>
                <Label>Estilista*</Label>
                <div className="d-flex gap-2">
                  <Input type="select" name="stylist_id" onChange={validation.handleChange} value={validation.values.stylist_id} disabled={isLoadingStylists}>
                    <option value="">{isLoadingStylists ? "Cargando..." : "Seleccione..."}</option>

                    {/* Opción Actual si existe y no está en la lista */}
                    {validation.values.stylist_id && !sortedStylistsForDropdown.find(s => String(s.id) === String(validation.values.stylist_id)) && (
                      <option value={validation.values.stylist_id}>{currentStylistLabel}</option>
                    )}

                    {/* ✅ LISTA ORDENADA CON INDICADORES VISUALES */}
                    {sortedStylistsForDropdown.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        className={s.is_busy ? "text-danger bg-light fw-bold" : "text-success fw-bold"}
                      >
                        {/* Iconos para depurar visualmente */}
                        {s.is_busy ? `🔴 (Ocupado)` : `🟢 (Libre)`} - {s.first_name} {s.last_name}
                      </option>
                    ))}
                  </Input>

                  <Button color="info" outline onClick={handleSuggestMain} disabled={isSuggestingMain} title="Asignación Inteligente">
                    {isSuggestingMain ? <Spinner size="sm" /> : <><i className="ri-magic-line me-1"></i>Digiturno</>}
                  </Button>
                </div>
              </FormGroup>
            </Col>
          </Row>

          <div className="hstack gap-2 justify-content-end mt-4">
            <Button color="light" onClick={onClose}>Cancelar</Button>
            <Button type="submit" color="success" disabled={!canSubmit}>Agendar</Button>
          </div>
        </Form>
      </ModalBody>
    </Modal>
  );
};

export default AppointmentModal;