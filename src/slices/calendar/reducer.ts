// Archivo COMPLETO y FINAL: src/slices/calendar/reducer.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CalendarState {
  events: any[];
  clients: any[];
  services: any[];
  stylists: any[];
  categories: any[];
  nextAvailableStylist: any | null;
  availableSlots: string[];
  error: object | string;
  loading: boolean;
  // ✅ El flag 'isAppointmentCreated' ha sido ELIMINADO.
}

export const initialState: CalendarState = {
  events: [],
  clients: [],
  services: [],
  stylists: [],
  categories: [
      { id: 1, title: 'Corte', type: 'primary' },
      { id: 2, title: 'Color', type: 'success' },
      { id: 3, title: 'Peinado', type: 'info' },
  ],
  nextAvailableStylist: null,
  availableSlots: [],
  error: {},
  loading: true,
};

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    getCalendarDataStart(state) {
      state.loading = true;
      state.error = {};
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
    // ✅ 'createAppointmentSuccess' ahora puede estar vacío o no existir,
    // ya que el thunk de recarga de datos es suficiente. Lo mantenemos por si se usa en otro lado.
    createAppointmentSuccess(state) {
        // No es necesario hacer nada aquí.
    },
    createAppointmentFail(state, action: PayloadAction<any>) {
      state.error = action.payload;
    },
    createNewClientSuccess(state, action: PayloadAction<any>) {
        state.clients.push(action.payload);
    },
    createNewClientFail(state, action: PayloadAction<any>) {
        state.error = action.payload;
    },
    updateAppointmentSuccess(state, action: PayloadAction<any>) {
        state.events = state.events.map(event =>
            event.id.toString() === action.payload.id.toString() ? action.payload : event
        );
    },
    updateAppointmentFail(state, action: PayloadAction<any>) {
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
  createNewClientSuccess,
  createNewClientFail,
  updateAppointmentSuccess,
  updateAppointmentFail
} = calendarSlice.actions;

export default calendarSlice.reducer;