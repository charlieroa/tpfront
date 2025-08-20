import axios from "axios";
import { jwtDecode } from "jwt-decode";
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
    updateAppointmentFail
} from "./reducer";
import { toast } from "react-toastify";

// ✅ FUNCIÓN AUXILIAR PARA DETERMINAR EL COLOR
const getClassNameForStatus = (status: string) => {
    switch (status) {
        case 'scheduled':
        case 'rescheduled':
            return 'bg-success-subtle text-success border border-success'; // Verde
        case 'checked_in':
            return 'bg-info-subtle text-info border border-info'; // Celeste
        case 'checked_out':
            return 'bg-primary-subtle text-primary border border-primary'; // Azul
        case 'completed':
            return 'bg-light text-secondary border'; // Gris
        case 'cancelled':
            return 'bg-danger-subtle text-danger border border-danger'; // Rojo
        case 'pending_approval':
            return 'bg-warning-subtle text-warning border border-warning'; // Naranja
        default:
            return 'bg-secondary-subtle text-secondary border';
    }
};

// Helper para obtener la configuración de la API
const getApiConfig = () => {
    const token = localStorage.getItem("authToken");
    if (!token) throw new Error("Token de autenticación no encontrado");
    const decoded: any = jwtDecode(token);
    return {
        headers: { Authorization: `Bearer ${token}` },
        tenantId: decoded.user.tenant_id as string,
    };
};

/**
 * Carga las citas para el año actual y les asigna un color según su estado.
 * (TU VERSIÓN FUNCIONAL - NO SE TOCA)
 */
export const getCalendarData = () => async (dispatch: any) => {
    dispatch(getCalendarDataStart());
    try {
        const { headers, tenantId } = getApiConfig();
        const today = new Date();
        const year = today.getFullYear();
        const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
        const endDate = new Date(year, 11, 31).toISOString().split('T')[0];

        const [appointments, clientsRes, servicesRes, allStylistsRes, nextStylistRes] = await Promise.all([
            axios.get(`http://localhost:3000/api/appointments/tenant/${tenantId}`, { headers, params: { startDate, endDate } }),
            axios.get(`http://localhost:3000/api/users/tenant/${tenantId}?role_id=4`, { headers }),
            axios.get(`http://localhost:3000/api/services/tenant/${tenantId}`, { headers }),
            axios.get(`http://localhost:3000/api/users/tenant/${tenantId}?role_id=3`, { headers }),
            axios.get(`http://localhost:3000/api/stylists/next-available`, { headers })
        ]);

        const formattedEvents = (Array.isArray(appointments) ? appointments : []).map((cita: any) => ({
            id: cita.id,
            title: `${cita.service_name} - ${cita.client_first_name || ''}`,
            start: cita.start_time,
            end: cita.end_time,
            className: getClassNameForStatus(cita.status),
            extendedProps: { ...cita }
        }));
        
        dispatch(getCalendarDataSuccess({
            events: formattedEvents,
            clients: Array.isArray(clientsRes) ? clientsRes : [],
            services: Array.isArray(servicesRes) ? servicesRes : [],
            stylists: Array.isArray(allStylistsRes) ? allStylistsRes : [],
            nextAvailableStylist: nextStylistRes || null,
        }));
    } catch (error: any) {
        dispatch(getCalendarDataFail(error.message || "Error desconocido"));
    }
};

/**
 * Busca los horarios disponibles.
 * (TU VERSIÓN FUNCIONAL - NO SE TOCA)
 */
export const fetchAvailability = (stylistId: string, date: string) => async (dispatch: any) => {
    try {
        const { headers, tenantId } = getApiConfig();
        const availabilityResponse = await axios.get(`http://localhost:3000/api/appointments/availability`, { 
            headers, 
            params: { tenant_id: tenantId, stylist_id: stylistId, date }
        });
        
        const dataPayload = availabilityResponse.data || availabilityResponse;
        const slots = dataPayload.availableSlots || [];
        dispatch(fetchSlotsSuccess(slots));
        return Promise.resolve(slots); 
    } catch (error: any) {
        dispatch(fetchSlotsFail(error.message || "Error al buscar horarios"));
        return Promise.reject(error);
    }
};


// ==================================================================
// ✅ AQUÍ ESTÁ LA ÚNICA PARTE NUEVA
// ==================================================================
/**
 * Sugiere un estilista por turno, siguiendo el patrón de tu código.
 */
