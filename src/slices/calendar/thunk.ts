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
} from "./reducer";

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
 * Carga TODOS los datos iniciales necesarios para el calendario y el modal.
 */
export const getCalendarData = () => async (dispatch: any) => {
    dispatch(getCalendarDataStart());
    try {
        const { headers, tenantId } = getApiConfig();
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const [appointments, clientsRes, servicesRes, allStylistsRes, nextStylistRes] = await Promise.all([
            axios.get(`http://localhost:3000/api/appointments/tenant/${tenantId}`, { headers, params: { startDate, endDate } }),
            axios.get(`http://localhost:3000/api/users/tenant/${tenantId}?role_id=4`, { headers }),
            axios.get(`http://localhost:3000/api/services/tenant/${tenantId}`, { headers }),
            axios.get(`http://localhost:3000/api/users/tenant/${tenantId}?role_id=3`, { headers }),
            axios.get(`http://localhost:3000/api/stylists/next-available`, { headers })
        ]);

        // ✅ CORRECCIÓN: Usamos las respuestas directamente, sin .data, debido a tu interceptor de Axios
        const formattedEvents = (Array.isArray(appointments) ? appointments : []).map((cita: any) => ({
            id: cita.id,
            title: `${cita.service_name} - ${cita.client_first_name || ''}`,
            start: cita.start_time,
            end: cita.end_time,
            className: `bg-success-subtle`,
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
 * Busca los horarios disponibles para un estilista y fecha específicos.
 */
export const fetchAvailability = (stylistId: string, date: string) => async (dispatch: any) => {
    try {
        const { headers, tenantId } = getApiConfig();
        // 'response' es el objeto completo de Axios: { data: { availableSlots: [...] }, status, ... }
        const response = await axios.get(`http://localhost:3000/api/appointments/availability`, { 
            headers, 
            params: { tenant_id: tenantId, stylist_id: stylistId, date }
        });
        
        // ✅ ¡ESTA ES LA CORRECCIÓN FINAL! Accedemos a .data y LUEGO a .availableSlots
        const slots = response.data.availableSlots || [];
        
        dispatch(fetchSlotsSuccess(slots));
    } catch (error: any) {
        dispatch(fetchSlotsFail(error.message || "Error al buscar horarios"));
    }
};

/**
 * Crea un nuevo cliente.
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
 * Crea una nueva cita.
 */
export const createAppointment = (appointmentData: any) => async (dispatch: any) => {
    try {
        const { headers } = getApiConfig();
        // Aquí la respuesta de un POST sí suele ser el objeto completo de Axios
        const newAppointmentResponse = await axios.post(`http://localhost:3000/api/appointments`, appointmentData, { headers });
        const newAppointmentData = newAppointmentResponse.data;

        const formattedNewEvent = {
            id: newAppointmentData.id,
            title: `${newAppointmentData.service_name} - ${newAppointmentData.client_first_name || ''}`,
            start: newAppointmentData.start_time,
            end: newAppointmentData.end_time,
            className: `bg-success-subtle`,
            extendedProps: { ...newAppointmentData }
        };

        dispatch(createAppointmentSuccess(formattedNewEvent));
        return Promise.resolve(newAppointmentData);
    } catch (error: any) {
        dispatch(createAppointmentFail(error));
        return Promise.reject(error.response?.data || error);
    }
};

/**
 * Thunk para limpiar los horarios disponibles.
 */
export const clearSlots = () => (dispatch: any) => {
    dispatch(clearSlotsAction());
};