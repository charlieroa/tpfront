// src/pages/Settings/index.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, CardBody, CardHeader, Col, Container, Form, Input, Label,
  Nav, NavItem, NavLink, Row, TabContent, TabPane, Alert, Button, Spinner
} from 'reactstrap';
import classnames from "classnames";
import { jwtDecode } from "jwt-decode";

// Imágenes (ajusta rutas si difieren)
import progileBg from '../../../../assets/images/profile-bg.jpg';
import avatar1 from '../../../../assets/images/users/avatar-1.jpg';

// Servicios
import { api } from "../../../../services/api";
import { getToken } from "../../../../services/auth";

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type DayState = {
  active: boolean;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
};

type WorkingHoursPerDay = Record<DayKey, DayState>;

type Tenant = {
  id: string;

  // Campos que ya tienes en DB
  name?: string | null;
  address?: string | null;
  phone?: string | null;

  // Extras opcionales (si tu backend los soporta)
  email?: string | null;
  website?: string | null;
  iva_rate?: number | null;            // %
  admin_fee_percent?: number | null;   // %

  slug?: string | null;
  working_hours?: Record<string, string | null> | null;
  created_at?: string;
  updated_at?: string;
};

const DAYS: { key: DayKey; label: string }[] = [
  { key: "monday",    label: "Lunes" },
  { key: "tuesday",   label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday",  label: "Jueves" },
  { key: "friday",    label: "Viernes" },
  { key: "saturday",  label: "Sábado" },
  { key: "sunday",    label: "Domingo" },
];

const DEFAULT_DAY: DayState = { active: false, start: "09:00", end: "17:00" };
const defaultWeek = (): WorkingHoursPerDay => ({
  monday:    { ...DEFAULT_DAY },
  tuesday:   { ...DEFAULT_DAY },
  wednesday: { ...DEFAULT_DAY },
  thursday:  { ...DEFAULT_DAY },
  friday:    { ...DEFAULT_DAY },
  saturday:  { ...DEFAULT_DAY },
  sunday:    { ...DEFAULT_DAY },
});

// Helpers de horario
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toTime = (raw: string): string => {
  const s = (raw || "").trim();
  if (!s) return "09:00";
  const [hStr, mStr] = s.split(":");
  const h = Math.max(0, Math.min(23, Number(hStr || "0")));
  const m = Math.max(0, Math.min(59, Number(mStr ?? "0")));
  return `${pad2(h)}:${pad2(m)}`;
};

const parseRange = (range?: string | null): DayState => {
  if (!range || range.toLowerCase() === "cerrado") return { ...DEFAULT_DAY, active: false };
  const [start, end] = range.split("-").map(s => (s || "").trim());
  if (!start || !end) return { ...DEFAULT_DAY, active: false };
  return { active: true, start: toTime(start), end: toTime(end) };
};

const formatRange = (d: DayState): string => {
  if (!d.active) return "cerrado";
  if (!d.start || !d.end) return "cerrado";
  return `${toTime(d.start)}-${toTime(d.end)}`;
};

const normalizeWorkingHoursFromAPI = (wh: Tenant["working_hours"]): WorkingHoursPerDay => {
  const base = defaultWeek();
  if (!wh || typeof wh !== "object") return base;
  DAYS.forEach(({ key }) => {
    base[key] = parseRange(wh[key] ?? null);
  });
  return base;
};

const buildWorkingHoursPayload = (perDay: WorkingHoursPerDay): Record<string, string> => {
  const out: Record<string, string> = {};
  DAYS.forEach(({ key }) => {
    out[key] = formatRange(perDay[key]);
  });
  return out;
};

const validateWorkingHours = (perDay: WorkingHoursPerDay): string | null => {
  for (const { key, label } of DAYS) {
    const d = perDay[key];
    if (d.active) {
      const [sh, sm] = toTime(d.start).split(":").map(Number);
      const [eh, em] = toTime(d.end).split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      if (!(endMin > startMin)) {
        return `El horario de ${label} es inválido: la hora de fin debe ser mayor que la de inicio.`;
      }
    }
  }
  return null;
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"1" | "2">("1");

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Datos reales de DB
  const [name, setName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // Extras opcionales
  const [email, setEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [ivaRate, setIvaRate] = useState<string>("");
  const [adminFee, setAdminFee] = useState<string>("");

  // Horarios
  const [perDay, setPerDay] = useState<WorkingHoursPerDay>(defaultWeek());

  const tabChange = (tab: "1" | "2") => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  const getTenantIdFromToken = (): string | null => {
    try {
      const t = getToken();
      if (!t) return null;
      const decoded: any = jwtDecode(t);
      return decoded?.user?.tenant_id || decoded?.tenant_id || null;
    } catch {
      return null;
    }
  };

  // Cargar datos
  useEffect(() => {
    document.title = "Configuración | Peluquería";
    const load = async () => {
      setLoading(true);
      setError(null);
      setSavedMsg(null);
      try {
        const tenantId = getTenantIdFromToken();
        if (!tenantId) {
          setError("No se encontró el tenant en tu sesión. Inicia sesión nuevamente.");
          setLoading(false);
          return;
        }

        const { data } = await api.get(`/tenants/${tenantId}`);
        const t: Tenant = data;

        setTenant(t);

        // DB
        setName((t?.name ?? "") as string);
        setAddress((t?.address ?? "") as string);
        setPhone((t?.phone ?? "") as string);

        // Extras
        setEmail((t?.email ?? "") as string);
        setWebsite((t?.website ?? "") as string);
        setIvaRate(
          t?.iva_rate === null || t?.iva_rate === undefined ? "" : String(t.iva_rate)
        );
        setAdminFee(
          t?.admin_fee_percent === null || t?.admin_fee_percent === undefined ? "" : String(t.admin_fee_percent)
        );

        // Horarios
        setPerDay(normalizeWorkingHoursFromAPI(t?.working_hours));
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || "No se pudo cargar la información.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Progreso: 100% si (name+address+phone) y hay algún día activo; si no, 50%
  const progress = useMemo(() => {
    const infoOk = name.trim() !== "" && address.trim() !== "" && phone.trim() !== "";
    const hasActiveDay = DAYS.some(({ key }) => perDay[key].active);
    return infoOk && hasActiveDay ? 100 : 50;
  }, [name, address, phone, perDay]);

  // Guardar (Info + Horarios) con re-fetch
  const saveAll = async () => {
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const tenantId = tenant?.id || getTenantIdFromToken();
      if (!tenantId) throw new Error("No se encontró el tenant para actualizar.");

      // Validación horarios
      const hoursErr = validateWorkingHours(perDay);
      if (hoursErr) {
        setError(hoursErr);
        setSaving(false);
        return;
      }

      // Parseos numéricos
      const ivaValue = ivaRate.trim() === "" ? null : Number(ivaRate);
      const adminValue = adminFee.trim() === "" ? null : Number(adminFee);

      // Payload (envía datos reales + extras si tu backend los soporta)
      const payload: any = {
        name: name.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        working_hours: buildWorkingHoursPayload(perDay),
        email: email.trim() || null,
        website: website.trim() || null,
        iva_rate: ivaValue,
        admin_fee_percent: adminValue,
      };

      // 1) Guardar
      await api.put(`/tenants/${tenantId}`, payload);

      // 2) Reconsultar para reflejar backend
      const { data: fresh } = await api.get(`/tenants/${tenantId}`);

      setTenant(fresh);
      setName((fresh?.name ?? "") as string);
      setAddress((fresh?.address ?? "") as string);
      setPhone((fresh?.phone ?? "") as string);

      setEmail((fresh?.email ?? "") as string);
      setWebsite((fresh?.website ?? "") as string);
      setIvaRate(
        fresh?.iva_rate === null || fresh?.iva_rate === undefined ? "" : String(fresh.iva_rate)
      );
      setAdminFee(
        fresh?.admin_fee_percent === null || fresh?.admin_fee_percent === undefined ? "" : String(fresh.admin_fee_percent)
      );

      setPerDay(normalizeWorkingHoursFromAPI(fresh?.working_hours));

      setSavedMsg("¡Cambios guardados correctamente!");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "No se pudieron guardar los cambios.";
      setError(msg);
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 2500);
    }
  };

  // Submit handlers
  const handleSaveInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await saveAll();
  };
  const handleSaveHours = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await saveAll();
  };

  // Horarios handlers
  const toggleDay = (day: DayKey) => {
    setPerDay(prev => ({
      ...prev,
      [day]: { ...prev[day], active: !prev[day].active }
    }));
  };
  const changeHour = (day: DayKey, field: "start" | "end", value: string) => {
    setPerDay(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  // Aplicar lunes a todos
  const applyMondayToAll = () => {
    const monday = perDay.monday;
    setPerDay(prev => {
      const next = { ...prev };
      for (const { key } of DAYS) {
        if (key === "monday") continue;
        next[key] = { ...next[key], active: monday.active, start: monday.start, end: monday.end };
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <Row className="justify-content-center">
            <Col md={8} lg={6} xl={5}>
              <Card className="mt-4">
                <CardBody className="p-4 text-center">
                  <Spinner /> <span className="ms-2">Cargando configuración…</span>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          {/* Encabezado visual */}
          <div className="position-relative mx-n4 mt-n4">
            <div className="profile-wid-bg profile-setting-img">
              <img src={progileBg} className="profile-wid-img" alt="" />
              <div className="overlay-content">
                <div className="text-end p-3">
                  <div className="p-0 ms-auto rounded-circle profile-photo-edit">
                    <Input id="profile-foreground-img-file-input" type="file" className="profile-foreground-img-file-input" />
                    <Label htmlFor="profile-foreground-img-file-input" className="profile-photo-edit btn btn-light">
                      <i className="ri-image-edit-line align-bottom me-1"></i> Cambiar portada
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Row>
            {/* Col izquierda (avatar + progreso) */}
            <Col xxl={3}>
              <Card className="mt-n5">
                <CardBody className="p-4">
                  <div className="text-center">
                    <div className="profile-user position-relative d-inline-block mx-auto  mb-4">
                      <img
                        src={avatar1}
                        className="rounded-circle avatar-xl img-thumbnail user-profile-image"
                        alt="user-profile"
                      />
                      <div className="avatar-xs p-0 rounded-circle profile-photo-edit">
                        <Input id="profile-img-file-input" type="file" className="profile-img-file-input" />
                        <Label htmlFor="profile-img-file-input" className="profile-photo-edit avatar-xs">
                          <span className="avatar-title rounded-circle bg-light text-body">
                            <i className="ri-camera-fill"></i>
                          </span>
                        </Label>
                      </div>
                    </div>
                    <h5 className="fs-16 mb-1">{tenant?.slug || "Mi peluquería"}</h5>
                    <p className="text-muted mb-0">ID: {tenant?.id || "—"}</p>
                  </div>
                </CardBody>
              </Card>

              {/* Progreso (solo barra) */}
              <Card>
                <CardBody>
                  <div className="d-flex align-items-center mb-3">
                    <div className="flex-grow-1">
                      <h5 className="card-title mb-0">Avance de configuración</h5>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="badge bg-light text-primary fs-12">
                        {progress === 100 ? "Completo" : "Parcial"}
                      </span>
                    </div>
                  </div>
                  <div className="progress animated-progress custom-progress progress-label">
                    <div
                      className={`progress-bar ${progress === 100 ? "bg-success" : "bg-warning"}`}
                      role="progressbar"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="label">{progress}%</div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Col derecha: tabs 1 (Datos) y 2 (Horarios) */}
            <Col xxl={9}>
              <Card className="mt-xxl-n5">
                <CardHeader>
                  <Nav className="nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "1" })}
                        onClick={() => tabChange("1")}
                        role="button"
                      >
                        <i className="fas fa-home"></i>&nbsp; Datos de la peluquería
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "2" })}
                        onClick={() => tabChange("2")}
                        role="button"
                      >
                        <i className="ri-time-line"></i>&nbsp; Horarios por día
                      </NavLink>
                    </NavItem>
                  </Nav>
                </CardHeader>

                <CardBody className="p-4">
                  {error && <Alert color="danger" fade={false}>{error}</Alert>}
                  {savedMsg && <Alert color="success" fade={false}>{savedMsg}</Alert>}

                  <TabContent activeTab={activeTab}>
                    {/* TAB 1: Datos + Extras */}
                    <TabPane tabId="1">
                      <Form onSubmit={handleSaveInfo}>
                        <Row>
                          {/* DB */}
                          <Col lg={6}>
                            <div className="mb-3">
                              <Label htmlFor="nameInput" className="form-label">Nombre</Label>
                              <Input
                                id="nameInput"
                                type="text"
                                className="form-control"
                                placeholder="Ej: Bunker Barber Shop"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                              />
                            </div>
                          </Col>

                          <Col lg={6}>
                            <div className="mb-3">
                              <Label htmlFor="phoneInput" className="form-label">Teléfono</Label>
                              <Input
                                id="phoneInput"
                                type="text"
                                className="form-control"
                                placeholder="Ej: 3001234567"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                              />
                            </div>
                          </Col>

                          <Col lg={12}>
                            <div className="mb-3">
                              <Label htmlFor="addressInput" className="form-label">Dirección</Label>
                              <Input
                                id="addressInput"
                                type="text"
                                className="form-control"
                                placeholder="Ej: Calle 123 #45-67"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                required
                              />
                            </div>
                          </Col>

                          {/* Extras (opcionales) */}
                          <Col lg={6}>
                            <div className="mb-3">
                              <Label htmlFor="emailInput" className="form-label">Email</Label>
                              <Input
                                id="emailInput"
                                type="email"
                                className="form-control"
                                placeholder="Ej: contacto@mi-peluqueria.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                              />
                            </div>
                          </Col>

                          <Col lg={6}>
                            <div className="mb-3">
                              <Label htmlFor="websiteInput" className="form-label">Página web</Label>
                              <Input
                                id="websiteInput"
                                type="url"
                                className="form-control"
                                placeholder="https://mi-peluqueria.com"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                              />
                            </div>
                          </Col>

                          <Col lg={3}>
                            <div className="mb-3">
                              <Label htmlFor="ivaInput" className="form-label">IVA (%)</Label>
                              <Input
                                id="ivaInput"
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                className="form-control"
                                placeholder="Ej: 19"
                                value={ivaRate}
                                onChange={(e) => setIvaRate(e.target.value)}
                              />
                            </div>
                          </Col>

                          <Col lg={3}>
                            <div className="mb-3">
                              <Label htmlFor="adminFeeInput" className="form-label">% Administrativo</Label>
                              <Input
                                id="adminFeeInput"
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                className="form-control"
                                placeholder="Ej: 10"
                                value={adminFee}
                                onChange={(e) => setAdminFee(e.target.value)}
                              />
                            </div>
                          </Col>

                          <Col lg={12}>
                            <div className="hstack gap-2 justify-content-end">
                              <Button type="submit" color="primary" disabled={saving}>
                                {saving && <Spinner size="sm" className="me-2" />} Guardar cambios
                              </Button>
                              <Button
                                type="button"
                                color="soft-success"
                                onClick={() => {
                                  // Restaurar desde estado "tenant"
                                  setName((tenant?.name ?? "") as string);
                                  setAddress((tenant?.address ?? "") as string);
                                  setPhone((tenant?.phone ?? "") as string);
                                  setEmail((tenant?.email ?? "") as string);
                                  setWebsite((tenant?.website ?? "") as string);
                                  setIvaRate(
                                    tenant?.iva_rate === null || tenant?.iva_rate === undefined ? "" : String(tenant?.iva_rate)
                                  );
                                  setAdminFee(
                                    tenant?.admin_fee_percent === null || tenant?.admin_fee_percent === undefined ? "" : String(tenant?.admin_fee_percent)
                                  );
                                  setPerDay(normalizeWorkingHoursFromAPI(tenant?.working_hours));
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </Col>
                        </Row>
                      </Form>
                    </TabPane>

                    {/* TAB 2: HORARIOS POR DÍA */}
                    <TabPane tabId="2">
                      <Form onSubmit={handleSaveHours}>
                        <Row>
                          {DAYS.map(({ key, label }) => {
                            const day = perDay[key];
                            const isMonday = key === "monday";
                            return (
                              <Col lg={12} key={key}>
                                <div className="border rounded p-3 mb-3">
                                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                    {/* Activo/Inactivo */}
                                    <div className="form-check form-switch">
                                      <Input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`active-${key}`}
                                        checked={day.active}
                                        onChange={() => toggleDay(key)}
                                      />
                                      <Label className="form-check-label fw-semibold ms-2" htmlFor={`active-${key}`}>
                                        {label} {day.active ? "(Abierto)" : "(Cerrado)"}
                                      </Label>
                                    </div>

                                    {/* Horas */}
                                    <div className="d-flex align-items-center gap-3">
                                      <div className="d-flex align-items-center gap-2">
                                        <Label className="mb-0" htmlFor={`start-${key}`}>Inicio</Label>
                                        <Input
                                          id={`start-${key}`}
                                          type="time"
                                          value={day.start}
                                          disabled={!day.active}
                                          onChange={(e) => changeHour(key, "start", e.target.value)}
                                        />
                                      </div>
                                      <div className="d-flex align-items-center gap-2">
                                        <Label className="mb-0" htmlFor={`end-${key}`}>Fin</Label>
                                        <Input
                                          id={`end-${key}`}
                                          type="time"
                                          value={day.end}
                                          disabled={!day.active}
                                          onChange={(e) => changeHour(key, "end", e.target.value)}
                                        />
                                      </div>

                                      {/* “Aplicar a todos” solo en lunes */}
                                      {isMonday && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          color="secondary"
                                          className="ms-2"
                                          onClick={applyMondayToAll}
                                        >
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
                              <Button
                                type="button"
                                color="soft-success"
                                onClick={() => setPerDay(normalizeWorkingHoursFromAPI(tenant?.working_hours))}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </Col>
                        </Row>
                      </Form>
                    </TabPane>
                  </TabContent>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default Settings;
