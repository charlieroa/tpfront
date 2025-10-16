// =============================================
// File: src/pages/Calendar/AppointmentModal.tsx
// (Versión completa con Modal de Creación de Cliente)
// =============================================
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

// Thunks activos
import {
  updateAppointment as onUpdateAppointment,
  createNewClient as onCreateNewClient,
  createAppointmentsBatch as onCreateAppointmentsBatch,
  fetchTenantSlots,
  fetchAvailableStylists,
  addNewContact, // Importar desde CRM
} from "../../slices/thunks";

// Tipos
interface AppointmentFormValues {
  client_id: string;
  service_id: string;
  stylist_id: string;
  date: string | Date;
  start_time: string;
}

type Stylist = { id: string | number; first_name?: string; last_name?: string };
type ExtraRow = { service_id: string; stylist_id: string };

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: any | null;
  defaultDate?: Date | null;
}

// Helpers
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
}) => {
  const dispatch: any = useDispatch();
  const { clients = [], services = [] } =
    useSelector((state: any) => state.calendar || state.Calendar || {}) || {};

  // ================== ESTADOS ==================
  const [showClientModal, setShowClientModal] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [extraRows, setExtraRows] = useState<ExtraRow[]>([]);

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState<boolean>(false);

  const [availableStylists, setAvailableStylists] = useState<Stylist[]>([]);
  const [isLoadingStylists, setIsLoadingStylists] = useState<boolean>(false);

  const [availableStylistsRows, setAvailableStylistsRows] = useState<
    Record<number, Stylist[]>
  >({});
  const [isLoadingStylistsRows, setIsLoadingStylistsRows] = useState<
    Record<number, boolean>
  >({});

  const [isSuggestingMain, setIsSuggestingMain] = useState<boolean>(false);
  const [isSuggestingRow, setIsSuggestingRow] = useState<Record<number, boolean>>(
    {}
  );

  const firstLoadEditRef = useRef<boolean>(false);
  const isEditMode = !!selectedEvent;

  // --- FORMIK PRINCIPAL (APPOINTMENT) ---
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

        if (!values.client_id && !selectedEvent)
          throw new Error("Seleccione un cliente antes de continuar.");

        if (selectedEvent) {
          await dispatch(
            onUpdateAppointment({
              id: selectedEvent.id,
              client_id: selectedEvent.client_id,
              service_id: values.service_id,
              stylist_id: values.stylist_id,
              start_time: utcDateTimeString,
            })
          );
          toast.success("Cita actualizada exitosamente");
        } else {
          const allAppointments = [
            {
              service_id: values.service_id,
              stylist_id: values.stylist_id,
              start_time: utcDateTimeString,
            },
            ...extraRows
              .filter((r) => r.service_id && r.stylist_id)
              .map((r) => ({ ...r, start_time: utcDateTimeString })),
          ];

          await dispatch(
            onCreateAppointmentsBatch({
              client_id: values.client_id,
              appointments: allAppointments,
            })
          );
          toast.success("Cita(s) agendada(s) exitosamente");
        }
        onClose();
      } catch (error: any) {
        toast.error(error.message || "No se pudo completar la operación.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  // --- FORMIK PARA CREAR CLIENTE ---
  const clientValidation = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required("El nombre es obligatorio"),
      email: Yup.string()
        .email("Debe ser un email válido")
        .required("El email es obligatorio"),
      phone: Yup.string().optional(),
      password: Yup.string()
        .min(6, "La contraseña debe tener al menos 6 caracteres")
        .required("La contraseña es obligatoria"),
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setSubmitting(true);
      try {
        const clientData = {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          phone: values.phone,
          password: values.password,
        };

        const resultAction = await dispatch(addNewContact(clientData));
        const newClient = unwrapResult(resultAction);
        
        Swal.fire({
          title: "¡Éxito!",
          text: "Cliente creado con éxito.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        // Seleccionar automáticamente el nuevo cliente
        validation.setFieldValue("client_id", newClient.id);
        
        resetForm();
        setShowClientModal(false);
        setShowPassword(false);
      } catch (err: any) {
        Swal.fire({
          title: "Error",
          text: err.error || "Ocurrió un error al crear el cliente",
          icon: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  // --- Reset / Preparación del modal ---
  useEffect(() => {
    const resetState = () => {
      validation.resetForm();
      setExtraRows([]);
      setTimeSlots([]);
      setAvailableStylists([]);
      setAvailableStylistsRows({});
    };

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
        validation.setFieldValue("date", defaultDate);
      }
    } else {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedEvent, defaultDate]);

  // --- Slots por servicio/fecha ---
  useEffect(() => {
    const { service_id, date } = validation.values;

    if (!(isEditMode && firstLoadEditRef.current)) {
      validation.setFieldValue("start_time", "");
    }

    if (service_id && date) {
      setIsLoadingTimeSlots(true);
      const dateStr = toYyyyMmDd(date);
      dispatch(fetchTenantSlots(dateStr, service_id))
        .then((payload: any) => {
          const fetched = normalizeSlotsPayload(payload);
          const current = validation.values.start_time;
          const merged =
            current && !fetched.includes(current) ? [current, ...fetched] : fetched;
          setTimeSlots(merged);
        })
        .catch(() => setTimeSlots([]))
        .finally(() => {
          setIsLoadingTimeSlots(false);
          if (firstLoadEditRef.current) firstLoadEditRef.current = false;
        });
    } else {
      setTimeSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.values.service_id, validation.values.date, dispatch]);

  // --- Estilistas disponibles por servicio/fecha/hora ---
  useEffect(() => {
    const { service_id, date, start_time } = validation.values;

    if (!(isEditMode && firstLoadEditRef.current)) {
      validation.setFieldValue("stylist_id", "");
    }

    if (service_id && date && start_time) {
      setIsLoadingStylists(true);
      const dateStr = toYyyyMmDd(date);
      dispatch(fetchAvailableStylists(dateStr, start_time, service_id))
        .then((stylists: Stylist[]) => {
          const currentId = validation.values.stylist_id;
          const hasCurrent = stylists.some(
            (s) => String(s.id) === String(currentId)
          );
          const merged = hasCurrent
            ? stylists
            : currentId
            ? [
                {
                  id: currentId,
                  first_name: currentStylistLabel || "Actual",
                  last_name: currentStylistLabel ? "" : "(asignado)",
                },
                ...stylists,
              ]
            : stylists;
          setAvailableStylists(merged);
        })
        .catch(() => setAvailableStylists([]))
        .finally(() => {
          setIsLoadingStylists(false);
          if (firstLoadEditRef.current) firstLoadEditRef.current = false;
        });
    } else {
      setAvailableStylists([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    validation.values.service_id,
    validation.values.date,
    validation.values.start_time,
    dispatch,
  ]);

  // --- Cambio de servicio en filas extra ---
  const handleExtraRowServiceChange = (rowIndex: number, newServiceId: string) => {
    setExtraRows((rows) =>
      rows.map((row, i) =>
        i === rowIndex ? { service_id: newServiceId, stylist_id: "" } : row
      )
    );
    setAvailableStylistsRows((prev) => ({ ...prev, [rowIndex]: [] }));
  };

  // --- Estilistas disponibles por fila extra ---
  useEffect(() => {
    const { date, start_time } = validation.values;
    if (date && start_time) {
      extraRows.forEach((row, index) => {
        if (row.service_id) {
          setIsLoadingStylistsRows((prev) => ({ ...prev, [index]: true }));
          const dateStr = toYyyyMmDd(date);
          dispatch(fetchAvailableStylists(dateStr, start_time, row.service_id))
            .then((stylists: Stylist[]) => {
              setAvailableStylistsRows((prev) => ({ ...prev, [index]: stylists }));
            })
            .finally(() =>
              setIsLoadingStylistsRows((prev) => ({ ...prev, [index]: false }))
            );
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    validation.values.date,
    validation.values.start_time,
    extraRows.map((r) => r.service_id).join(),
    dispatch,
  ]);

  // --- Digiturno (principal) ---
  const isStylistUsedElsewhere = (
    stylistId: string | number,
    selfIndex?: number
  ) => {
    const idStr = String(stylistId);
    if (selfIndex === undefined) {
      return extraRows.some((r) => String(r.stylist_id) === idStr);
    }
    if (String(validation.values.stylist_id) === idStr) return true;
    return extraRows.some((r, i) => i !== selfIndex && String(r.stylist_id) === idStr);
  };

  const handleSuggestMain = async () => {
    const { service_id, date, start_time } = validation.values;
    if (!service_id || !date || !start_time) {
      toast.info("Selecciona servicio, fecha y hora antes de usar Digiturno.");
      return;
    }
    setIsSuggestingMain(true);
    try {
      const dateStr = toYyyyMmDd(date);
      const stylists: Stylist[] = await dispatch(
        fetchAvailableStylists(dateStr, start_time, service_id)
      );
      const nextStylist = stylists.find((s) => !isStylistUsedElsewhere(s.id));
      if (nextStylist) {
        validation.setFieldValue("stylist_id", String(nextStylist.id));
        toast.success(`Digiturno asignó a: ${nextStylist.first_name || ""}`);
      } else {
        toast.error(
          "No hay estilistas disponibles que no estén ya asignados en otro servicio."
        );
      }
    } finally {
      setIsSuggestingMain(false);
    }
  };

  // --- Digiturno (fila extra) ---
  const handleSuggestForRow = async (rowIndex: number) => {
    const { date, start_time } = validation.values;
    const { service_id } = extraRows[rowIndex] || {};
    if (!service_id || !date || !start_time) {
      toast.info(
        "Selecciona servicio, fecha y hora antes de usar Digiturno en esta fila."
      );
      return;
    }
    setIsSuggestingRow((p) => ({ ...p, [rowIndex]: true }));
    try {
      const dateStr = toYyyyMmDd(date);
      const stylists: Stylist[] = await dispatch(
        fetchAvailableStylists(dateStr, start_time, service_id)
      );
      const nextStylist = stylists.find(
        (s) => !isStylistUsedElsewhere(s.id, rowIndex)
      );
      if (nextStylist) {
        setExtraRows((rows) =>
          rows.map((r, i) =>
            i === rowIndex ? { ...r, stylist_id: String(nextStylist.id) } : r
          )
        );
        toast.success(`Digiturno asignó a: ${nextStylist.first_name || ""}`);
      } else {
        toast.error("No hay estilistas disponibles para esta fila.");
      }
    } finally {
      setIsSuggestingRow((p) => ({ ...p, [rowIndex]: false }));
    }
  };

  // --- Helpers UI ---
  const addExtraRow = () =>
    setExtraRows((prev) => [...prev, { service_id: "", stylist_id: "" }]);

  const removeExtraRow = (idx: number) =>
    setExtraRows((prev) => prev.filter((_, i) => i !== idx));

  const changeExtraRow = (
    idx: number,
    field: keyof ExtraRow,
    value: string
  ) => {
    if (field === "service_id") {
      handleExtraRowServiceChange(idx, value);
    } else {
      setExtraRows((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
      );
    }
  };

  const canSubmit = useMemo(
    () => validation.isValid && !validation.isSubmitting,
    [validation.isValid, validation.isSubmitting]
  );

  // === Fallbacks ===
  const clientMissing =
    !!validation.values.client_id &&
    !clients.some((c: any) => String(c.id) === String(validation.values.client_id));
  const timeMissing =
    !!validation.values.start_time &&
    !timeSlots.includes(validation.values.start_time);
  const stylistMissing =
    !!validation.values.stylist_id &&
    !availableStylists.some(
      (s) => String(s.id) === String(validation.values.stylist_id)
    );

  const currentStylistLabel = (() => {
    const id = validation.values.stylist_id;
    if (!id) return "";
    const ev = selectedEvent || {};
    const f = ev.stylist_first_name || ev.stylist?.first_name || ev.first_name;
    const l = ev.stylist_last_name || ev.stylist?.last_name || ev.last_name;
    if (f || l) return `${f || ""} ${l || ""}`.trim();
    const found = availableStylists.find((s) => String(s.id) === String(id));
    if (found) return `${found.first_name || ""} ${found.last_name || ""}`.trim();
    return `ID ${id}`;
  })();

  // --- RENDER ---
  return (
    <>
      {/* MODAL PRINCIPAL DE APPOINTMENT */}
      <Modal isOpen={isOpen} toggle={onClose} centered size="lg">
        <ModalHeader toggle={onClose} tag="h5" className="p-3 bg-light">
          {isEditMode ? "Editar Cita" : "Agendar Cita"}
        </ModalHeader>
        <ModalBody>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              validation.handleSubmit();
            }}
            className="text-start"
          >
            <Row className="g-3">
              {/* ================= Cliente ================= */}
              <Col xs={12}>
                <FormGroup className="mb-0">
                  <Label>Cliente*</Label>
                  <Row className="g-2 align-items-end">
                    <Col md={isEditMode ? 12 : 9}>
                      <Input
                        type="select"
                        name="client_id"
                        onChange={validation.handleChange}
                        value={validation.values.client_id}
                        disabled={isEditMode}
                        invalid={
                          !!(
                            validation.touched.client_id &&
                            validation.errors.client_id
                          )
                        }
                      >
                        <option value="">
                          {clients.length ? "Seleccione…" : "Cargando…"}
                        </option>
                        {clientMissing && (
                          <option value={validation.values.client_id}>
                            Cliente actual (ID {validation.values.client_id})
                          </option>
                        )}
                        {clients.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                          </option>
                        ))}
                      </Input>
                      {validation.touched.client_id &&
                        validation.errors.client_id && (
                          <FormFeedback className="d-block">
                            {validation.errors.client_id}
                          </FormFeedback>
                        )}
                    </Col>
                    {!isEditMode && (
                      <Col md="auto">
                        <Button
                          color="secondary"
                          outline
                          onClick={() => setShowClientModal(true)}
                          type="button"
                        >
                          <i className="ri-add-fill me-1"></i>
                          Crear nuevo cliente
                        </Button>
                      </Col>
                    )}
                  </Row>
                </FormGroup>
              </Col>

              {/* ================= Servicio ================= */}
              <Col xs={12}>
                <FormGroup className="mb-0">
                  <Label>Servicio*</Label>
                  <Input
                    type="select"
                    name="service_id"
                    onChange={validation.handleChange}
                    value={validation.values.service_id}
                    disabled={!services?.length}
                  >
                    <option value="">
                      {services?.length
                        ? "Seleccione un servicio..."
                        : "Cargando servicios..."}
                    </option>
                    {services?.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>

              {/* ================= Fecha y Hora ================= */}
              <Col md={6}>
                <FormGroup className="mb-0">
                  <Label>Fecha*</Label>
                  <Flatpickr
                    className="form-control"
                    value={validation.values.date as any}
                    onChange={([d]) => validation.setFieldValue("date", d)}
                    options={{
                      dateFormat: "Y-m-d",
                      altInput: true,
                      altFormat: "F j, Y",
                      minDate: isEditMode ? undefined : "today",
                    }}
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup className="mb-0">
                  <Label>Hora*</Label>
                  <Input
                    type="select"
                    name="start_time"
                    onChange={validation.handleChange}
                    value={validation.values.start_time}
                    disabled={isLoadingTimeSlots || !validation.values.date}
                  >
                    <option value="">
                      {isLoadingTimeSlots
                        ? "Buscando horarios..."
                        : !validation.values.date
                        ? "Seleccione fecha..."
                        : "Seleccione horario..."}
                    </option>
                    {timeMissing && (
                      <option value={validation.values.start_time}>
                        {validation.values.start_time} (actual)
                      </option>
                    )}
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>

              {/* ================= Estilista + Digiturno ================= */}
              <Col xs={12}>
                <FormGroup className="mb-0">
                  <Label>Estilista*</Label>
                  <div className="d-flex gap-2">
                    <Input
                      type="select"
                      name="stylist_id"
                      onChange={validation.handleChange}
                      value={validation.values.stylist_id}
                      disabled={isLoadingStylists || !validation.values.start_time}
                    >
                      <option value="">
                        {isLoadingStylists ? "Buscando disponibles..." : "Seleccione..."}
                      </option>
                      {stylistMissing && validation.values.stylist_id && (
                        <option value={validation.values.stylist_id}>
                          {currentStylistLabel || `Estilista actual (ID ${validation.values.stylist_id})`}
                        </option>
                      )}
                      {availableStylists.map((stylist) => (
                        <option key={stylist.id} value={stylist.id}>
                          {stylist.first_name} {stylist.last_name}
                        </option>
                      ))}
                    </Input>
                    <Button
                      color="info"
                      outline
                      onClick={handleSuggestMain}
                      title="Digiturno (sugerir estilista del turno)"
                      disabled={isSuggestingMain || !validation.values.start_time}
                      type="button"
                    >
                      {isSuggestingMain ? <Spinner size="sm" /> : "Digiturno"}
                    </Button>
                  </div>
                </FormGroup>
              </Col>

              {/* ================= Filas Extra ================= */}
              {!isEditMode && (
                <>
                  {extraRows.map((row, idx) => {
                    const stylistsForThisRow = availableStylistsRows[idx] || [];
                    const isLoadingThisRow = isLoadingStylistsRows[idx];
                    const isSuggestingThisRow = isSuggestingRow[idx];
                    return (
                      <Col xs={12} key={`extra-row-${idx}`} className="border rounded p-3">
                        <Row className="g-2 align-items-end">
                          <Col sm={6}>
                            <FormGroup className="mb-0">
                              <Label>Servicio #{idx + 2}</Label>
                              <Input
                                type="select"
                                value={row.service_id}
                                onChange={(e) =>
                                  changeExtraRow(idx, "service_id", e.target.value)
                                }
                              >
                                <option value="">Seleccione...</option>
                                {services.map((s: any) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </Input>
                            </FormGroup>
                          </Col>
                          <Col sm={6}>
                            <FormGroup className="mb-0">
                              <Label>Estilista #{idx + 2}</Label>
                              <div className="d-flex gap-2">
                                <Input
                                  type="select"
                                  value={row.stylist_id}
                                  onChange={(e) =>
                                    changeExtraRow(idx, "stylist_id", e.target.value)
                                  }
                                  disabled={isLoadingThisRow || !row.service_id}
                                >
                                  <option value="">
                                    {isLoadingThisRow ? "Buscando..." : "Seleccione..."}
                                  </option>
                                  {stylistsForThisRow.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.first_name} {s.last_name}
                                    </option>
                                  ))}
                                </Input>
                                <Button
                                  color="info"
                                  outline
                                  onClick={() => handleSuggestForRow(idx)}
                                  disabled={isSuggestingThisRow || !row.service_id}
                                  title="Digiturno para esta fila"
                                  type="button"
                                >
                                  {isSuggestingThisRow ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    <i className="ri-magic-line"></i>
                                  )}
                                </Button>
                                <Button
                                  color="danger"
                                  outline
                                  onClick={() => removeExtraRow(idx)}
                                  title="Eliminar servicio"
                                  type="button"
                                >
                                  <i className="ri-delete-bin-6-line"></i>
                                </Button>
                              </div>
                            </FormGroup>
                          </Col>
                        </Row>
                      </Col>
                    );
                  })}

                  <Col xs={12}>
                    <Button color="secondary" outline onClick={addExtraRow} type="button">
                      Añadir otro servicio
                    </Button>
                  </Col>
                </>
              )}
            </Row>

            <div className="hstack gap-2 justify-content-end mt-3">
              <Button type="button" color="light" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" color="success" disabled={!canSubmit}>
                {validation.isSubmitting ? (
                  <Spinner size="sm" />
                ) : isEditMode ? (
                  "Guardar Cambios"
                ) : (
                  "Agendar Cita"
                )}
              </Button>
            </div>
          </Form>
        </ModalBody>
      </Modal>

      {/* MODAL PARA CREAR CLIENTE */}
      <Modal 
        isOpen={showClientModal} 
        toggle={() => {
          setShowClientModal(false);
          clientValidation.resetForm();
          setShowPassword(false);
        }} 
        centered
      >
        <ModalHeader 
          className="bg-primary-subtle p-3" 
          toggle={() => {
            setShowClientModal(false);
            clientValidation.resetForm();
            setShowPassword(false);
          }}
        >
          Crear Nuevo Cliente
        </ModalHeader>
        <Form onSubmit={clientValidation.handleSubmit}>
          <ModalBody>
            <Row className="g-3">
              <Col md={6}>
                <Label htmlFor="first_name-field">Nombre*</Label>
                <Input
                  name="first_name"
                  onChange={clientValidation.handleChange}
                  onBlur={clientValidation.handleBlur}
                  value={clientValidation.values.first_name}
                  invalid={
                    !!(
                      clientValidation.touched.first_name &&
                      clientValidation.errors.first_name
                    )
                  }
                />
                {clientValidation.touched.first_name &&
                  clientValidation.errors.first_name && (
                    <FormFeedback>
                      {clientValidation.errors.first_name as string}
                    </FormFeedback>
                  )}
              </Col>
              <Col md={6}>
                <Label htmlFor="last_name-field">Apellido</Label>
                <Input
                  name="last_name"
                  onChange={clientValidation.handleChange}
                  onBlur={clientValidation.handleBlur}
                  value={clientValidation.values.last_name}
                />
              </Col>
              <Col md={12}>
                <Label htmlFor="email-field">Email*</Label>
                <Input
                  name="email"
                  type="email"
                  onChange={clientValidation.handleChange}
                  onBlur={clientValidation.handleBlur}
                  value={clientValidation.values.email}
                  invalid={
                    !!(
                      clientValidation.touched.email &&
                      clientValidation.errors.email
                    )
                  }
                />
                {clientValidation.touched.email &&
                  clientValidation.errors.email && (
                    <FormFeedback>
                      {clientValidation.errors.email as string}
                    </FormFeedback>
                  )}
              </Col>
              <Col md={12}>
                <Label htmlFor="phone-field">Teléfono</Label>
                <Input
                  name="phone"
                  onChange={clientValidation.handleChange}
                  onBlur={clientValidation.handleBlur}
                  value={clientValidation.values.phone}
                />
              </Col>
              <Col md={12}>
                <Label htmlFor="password-field">Contraseña*</Label>
                <InputGroup>
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    onChange={clientValidation.handleChange}
                    onBlur={clientValidation.handleBlur}
                    value={clientValidation.values.password}
                    invalid={
                      !!(
                        clientValidation.touched.password &&
                        clientValidation.errors.password
                      )
                    }
                  />
                  <button
                    className="btn btn-light"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i
                      className={
                        showPassword ? "ri-eye-off-fill" : "ri-eye-fill"
                      }
                    ></i>
                  </button>
                  {clientValidation.touched.password &&
                    clientValidation.errors.password && (
                      <FormFeedback>
                        {clientValidation.errors.password as string}
                      </FormFeedback>
                    )}
                </InputGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <div className="hstack gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  setShowClientModal(false);
                  clientValidation.resetForm();
                  setShowPassword(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-success"
                disabled={clientValidation.isSubmitting}
              >
                {clientValidation.isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  "Crear Cliente"
                )}
              </button>
            </div>
          </ModalFooter>
        </Form>
      </Modal>
    </>
  );
};

export default AppointmentModal;