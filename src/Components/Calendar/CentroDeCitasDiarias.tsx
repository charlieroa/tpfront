// Archivo: src/Components/Calendar/CentroDeCitasDiarias.tsx
import React, { useState, useMemo } from 'react';
import { Card, CardBody, Button, Input } from "reactstrap";
import SimpleBar from "simplebar-react";
import Flatpickr from "react-flatpickr";
import TarjetaCita from './TarjetaCita';

interface CentroDeCitasDiariasProps {
  events: any[];
  onNewAppointmentClick: () => void;
}

type CitaEvento = any;

type GrupoCliente = {
  clientId: string | number;
  client_first_name: string;
  client_last_name?: string;
  earliestStartISO: string;         // Para ordenar por la primera hora
  count: number;                    // Cantidad de citas/servicios del cliente en el día
  appointments: {
    id: string | number;
    service_name: string;
    stylist_first_name?: string;
    start_time: string;             // ISO
  }[];
};

const CentroDeCitasDiarias = ({ events, onNewAppointmentClick }: CentroDeCitasDiariasProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>('');

  const gruposPorCliente = useMemo<GrupoCliente[]>(() => {
    // Ventanas del día
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 1) Filtrar por fecha, estado operativo y búsqueda
    const filtradas: CitaEvento[] = events.filter((event) => {
      const fechaCita = new Date(event.start);
      const enFecha = fechaCita >= startOfDay && fechaCita <= endOfDay;
      const esOperativa = event.extendedProps.status !== 'cancelled' && event.extendedProps.status !== 'completed';

      if (!enFecha || !esOperativa) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          event.extendedProps.client_first_name?.toLowerCase().includes(q) ||
          event.extendedProps.client_last_name?.toLowerCase().includes(q) ||
          event.extendedProps.stylist_first_name?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // 2) Agrupar por client_id
    const map = new Map<string | number, GrupoCliente>();

    for (const ev of filtradas) {
      const ep = ev.extendedProps || {};
      const clientId = ep.client_id ?? ep.clientId; // cubrir ambas formas
      if (clientId == null) continue;

      const item = {
        id: ev.id,
        service_name: ep.service_name,
        stylist_first_name: ep.stylist_first_name,
        start_time: ep.start_time ?? ev.start, // caer a ev.start si no está en extendedProps
      };

      if (!map.has(clientId)) {
        map.set(clientId, {
          clientId,
          client_first_name: ep.client_first_name,
          client_last_name: ep.client_last_name,
          earliestStartISO: item.start_time,
          count: 1,
          appointments: [item],
        });
      } else {
        const g = map.get(clientId)!;
        g.appointments.push(item);
        g.count += 1;
        // actualizar earliest
        if (new Date(item.start_time).getTime() < new Date(g.earliestStartISO).getTime()) {
          g.earliestStartISO = item.start_time;
        }
      }
    }

    // 3) Ordenar por la primera hora de cita del cliente
    const grupos = Array.from(map.values()).sort(
      (a, b) => new Date(a.earliestStartISO).getTime() - new Date(b.earliestStartISO).getTime()
    );

    return grupos;
  }, [events, selectedDate, searchTerm]);

  return (
    <Card>
      <CardBody>
        <Button color="primary" className="w-100 mb-3" onClick={onNewAppointmentClick}>
          <i className="mdi mdi-plus"></i> Crear Nueva Cita
        </Button>

        <div className="mb-3">
          <Flatpickr
            className="form-control"
            value={selectedDate}
            onChange={([date]) => setSelectedDate(date)}
            options={{ dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y" }}
          />
        </div>

        <Input
          type="text"
          className="form-control"
          placeholder="Buscar por cliente o estilista..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </CardBody>

      <CardBody className="pt-0">
        <h5 className="card-title mb-3">Cola de pagos</h5>
        <SimpleBar style={{ maxHeight: "calc(100vh - 450px)" }}>
          {gruposPorCliente.length > 0 ? (
            gruposPorCliente.map((grupo) => (
              <TarjetaCita key={grupo.clientId} group={grupo} />
            ))
          ) : (
            <p className="text-muted text-center mt-4">No hay citas para mostrar.</p>
          )}
        </SimpleBar>
      </CardBody>
    </Card>
  );
};

export default CentroDeCitasDiarias;
