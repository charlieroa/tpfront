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
 * MODIFICADO: Ahora carga las citas de TODO EL AÑO ACTUAL.
 */
export const getCalendarData = () => async (dispatch: any) => {
    dispatch(getCalendarDataStart());
    try {
        const { headers, tenantId } = getApiConfig();
        
        // ✅ AJUSTE: Se calcula el inicio y fin del año actual.
        const today = new Date();
        const year = today.getFullYear();
        const startDate = new Date(year, 0, 1).toISOString().split('T')[0];    // 1 de Enero
        const endDate = new Date(year, 11, 31).toISOString().split('T')[0]; // 31 de Diciembre

        const [appointments, clientsRes, servicesRes, allStylistsRes, nextStylistRes] = await Promise.all([
            // La petición a la API ahora usa el rango de todo el año
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


// ... El resto del archivo no cambia ...

/**
 * Busca los horarios disponibles para un estilista y fecha específicos.
 */
export const fetchAvailability = (stylistId: string, date: string) => async (dispatch: any) => {
    try {
        const { headers, tenantId } = getApiConfig();
        const response = await axios.get(`http://localhost:3000/api/appointments/availability`, { 
            headers, 
            params: { tenant_id: tenantId, stylist_id: stylistId, date }
        });
        
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