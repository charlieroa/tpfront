// src/slices/calendar/thunk.ts
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { api } from "../../services/api";            // ⬅️ instancia única
import { getToken } from "../../services/auth";      // ⬅️ token en localStorage ("token")
import {
  getCalendarDataStart,
  getCalendarDataSuccess,
  getCalendarDataFail,
  fetchSlotsSuccess,
  fetchSlotsFail,
  createAppointmentSuccess,
  createAppointmentFail,
  createNewClientSuccess,
  createNewClientFail,
  clearSlots as clearSlotsAction,
  updateAppointmentSuccess,
  updateAppointmentFail,
} from "./reducer";

// ✅ Colores por estado
const getClassNameForStatus = (status: string) => {
  switch (status) {
    case "scheduled":
    case "rescheduled":
      return "bg-success-subtle text-success border border-success";
    case "checked_in":
      return "bg-info-subtle text-info border border-info";
    case "checked_out":
      return "bg-primary-subtle text-primary border border-primary";
    case "completed":
      return "bg-light text-secondary border";
    case "cancelled":
      return "bg-danger-subtle text-danger border border-danger";
    case "pending_approval":
      return "bg-warning-subtle text-warning border border-warning";
    default:
      return "bg-secondary-subtle text-secondary border";
  }
};

// 🔐 Tenant desde el JWT (token único "token")
const getTenantId = () => {
  const token = getToken(); // localStorage["token"]
  if (!token) throw new Error("Token de autenticación no encontrado");
  const decoded: any = jwtDecode(token);
  return decoded?.user?.tenant_id || decoded?.tenant_id;
};

/** Cargar calendario (citas + catálogos + próximo estilista) */
export const getCalendarData = () => async (dispatch: any) => {
  dispatch(getCalendarDataStart());
  try {
    const tenantId = getTenantId();
    const today = new Date();
    const year = today.getFullYear();
    const startDate = new Date(year, 0, 1).toISOString().split("T")[0];
    const endDate = new Date(year, 11, 31).toISOString().split("T")[0];

    // Hacemos todos opcionales con allSettled
    const results = await Promise.allSettled([
      api.get(`/appointments/tenant/${tenantId}`, { params: { startDate, endDate } }),
      api.get(`/users/tenant/${tenantId}`, { params: { role_id: 4 } }),
      api.get(`/services/tenant/${tenantId}`),
      api.get(`/users/tenant/${tenantId}`, { params: { role_id: 3 } }),
      // "next-available" puede no existir → no bloquea el resto
      api.get(`/stylists/next-available`, { params: { tenant_id: tenantId } }),
    ]);

    const [rApps, rClients, rServices, rStylists, rNext] = results;

    const appointments = rApps.status === "fulfilled" ? rApps.value.data : [];
    const clients     = rClients.status === "fulfilled" ? rClients.value.data : [];
    const services    = rServices.status === "fulfilled" ? rServices.value.data : [];
    const stylists    = rStylists.status === "fulfilled" ? rStylists.value.data : [];
    const nextAvail   = rNext.status === "fulfilled" ? rNext.value.data : null;

    if (rNext.status === "rejected") {
      // Log suave para que veas el 404 pero no rompa nada
      console.warn("[getCalendarData] next-available falló:", rNext.reason?.response?.status || rNext.reason?.message);
    }

    const formattedEvents = (Array.isArray(appointments) ? appointments : []).map((cita: any) => ({
      id: cita.id,
      title: `${cita.service_name} - ${cita.client_first_name || ""}`,
      start: cita.start_time,
      end: cita.end_time,
      className: getClassNameForStatus(cita.status),
      extendedProps: { ...cita },
    }));

    dispatch(
      getCalendarDataSuccess({
        events: formattedEvents,
        clients: Array.isArray(clients) ? clients : [],
        services: Array.isArray(services) ? services : [],
        stylists: Array.isArray(stylists) ? stylists : [],
        nextAvailableStylist: nextAvail || null,
      })
    );
  } catch (error: any) {
    dispatch(getCalendarDataFail(error?.message || "Error desconocido"));
  }
};


