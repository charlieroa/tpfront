// Ubicación: pages/Pages/Profile/Settings/datostenant.tsx

import React, { ChangeEvent } from "react";
import { Form, Row, Col, Label, Input, Button, Spinner, InputGroup } from "reactstrap";

/* ===== Tipos locales ===== */
export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type DayState = { active: boolean; start: string; end: string };
export type WorkingHoursPerDay = Record<DayKey, DayState>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: "monday",    label: "Lunes" },
  { key: "tuesday",   label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday",  label: "Jueves" },
  { key: "friday",    label: "Viernes" },
  { key: "saturday",  label: "Sábado" },
  { key: "sunday",    label: "Domingo" },
];

/* ===== Props ===== */
export type DatosTenantProps = {
  section: "datos" | "horario";
  name: string; phone: string; address: string; email: string; website: string; ivaRate: string; adminFee: string;
  setName: (v: string) => void; setPhone: (v: string) => void; setAddress: (v: string) => void; setEmail: (v: string) => void;
  setWebsite: (v: string) => void; setIvaRate: (v: string) => void; setAdminFee: (v: string) => void;

  // Props para Módulos Activos
  productsForStaff: boolean; setProductsForStaff: (v: boolean) => void;
  adminFeeEnabled: boolean; setAdminFeeEnabled: (v: boolean) => void;
  loansToStaff: boolean; setLoansToStaff: (v: boolean) => void;

  // Props para Horarios
  perDay: WorkingHoursPerDay;
  toggleDay: (day: DayKey) => void;
  changeHour: (day: DayKey, field: "start" | "end", value: string) => void;
  applyMondayToAll: () => void;
  
  saving?: boolean;
  onSubmit?: (e?: React.FormEvent) => void;
  onCancel?: () => void;
};

