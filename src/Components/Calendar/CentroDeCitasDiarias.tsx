// Archivo: src/Components/Calendar/CentroDeCitasDiarias.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  Input,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Label,
  Spinner
} from "reactstrap";
import classnames from "classnames";
import SimpleBar from "simplebar-react";
import Flatpickr from "react-flatpickr";
import TarjetaCita from './TarjetaCita';
import api from '../../services/api';

// ================== Tipos ==================
interface CentroDeCitasDiariasProps {
  events: any[];
  onNewAppointmentClick: () => void;
}

type CitaEvento = any;

type GrupoCliente = {
  clientId: string | number;
  client_first_name: string;
  client_last_name?: string;
  earliestStartISO: string;
  count: number;
  appointments: {
    id: string | number;
    service_name: string;
    stylist_first_name?: string;
    start_time: string;
  }[];
};

type Stylist = {
  id: string | number;
  first_name: string;
  last_name?: string;
};

// ==== Helpers COP (sin decimales) ====
const formatterCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0
});
const onlyDigits = (v: string) => (v || '').replace(/\D+/g, '');
const formatCOPString = (digits: string) => {
  if (!digits) return '';
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return '';
  return formatterCOP.format(n);
};

const CentroDeCitasDiarias = ({ events, onNewAppointmentClick }: CentroDeCitasDiariasProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState<boolean>(false);

  // Tabs del modal
  const [activeTab, setActiveTab] = useState<'anticipo' | 'factura'>('anticipo');

  // Formularios (guardamos solo dígitos en el monto)
  const [anticipo, setAnticipo] = useState({ stylist_id: '', amountDigits: '', description: '' });
  const [factura, setFactura] = useState({ reference: '', amountDigits: '', description: '' });

  // Estilistas (GET /api/stylists)
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loadingStylists, setLoadingStylists] = useState<boolean>(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // === Cargar estilistas activos del tenant ===
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingStylists(true);
        const { data } = await api.get('/stylists'); // ← nuevo endpoint root
        if (!alive) return;
        setStylists(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        console.error('Error cargando estilistas:', e);
        setStylists([]);
      } finally {
        if (alive) setLoadingStylists(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Agrupar citas del día por cliente
  const gruposPorCliente = useMemo<GrupoCliente[]>(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filtradas: CitaEvento[] = events.filter((event) => {
      const fechaCita = new Date(event.start);
      const enFecha = fechaCita >= startOfDay && fechaCita <= endOfDay;
      const esOperativa =
        event.extendedProps.status !== 'cancelled' &&
        event.extendedProps.status !== 'completed';
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

    const map = new Map<string | number, GrupoCliente>();
    for (const ev of filtradas) {
      const ep = ev.extendedProps || {};
      const clientId = ep.client_id ?? ep.clientId;
      if (clientId == null) continue;

      const item = {
        id: ev.id,
        service_name: ep.service_name,
        stylist_first_name: ep.stylist_first_name,
        start_time: ep.start_time ?? ev.start,
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
        if (new Date(item.start_time).getTime() < new Date(g.earliestStartISO).getTime()) {
          g.earliestStartISO = item.start_time;
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.earliestStartISO).getTime() - new Date(b.earliestStartISO).getTime()
    );
  }, [events, selectedDate, searchTerm]);

  // Abrir modal
  const handleOpenPayments = () => {
    setActiveTab('anticipo');
    setPaymentsModalOpen(true);
  };

  // Guardar Anticipo -> POST /cash-movements
  // Se registra como egreso (monto negativo en backend) y luego la nómina lo descuenta.
  const handleSaveAnticipo = async () => {
    const amount = parseInt(anticipo.amountDigits || '0', 10) || 0;
    if (!anticipo.stylist_id || amount <= 0) {
      alert('Selecciona estilista y un monto válido.');
      return;
    }
    try {
      await api.post('/cash-movements', {
        type: 'payroll_advance',           // ← clave para nómina
        category: 'stylist_advance',       // ← identifica que es anticipo de estilista
        description: anticipo.description || 'Anticipo',
        amount,                            // ← el controller lo pasa a negativo por ser advance
        payment_method: 'cash',
        related_entity_type: 'stylist',    // ← relaciona el anticipo con un estilista
        related_entity_id: anticipo.stylist_id
      });
      alert('Anticipo registrado correctamente.');
      setPaymentsModalOpen(false);
      setAnticipo({ stylist_id: '', amountDigits: '', description: '' });
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || 'Error al registrar el anticipo.');
    }
  };

  // Guardar Factura -> POST /cash-movements
  // Se registra como gasto (monto negativo en backend) y resta en caja/reportes.
  const handleSaveFactura = async () => {
    const amount = parseInt(factura.amountDigits || '0', 10) || 0;
    if (!factura.reference || amount <= 0) {
      alert('Ingresa referencia y un monto válido.');
      return;
    }
    try {
      await api.post('/cash-movements', {
        type: 'expense',                   // ← egreso
        category: 'vendor_invoice',        // ← gasto de proveedor
        invoice_ref: factura.reference,    // ← referencia visible
        description: factura.description || 'Factura',
        amount,                            // ← el controller lo pasa a negativo por ser expense
        payment_method: 'cash'
      });
      alert('Factura registrada correctamente.');
      setPaymentsModalOpen(false);
      setFactura({ reference: '', amountDigits: '', description: '' });
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || 'Error al registrar la factura.');
    }
  };

  return (
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">Cola de pagos</h5>
          <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
            <DropdownToggle color="light" caret>
              Opciones
            </DropdownToggle>
            <DropdownMenu end>
              <DropdownItem onClick={handleOpenPayments}>
                <i className="mdi mdi-cash me-2"></i> Anticipos / Facturas
              </DropdownItem>
              <DropdownItem onClick={onNewAppointmentClick}>
                <i className="mdi mdi-plus me-2"></i> Crear Nueva Cita
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

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

      {/* Modal Anticipos / Facturas */}
      <Modal isOpen={paymentsModalOpen} toggle={() => setPaymentsModalOpen(false)} centered>
        <ModalHeader toggle={() => setPaymentsModalOpen(false)}>
          Anticipos / Facturas
        </ModalHeader>
        <ModalBody>
          <Nav tabs>
            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === 'anticipo' })}
                onClick={() => setActiveTab('anticipo')}
                style={{ cursor: 'pointer' }}
              >
                Anticipo
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classnames({ active: activeTab === 'factura' })}
                onClick={() => setActiveTab('factura')}
                style={{ cursor: 'pointer' }}
              >
                Factura
              </NavLink>
            </NavItem>
          </Nav>

          <TabContent activeTab={activeTab} className="pt-3">
            {/* TAB: ANTICIPO */}
            <TabPane tabId="anticipo">
              <div className="mb-3">
                <Label className="form-label">Estilista</Label>
                {loadingStylists ? (
                  <div className="d-flex align-items-center gap-2">
                    <Spinner size="sm" /> <span>Cargando estilistas…</span>
                  </div>
                ) : (
                  <Input
                    type="select"
                    value={anticipo.stylist_id}
                    onChange={(e) => setAnticipo(a => ({ ...a, stylist_id: e.target.value }))}
                  >
                    <option value="">Seleccione estilista</option>
                    {stylists.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.first_name} {s.last_name || ''}
                      </option>
                    ))}
                  </Input>
                )}
              </div>

              <div className="mb-3">
                <Label className="form-label">Monto</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="$0"
                  value={formatCOPString(anticipo.amountDigits)}
                  onChange={(e) => {
                    const digits = onlyDigits(e.target.value);
                    setAnticipo(a => ({ ...a, amountDigits: digits }));
                  }}
                />
                {anticipo.amountDigits && (
                  <small className="text-muted">Valor: {formatCOPString(anticipo.amountDigits)}</small>
                )}
              </div>

              <div className="mb-0">
                <Label className="form-label">Descripción</Label>
                <Input
                  type="textarea"
                  rows={3}
                  value={anticipo.description}
                  onChange={(e) => setAnticipo(a => ({ ...a, description: e.target.value }))}
                  placeholder="Motivo del anticipo"
                />
              </div>
            </TabPane>

            {/* TAB: FACTURA */}
            <TabPane tabId="factura">
              <div className="mb-3">
                <Label className="form-label">Referencia de factura</Label>
                <Input
                  value={factura.reference}
                  onChange={(e) => setFactura(f => ({ ...f, reference: e.target.value }))}
                  placeholder="FAC-0001"
                />
              </div>

              <div className="mb-3">
                <Label className="form-label">Monto</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="$0"
                  value={formatCOPString(factura.amountDigits)}
                  onChange={(e) => {
                    const digits = onlyDigits(e.target.value);
                    setFactura(f => ({ ...f, amountDigits: digits }));
                  }}
                />
                {factura.amountDigits && (
                  <small className="text-muted">Valor: {formatCOPString(factura.amountDigits)}</small>
                )}
              </div>

              <div className="mb-0">
                <Label className="form-label">Descripción</Label>
                <Input
                  type="textarea"
                  rows={3}
                  value={factura.description}
                  onChange={(e) => setFactura(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detalle de la compra"
                />
              </div>
            </TabPane>
          </TabContent>
        </ModalBody>

        <ModalFooter>
          {activeTab === 'anticipo' ? (
            <Button
              color="primary"
              onClick={handleSaveAnticipo}
              disabled={!anticipo.stylist_id || !anticipo.amountDigits}
            >
              Guardar Anticipo
            </Button>
          ) : (
            <Button
              color="primary"
              onClick={handleSaveFactura}
              disabled={!factura.reference || !factura.amountDigits}
            >
              Guardar Factura
            </Button>
          )}
          <Button color="secondary" onClick={() => setPaymentsModalOpen(false)}>
            Cancelar
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
};

export default CentroDeCitasDiarias;
