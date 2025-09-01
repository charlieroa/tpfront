import React from "react";
import { Form, Row, Col, Label, Input, Button, Spinner } from "reactstrap";

/* ===== Tipos locales para manejar horarios ===== */
export type DayKey =
  | "monday" | "tuesday" | "wednesday"
  | "thursday" | "friday" | "saturday" | "sunday";

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
  /** qué sección quieres renderizar en este uso del componente */
  section: "datos" | "horario";

  // Datos del negocio
  name: string;
  phone: string;
  address: string;
  email: string;
  website: string;
  ivaRate: string;
  adminFee: string;
  setName: (v: string) => void;
  setPhone: (v: string) => void;
  setAddress: (v: string) => void;
  setEmail: (v: string) => void;
  setWebsite: (v: string) => void;
  setIvaRate: (v: string) => void;
  setAdminFee: (v: string) => void;

  // Horarios
  perDay: WorkingHoursPerDay;
  toggleDay: (day: DayKey) => void;
  changeHour: (day: DayKey, field: "start" | "end", value: string) => void;
  applyMondayToAll: () => void;

  // Control
  saving?: boolean;
  onSubmit?: (e?: React.FormEvent) => void;
  onCancel?: () => void;
};

const DatosTenant: React.FC<DatosTenantProps> = ({
  section,
  name, phone, address, email, website, ivaRate, adminFee,
  setName, setPhone, setAddress, setEmail, setWebsite, setIvaRate, setAdminFee,
  perDay, toggleDay, changeHour, applyMondayToAll,
  saving = false,
  onSubmit, onCancel,
}) => {

  /* ------- UI: Datos ------- */
  const DatosForm = (
    <Form onSubmit={(e) => onSubmit?.(e)}>
      <Row className="g-3">
        <Col lg={6}>
          <div className="mb-0">
            <Label htmlFor="tenant-name" className="form-label">Nombre</Label>
            <Input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bunker Barber Shop" required />
          </div>
        </Col>
        <Col lg={6}>
          <div className="mb-0">
            <Label htmlFor="tenant-phone" className="form-label">Teléfono</Label>
            <Input id="tenant-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3001234567" required />
          </div>
        </Col>
        <Col lg={6}>
          <div className="mb-0">
            <Label htmlFor="tenant-address" className="form-label">Dirección</Label>
            <Input id="tenant-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej: Calle 123 #45-67" required />
          </div>
        </Col>
        <Col lg={6}>
          <div className="mb-0">
            <Label htmlFor="tenant-email" className="form-label">Email</Label>
            <Input id="tenant-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@mi-peluqueria.com" />
          </div>
        </Col>
        <Col lg={6}>
          <div className="mb-0">
            <Label htmlFor="tenant-website" className="form-label">Página web</Label>
            <Input id="tenant-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://mi-peluqueria.com" />
          </div>
        </Col>
        <Col lg={3}>
          <div className="mb-0">
            <Label htmlFor="tenant-iva" className="form-label">IVA (%)</Label>
            <Input id="tenant-iva" type="number" min={0} max={100} step="0.01" value={ivaRate} onChange={(e) => setIvaRate(e.target.value)} placeholder="19" />
          </div>
        </Col>
        <Col lg={3}>
          <div className="mb-0">
            <Label htmlFor="tenant-admin-fee" className="form-label">% Administrativo</Label>
            <Input id="tenant-admin-fee" type="number" min={0} max={100} step="0.01" value={adminFee} onChange={(e) => setAdminFee(e.target.value)} placeholder="10" />
          </div>
        </Col>

        <Col lg={12} className="pt-2">
          <div className="hstack gap-2 justify-content-end">
            <Button type="submit" color="primary" disabled={saving}>
              {saving && <Spinner size="sm" className="me-2" />} Guardar cambios
            </Button>
            <Button type="button" color="soft-success" onClick={() => onCancel?.()}>
              Cancelar
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );

  /* ------- UI: Horario ------- */
  const HorarioForm = (
    <Form onSubmit={(e) => onSubmit?.(e)}>
      <Row>
        {DAYS.map(({ key, label }) => {
          const day = perDay[key];
          const isMonday = key === "monday";
          return (
            <Col lg={12} key={key}>
              <div className="border rounded p-3 mb-3">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div className="form-check form-switch">
                    <Input className="form-check-input" type="checkbox" id={`active-${key}`} checked={day.active} onChange={() => toggleDay(key)} />
                    <Label className="form-check-label fw-semibold ms-2" htmlFor={`active-${key}`}>
                      {label} {day.active ? "(Abierto)" : "(Cerrado)"}
                    </Label>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                      <Label className="mb-0" htmlFor={`start-${key}`}>Inicio</Label>
                      <Input id={`start-${key}`} type="time" value={day.start} disabled={!day.active}
                             onChange={(e) => changeHour(key, "start", e.target.value)} />
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Label className="mb-0" htmlFor={`end-${key}`}>Fin</Label>
                      <Input id={`end-${key}`} type="time" value={day.end} disabled={!day.active}
                             onChange={(e) => changeHour(key, "end", e.target.value)} />
                    </div>
                    {isMonday && (
                      <Button type="button" size="sm" color="secondary" className="ms-2" onClick={applyMondayToAll}>
                        Aplicar a todos
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
        <Col lg={12}>
          <div className="hstack gap-2 justify-content-end">
            <Button type="submit" color="primary" disabled={saving}>
              {saving && <Spinner size="sm" className="me-2" />} Guardar horarios
            </Button>
            <Button type="button" color="soft-success" onClick={() => onCancel?.()}>
              Cancelar
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );

  if (section === "datos") return DatosForm;
  if (section === "horario") return HorarioForm;
  return null;
};

export default DatosTenant;