export const suggestStylist = (date: string, startTime: string, serviceId: string) => async (dispatch: any) => {
    try {
        const { headers } = getApiConfig();
        const response = await axios.get(`http://localhost:3000/api/stylists/suggest-by-turn`, {
            headers,
            params: {
                date: date,
                start_time: startTime,
                service_id: serviceId
            }
        });

        // ✅ LA SOLUCIÓN DEFINITIVA:
        // Primero intentamos .data (para que TypeScript esté feliz y para el estándar).
        // Si no existe, usamos la respuesta completa (como funciona en tu entorno).
        // El `: any` le dice a TypeScript que confíe en nosotros, que sabemos que este objeto tendrá un .first_name
        const suggestedStylist: any = response.data || response;

        // Esta línea ahora funcionará sin errores de compilación.
        toast.success(`Estilista sugerido: ${suggestedStylist.first_name}`);
        return Promise.resolve(suggestedStylist);

    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || "No hay estilistas disponibles en ese horario.";
        toast.error(errorMessage);
        return Promise.reject(errorMessage);
    }
};
// ==================================================================
// FIN DE LA PARTE NUEVA
// ==================================================================
export const getStylistsForService = (serviceId: string) => async (dispatch: any) => {
    if (!serviceId) {
        return Promise.resolve([]); // Devuelve un array vacío si no hay servicio
    }
    try {
        const { headers } = getApiConfig();
        const response = await axios.get(
            `http://localhost:3000/api/services/${serviceId}/stylists`, 
            { headers }
        );

        // La respuesta ya debería ser el array de estilistas
        const stylists = response.data || response;
        if (Array.isArray(stylists)) {
            return Promise.resolve(stylists);
        }
        return Promise.resolve([]);

    } catch (error: any) {
        console.error("Error al obtener estilistas por servicio:", error);
        toast.error("No se pudieron cargar los estilistas para este servicio.");
        return Promise.reject(error);
    }
};

/**
 * Crea un nuevo cliente.
 * (TU VERSIÓN FUNCIONAL - NO SE TOCA)
 */
export const createNewClient = (clientData: any) => async (dispatch: any) => {
    try {
        const { headers, tenantId } = getApiConfig();
        const dataToSend = { ...clientData, tenant_id: tenantId, role_id: 4 };
        const newClient = await axios.post(`http://localhost:3000/api/users`, dataToSend, { headers });
        dispatch(createNewClientSuccess(newClient));
        return Promise.resolve(newClient);
    } catch (error: any) {
        dispatch(createNewClientFail(error));
        return Promise.reject(error.response?.data || error);
    }
};

/**
 * Crea una nueva cita y recarga los datos.
 * (TU VERSIÓN FUNCIONAL - NO SE TOCA)
 */
export const createAppointment = (appointmentData: any) => async (dispatch: any) => {
    try {
        const { headers } = getApiConfig();
        await axios.post(`http://localhost:3000/api/appointments`, appointmentData, { headers });
        dispatch(getCalendarData());
        dispatch(createAppointmentSuccess()); 
        return Promise.resolve();
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || "No se pudo crear la cita.";
        dispatch(createAppointmentFail(errorMessage));
        return Promise.reject(errorMessage);
    }
};

/**
 * Actualiza una cita existente.
 * (TU VERSIÓN FUNCIONAL - NO SE TOCA)
 */
export const updateAppointment = (appointment: any) => async (dispatch: any) => {
    try {
        const { headers } = getApiConfig();
        const response = await axios.put(`http://localhost:3000/api/appointments/${appointment.id}`, appointment, { headers });
        const updatedAppointmentData = response.data;

        const formattedUpdatedEvent = {
            id: updatedAppointmentData.id,
            title: `${updatedAppointmentData.service_name} - ${updatedAppointmentData.client_first_name || ''}`,
            start: updatedAppointmentData.start_time,
            end: updatedAppointmentData.end_time,
            className: getClassNameForStatus(updatedAppointmentData.status),
            extendedProps: { ...updatedAppointmentData }
        };

        dispatch(updateAppointmentSuccess(formattedUpdatedEvent));
        toast.success("¡Cita actualizada con éxito!");
        return formattedUpdatedEvent;
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || "No se pudo actualizar la cita.";
        dispatch(updateAppointmentFail(errorMessage));
        toast.error(errorMessage);
        return Promise.reject(errorMessage);
    }
};

/**
 * Limpia los horarios disponibles.
 * (TU VERSIÓN FUNCIONAL - NO SE TOCA)
 */
export const clearSlots = () => (dispatch: any) => {
    dispatch(clearSlotsAction());
};

export const createAppointmentsBatch = (payload: {
  client_id?: string;                 // opcional si el admin agenda para un cliente
  appointments: Array<{
    service_id: string;
    stylist_id: string;
    start_time: string;               // ISO UTC: e.g. "2025-10-30T14:00:00.000Z"
  }>;
}) => async (dispatch: any) => {
  try {
    const { headers } = getApiConfig();

    await axios.post(
      "http://localhost:3000/api/appointments/batch",
      payload,
      { headers }
    );

    // Recargar calendario y marcar éxito
    await dispatch(getCalendarData());
    dispatch(createAppointmentSuccess());
    toast.success("¡Citas agendadas con éxito!");

    return Promise.resolve();
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "No se pudo crear el lote de citas.";

    dispatch(createAppointmentFail(errorMessage));
    toast.error(errorMessage);
    return Promise.reject(errorMessage);
  }
};