const DatosTenant: React.FC<DatosTenantProps> = ({
  section,
  name, phone, address, email, website, ivaRate, adminFee,
  setName, setPhone, setAddress, setEmail, setWebsite, setIvaRate, setAdminFee,
  productsForStaff, setProductsForStaff,
  adminFeeEnabled, setAdminFeeEnabled,
  loansToStaff, setLoansToStaff,
  perDay, toggleDay, changeHour, applyMondayToAll,
  saving = false,
  onSubmit, onCancel,
}) => {

  const handleInputChange = (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
  };

  /* ------- UI: Datos del Negocio (Reorganizado) ------- */
  const DatosForm = (
    <Form onSubmit={(e) => { e.preventDefault(); onSubmit?.(e); }}>
      <h5 className="mb-3">Datos del Negocio</h5>
      <Row className="g-3">
        <Col lg={6}><div className="mb-3"><Label htmlFor="tenant-name" className="form-label">Nombre</Label><Input id="tenant-name" value={name} onChange={handleInputChange(setName)} placeholder="Ej: Bunker Barber Shop" required /></div></Col>
        <Col lg={6}><div className="mb-3"><Label htmlFor="tenant-phone" className="form-label">Teléfono</Label><Input id="tenant-phone" value={phone} onChange={handleInputChange(setPhone)} placeholder="Ej: 3001234567" required /></div></Col>
        
        <Col lg={6}><div className="mb-3"><Label htmlFor="tenant-address" className="form-label">Dirección</Label><Input id="tenant-address" value={address} onChange={handleInputChange(setAddress)} placeholder="Ej: Calle 123 #45-67" required /></div></Col>
        <Col lg={6}><div className="mb-3"><Label htmlFor="tenant-email" className="form-label">Email</Label><Input id="tenant-email" type="email" value={email} onChange={handleInputChange(setEmail)} placeholder="contacto@mi-peluqueria.com" /></div></Col>

        <Col lg={6}><div className="mb-3"><Label htmlFor="tenant-website" className="form-label">Página web</Label><Input id="tenant-website" type="url" value={website} onChange={handleInputChange(setWebsite)} placeholder="https://mi-peluqueria.com" /></div></Col>
        <Col lg={6}><div className="mb-3"><Label htmlFor="tenant-iva" className="form-label">IVA (%)</Label><Input id="tenant-iva" type="number" min={0} max={100} step="0.01" value={ivaRate} onChange={handleInputChange(setIvaRate)} placeholder="19" /></div></Col>
      </Row>

      {/* --- SECCIÓN MÓDULOS Y CONFIGURACIONES (Layout Ajustado) --- */}
      <hr className="my-4" />
      <h5 className="mb-3">Módulos y Configuraciones</h5>
      <Row>
        <Col lg={12}>
          <div className="d-flex align-items-center flex-wrap gap-4 mb-4">
              <div className="form-check form-switch form-switch-lg">
                <Input className="form-check-input" type="checkbox" role="switch" id="admin-fee-switch" checked={adminFeeEnabled} onChange={(e) => setAdminFeeEnabled(e.target.checked)} />
                <Label className="form-check-label" htmlFor="admin-fee-switch">En tu peluquería, ¿cobras % administrativo?</Label>
              </div>

              {adminFeeEnabled && (
                <div style={{maxWidth: "200px"}}>
                  <InputGroup>
                      <Input id="tenant-admin-fee" type="number" min={0} max={100} step="0.01" value={adminFee} onChange={handleInputChange(setAdminFee)} placeholder="10" />
                      <span className="input-group-text">%</span>
                  </InputGroup>
                </div>
              )}
          </div>

          <div className="form-check form-switch form-switch-lg mb-4">
            <Input className="form-check-input" type="checkbox" role="switch" id="products-for-staff-switch" checked={productsForStaff} onChange={(e) => setProductsForStaff(e.target.checked)} />
            <Label className="form-check-label" htmlFor="products-for-staff-switch">¿Venden productos para uso del personal?</Label>
            <p className="text-muted mt-1 small">Activa la opción de "audiencia" en el inventario para productos de uso interno.</p>
          </div>

          <div className="form-check form-switch form-switch-lg mb-3">
            <Input className="form-check-input" type="checkbox" role="switch" id="loans-to-staff-switch" checked={loansToStaff} onChange={(e) => setLoansToStaff(e.target.checked)} />
            <Label className="form-check-label" htmlFor="loans-to-staff-switch">En tu peluquería, ¿prestas dinero a tu personal?</Label>
            <p className="text-muted mt-1 small">Activará el módulo de préstamos y adelantos en la sección de nómina.</p>
          </div>
        </Col>
      </Row>
      
      <Row>
        <Col lg={12} className="pt-2"><div className="hstack gap-2 justify-content-end"><Button type="button" color="soft-success" onClick={() => onCancel?.()}>Cancelar</Button><Button type="submit" color="primary" disabled={saving}>{saving && <Spinner size="sm" className="me-2" />} Guardar cambios</Button></div></Col>
      </Row>
    </Form>
  );

  /* ------- UI: Horario (Completo) ------- */
  const HorarioForm = (
    <Form onSubmit={(e) => { e.preventDefault(); onSubmit?.(e); }}>
      <Row>
        {DAYS.map(({ key, label }) => {
          const day = perDay[key];
          const isMonday = key === "monday";
          return (
            <Col lg={12} key={key}>
              <div className="border rounded p-3 mb-3">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div className="form-check form-switch"><Input className="form-check-input" type="checkbox" id={`active-${key}`} checked={day.active} onChange={() => toggleDay(key)} /><Label className="form-check-label fw-semibold ms-2" htmlFor={`active-${key}`}>{label} {day.active ? "(Abierto)" : "(Cerrado)"}</Label></div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2"><Label className="mb-0" htmlFor={`start-${key}`}>Inicio</Label><Input id={`start-${key}`} type="time" value={day.start} disabled={!day.active} onChange={(e) => changeHour(key, "start", e.target.value)} /></div>
                    <div className="d-flex align-items-center gap-2"><Label className="mb-0" htmlFor={`end-${key}`}>Fin</Label><Input id={`end-${key}`} type="time" value={day.end} disabled={!day.active} onChange={(e) => changeHour(key, "end", e.target.value)} /></div>
                    {isMonday && (<Button type="button" size="sm" color="secondary" className="ms-2" onClick={applyMondayToAll}>Aplicar a todos</Button>)}
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
        <Col lg={12}><div className="hstack gap-2 justify-content-end"><Button type="button" color="soft-success" onClick={() => onCancel?.()}>Cancelar</Button><Button type="submit" color="primary" disabled={saving}>{saving && <Spinner size="sm" className="me-2" />} Guardar horarios</Button></div></Col>
      </Row>
    </Form>
  );

  if (section === "datos") return DatosForm;
  if (section === "horario") return HorarioForm;
  return null;
};

export default DatosTenant;