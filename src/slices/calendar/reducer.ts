import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CalendarState {
  events: any[];
  clients: any[];
  services: any[];
  stylists: any[];
  nextAvailableStylist: any | null;
  availableSlots: string[];
  error: object;
  loading: boolean;
  isAppointmentCreated: boolean;
}

export const initialState: CalendarState = {
  events: [],
  clients: [],
  services: [],
  stylists: [],
  nextAvailableStylist: null,
  availableSlots: [],
  error: {},
  loading: true,
  isAppointmentCreated: false,
};

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    getCalendarDataStart(state) {
      state.loading = true;
      state.isAppointmentCreated = false;
    },
    getCalendarDataSuccess(state, action: PayloadAction<any>) {
      state.loading = false;
      state.events = action.payload.events;
      state.clients = action.payload.clients;
      state.services = action.payload.services;
      state.stylists = action.payload.stylists;
      state.nextAvailableStylist = action.payload.nextAvailableStylist;
    },
    getCalendarDataFail(state, action: PayloadAction<any>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchSlotsSuccess(state, action: PayloadAction<string[]>) {
        state.availableSlots = action.payload;
    },
    fetchSlotsFail(state, action: PayloadAction<any>) {
        state.error = action.payload;
        state.availableSlots = [];
    },
    clearSlots(state) {
        state.availableSlots = [];
    },
    createAppointmentSuccess(state, action: PayloadAction<any>) {
      state.events.push(action.payload);
      state.isAppointmentCreated = true;
    },
    createAppointmentFail(state, action: PayloadAction<any>) {
      state.error = action.payload;
    },
    // ✅ ACCIONES PARA EL NUEVO CLIENTE QUE FALTABAN
    createNewClientSuccess(state, action: PayloadAction<any>) {
        state.clients.push(action.payload); // Añade el nuevo cliente a la lista
    },
    createNewClientFail(state, action: PayloadAction<any>) {
        state.error = action.payload;
    },
  },
});

export const {
  getCalendarDataStart,
  getCalendarDataSuccess,
  getCalendarDataFail,
  fetchSlotsSuccess,
  fetchSlotsFail,
  clearSlots,
  createAppointmentSuccess,
  createAppointmentFail,
  createNewClientSuccess, // ✅ Exportar nueva acción
  createNewClientFail,    // ✅ Exportar nueva acción
} = calendarSlice.actions;

export default calendarSlice.reducer;