/** Disponibilidad por estilista/fecha */
export const fetchAvailability = (stylistId: string, date: string) => async (dispatch: any) => {
  try {
    const tenantId = getTenantId();
    // console.log('[Thunk] fetchAvailability', { tenantId, stylistId, date });
    const { data } = await api.get(`/appointments/availability`, {
      params: { tenant_id: tenantId, stylist_id: stylistId, date },
    });
    const slots = data?.availableSlots || [];
    dispatch(fetchSlotsSuccess(slots));
    return Promise.resolve(slots);
  } catch (error: any) {
    dispatch(fetchSlotsFail(error?.message || "Error al buscar horarios"));
    return Promise.reject(error);
  }
};

/** Sugerir estilista por turno */
export const suggestStylist = (date: string, startTime: string, serviceId: string) => async () => {
  try {
    const tenantId = getTenantId();
    // console.log('[Thunk] suggestStylist', { tenantId, date, startTime, serviceId });
    const { data: suggestedStylist } = await api.get(`/stylists/suggest-by-turn`, {
      params: { tenant_id: tenantId, date, start_time: startTime, service_id: serviceId },
    });
    toast.success(`Estilista sugerido: ${suggestedStylist?.first_name ?? "—"}`);
    return Promise.resolve(suggestedStylist);
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || "No hay estilistas disponibles en ese horario.";
    toast.error(errorMessage);
    return Promise.reject(errorMessage);
  }
};

/** Estilistas habilitados para un servicio */
export const getStylistsForService = (serviceId: string) => async () => {
  if (!serviceId) return Promise.resolve([]);
  try {
    const tenantId = getTenantId();
    // console.log('[Thunk] getStylistsForService', { tenantId, serviceId });
    const { data: stylists } = await api.get(`/services/${serviceId}/stylists`, {
      params: { tenant_id: tenantId },
    });
    return Array.isArray(stylists) ? stylists : [];
  } catch (error: any) {
    console.error("Error al obtener estilistas por servicio:", error);
    toast.error("No se pudieron cargar los estilistas para este servicio.");
    return Promise.reject(error);
  }
};

/** Crear cliente */
export const createNewClient = (clientData: any) => async (dispatch: any) => {
  try {
    const tenantId = getTenantId();
    const dataToSend = { ...clientData, tenant_id: tenantId, role_id: 4 };
    const { data: newClient } = await api.post(`/users`, dataToSend);
    dispatch(createNewClientSuccess(newClient));
    return Promise.resolve(newClient);
  } catch (error: any) {
    dispatch(createNewClientFail(error));
    return Promise.reject(error?.response?.data || error);
  }
};

/** Crear cita */
export const createAppointment = (appointmentData: any) => async (dispatch: any) => {
  try {
    await api.post(`/appointments`, appointmentData);
    dispatch(getCalendarData());
    dispatch(createAppointmentSuccess());
    return Promise.resolve();
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.response?.data?.error || "No se pudo crear la cita.";
    dispatch(createAppointmentFail(errorMessage));
    return Promise.reject(errorMessage);
  }
};

/** Actualizar cita */
export const updateAppointment = (appointment: any) => async (dispatch: any) => {
  try {
    const { data: updated } = await api.put(`/appointments/${appointment.id}`, appointment);

    const formattedUpdatedEvent = {
      id: updated.id,
      title: `${updated.service_name} - ${updated.client_first_name || ""}`,
      start: updated.start_time,
      end: updated.end_time,
      className: getClassNameForStatus(updated.status),
      extendedProps: { ...updated },
    };

    dispatch(updateAppointmentSuccess(formattedUpdatedEvent));
    toast.success("¡Cita actualizada con éxito!");
    return formattedUpdatedEvent;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.response?.data?.error || "No se pudo actualizar la cita.";
    dispatch(updateAppointmentFail(errorMessage));
    toast.error(errorMessage);
    return Promise.reject(errorMessage);
  }
};

/** Limpiar slots */
export const clearSlots = () => (dispatch: any) => {
  dispatch(clearSlotsAction());
};

/** Crear lote de citas */
export const createAppointmentsBatch = (payload: {
  client_id?: string;
  appointments: Array<{ service_id: string; stylist_id: string; start_time: string }>;
}) => async (dispatch: any) => {
  try {
    await api.post(`/appointments/batch`, payload);
    await dispatch(getCalendarData());
    dispatch(createAppointmentSuccess());
    toast.success("¡Citas agendadas con éxito!");
    return Promise.resolve();
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "No se pudo crear el lote de citas.";
    dispatch(createAppointmentFail(errorMessage));
    toast.error(errorMessage);
    return Promise.reject(errorMessage);
  }
};
