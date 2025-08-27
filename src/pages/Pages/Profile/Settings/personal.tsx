// src/pages/Pages/Profile/Settings/personal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button, Spinner, Table, Badge, Modal, ModalHeader, ModalBody, ModalFooter,
  Row, Col, Input, Label, Alert, UncontrolledDropdown, DropdownToggle, DropdownMenu,
  Nav, NavItem, NavLink, TabContent, TabPane
} from "reactstrap";
import classnames from "classnames";
import { jwtDecode } from "jwt-decode";
import { api } from "../../../../services/api";
import { getToken } from "../../../../services/auth";

/* =========================
   Tipos
========================= */
type PaymentType = "salary" | "commission";

type Staff = {
  id: string;
  tenant_id?: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role_id: number;
  is_active?: boolean;
  payment_type?: PaymentType;
  base_salary?: number | null;
  commission_rate?: number | null;
};

type Category = { id: string; name: string; created_at?: string; updated_at?: string; };

type Service = {
  id: string;
  tenant_id?: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  is_active?: boolean;
};

type AssignedSvc = { id: string; name: string };

type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type DayState = { active: boolean; open: string; close: string };
type WeekState = Record<DayKey, DayState>;

/* =========================
   Helpers generales
========================= */
const decodeTenantId = (): string | null => {
  try {
    const t = getToken();
    if (!t) return null;
    const decoded: any = jwtDecode(t);
    return decoded?.user?.tenant_id || decoded?.tenant_id || null;
  } catch { return null; }
};

const formatCOP = (raw: string): string => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  const n = Number(digits);
  try {
    return `$${new Intl.NumberFormat("es-CO").format(n)}`;
  } catch {
    return `$${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  }
};

const parseCOPToNumber = (masked: string): number => {
  const digits = (masked || "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

const formatPercent = (raw: string): string => {
  let s = (raw || "").trim().replace(/\s+/g, "");
  if (!s) return "";
  if (s.endsWith("%")) s = s.slice(0, -1);
  const val = Number(s);
  if (!isFinite(val)) return "";
  const pct = val <= 1 ? val * 100 : val;
  const clean = Math.max(0, Math.min(100, pct));
  const shown = Number.isInteger(clean) ? `${clean}` : clean.toFixed(2);
  return `${shown}%`;
};

const parsePercentToDecimal = (masked: string): number | null => {
  let s = (masked || "").trim();
  if (!s) return null;
  if (s.endsWith("%")) {
    const n = Number(s.slice(0, -1));
    if (!isFinite(n)) return null;
    return Math.max(0, Math.min(100, n)) / 100;
  }
  const n = Number(s);
  if (!isFinite(n)) return null;
  return n <= 1 ? n : n / 100;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toTime = (raw: string): string => {
  const s = (raw || "").trim();
  if (!s) return "09:00";
  const [hStr, mStr] = s.split(":");
  const h = Math.max(0, Math.min(23, Number(hStr || "0")));
  const m = Math.max(0, Math.min(59, Number(mStr ?? "0")));
  return `${pad2(h)}:${pad2(m)}`;
};

const DEFAULT_DAY: DayState = { active: false, open: "09:00", close: "17:00" };
const defaultWeek = (): WeekState => ({
  monday:    { ...DEFAULT_DAY },
  tuesday:   { ...DEFAULT_DAY },
  wednesday: { ...DEFAULT_DAY },
  thursday:  { ...DEFAULT_DAY },
  friday:    { ...DEFAULT_DAY },
  saturday:  { ...DEFAULT_DAY },
  sunday:    { ...DEFAULT_DAY },
});

const DAYS_UI: { key: DayKey; label: string }[] = [
  { key: "monday",    label: "Lunes" },
  { key: "tuesday",   label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday",  label: "Jueves" },
  { key: "friday",    label: "Viernes" },
  { key: "saturday",  label: "Sábado" },
  { key: "sunday",    label: "Domingo" },
];

const validateWeek = (week: WeekState): string | null => {
  for (const { key, label } of DAYS_UI) {
    const d = week[key];
    if (d.active) {
      const [sh, sm] = toTime(d.open).split(":").map(Number);
      const [eh, em] = toTime(d.close).split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        return `El horario de ${label} es inválido: fin debe ser mayor que inicio.`;
      }
    }
  }
  return null;
};

/* =========================
   Multiselect de Servicios con búsqueda
========================= */
const ServiceMultiSelect: React.FC<{
  services: Service[];
  categories: Category[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  catFilter: string | "all";
  onCatFilter: (id: string | "all") => void;
}> = ({ services, categories, selectedIds, onToggle, catFilter, onCatFilter }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const base = catFilter === "all" ? services : services.filter(s => s.category_id === catFilter);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (categories.find(c => c.id === s.category_id)?.name.toLowerCase() || "").includes(q)
    );
  }, [services, categories, catFilter, query]);

  const selectedCount = selectedIds.length;

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <div>
      {/* Filtro por categoría */}
      <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
        <Badge
          pill
          color={catFilter === "all" ? "primary" : "light"}
          className={catFilter === "all" ? "" : "text-dark"}
          style={{ cursor: "pointer" }}
          onClick={() => onCatFilter("all")}
        >
          Todas las categorías
        </Badge>
        {categories.map(c => (
          <Badge
            key={c.id}
            pill
            color={catFilter === c.id ? "primary" : "light"}
            className={catFilter === c.id ? "" : "text-dark"}
            style={{ cursor: "pointer" }}
            onClick={() => onCatFilter(c.id)}
          >
            {c.name}
          </Badge>
        ))}
      </div>

      {/* Dropdown con búsqueda y lista seleccionable */}
      <UncontrolledDropdown isOpen={open} toggle={() => setOpen(v => !v)}>
        <DropdownToggle caret color="light" className="w-100 d-flex justify-content-between align-items-center">
          <span className="text-start">
            {selectedCount === 0 ? "Selecciona servicios…" :
              selectedCount === 1 ? "1 servicio seleccionado" :
                `${selectedCount} servicios seleccionados`}
          </span>
        </DropdownToggle>
        <DropdownMenu className="p-2" style={{ width: "100%", maxHeight: 360, overflowY: "auto" }}>
          <div className="mb-2">
            <Input
              innerRef={searchRef}
              placeholder="Buscar servicios…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            {filtered.length === 0 && (
              <div className="text-muted px-2 py-1">Sin resultados</div>
            )}
            {filtered.map(s => {
              const checked = selectedIds.includes(s.id);
              const catName = categories.find(c => c.id === s.category_id)?.name || "—";
              return (
                <button
                  key={s.id}
                  type="button"
                  className="dropdown-item d-flex align-items-center justify-content-between"
                  onClick={() => onToggle(s.id)}
                >
                  <div className="me-2 text-start">
                    <div className="fw-semibold">{s.name}</div>
                    <div className="small text-muted">
                      {s.duration_minutes} min · ${s.price.toLocaleString()} · {catName}
                    </div>
                  </div>
                  <i className={`ri-check-line ${checked ? "" : "invisible"}`} />
                </button>
              );
            })}
          </div>
        </DropdownMenu>
      </UncontrolledDropdown>

      {/* Seleccionados como chips */}
      <div className="mt-2">
        {selectedIds.length === 0 && <span className="text-muted">No hay servicios seleccionados.</span>}
        {selectedIds.map(id => {
          const s = services.find(x => x.id === id);
          if (!s) return null;
          return (
            <Badge
              key={id}
              pill
              color="light"
              className="text-dark me-1 mb-1"
              style={{ cursor: "pointer" }}
              title="Quitar"
              onClick={() => onToggle(id)}
            >
              {s.name} <i className="ri-close-line ms-1" />
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

/* =========================
   Modal Staff con TABS: Servicios / Horarios
========================= */
const StaffModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  tenantId: string;
  services: Service[];
  categories: Category[];
  edit?: Staff | null;
}> = ({ isOpen, onClose, onSaved, tenantId, services, categories, edit }) => {
  const [saving, setSaving] = useState(false);

  // Tab actual
  const [tab, setTab] = useState<"services" | "hours">("services");

  // Datos básicos
  const [firstName, setFirstName] = useState(edit?.first_name || "");
  const [lastName, setLastName]   = useState(edit?.last_name || "");
  const [email, setEmail]         = useState(edit?.email || "");
  const [phone, setPhone]         = useState(edit?.phone || "");
  const [paymentType, setPaymentType] = useState<PaymentType>((edit?.payment_type as PaymentType) || "salary");

  // Máscaras
  const [salaryMasked, setSalaryMasked] = useState<string>(
    edit?.base_salary != null ? formatCOP(String(edit.base_salary)) : ""
  );
  const [commissionMasked, setCommissionMasked] = useState<string>(
    edit?.commission_rate != null ? `${(edit.commission_rate * 100).toString()}%` : ""
  );

  // Password + ojo
  const [password, setPassword] = useState<string>("");
  const [showPass, setShowPass] = useState<boolean>(false);

  // Servicios
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState<string | "all">("all");

  // Horarios
  const [inheritTenant, setInheritTenant] = useState<boolean>(true); // si true => working_hours = null
  const [week, setWeek] = useState<WeekState>(defaultWeek());

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: DayKey) =>
    setWeek(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));

  const changeHour = (day: DayKey, field: "open" | "close", value: string) =>
    setWeek(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  const applyMondayToAll = () => {
    const monday = week.monday;
    setWeek(prev => {
      const next: WeekState = { ...prev };
      (Object.keys(next) as DayKey[]).forEach(k => {
        if (k === "monday") return;
        next[k] = { ...next[k], active: monday.active, open: monday.open, close: monday.close };
      });
      return next;
    });
  };

  // Cargar preselección de servicios y horarios cuando edita
  useEffect(() => {
    setFirstName(edit?.first_name || "");
    setLastName(edit?.last_name || "");
    setEmail(edit?.email || "");
    setPhone(edit?.phone || "");
    setPaymentType((edit?.payment_type as PaymentType) || "salary");
    setSalaryMasked(edit?.base_salary != null ? formatCOP(String(edit.base_salary)) : "");
    setCommissionMasked(edit?.commission_rate != null ? `${(edit.commission_rate * 100).toString()}%` : "");
    setPassword("");
    setShowPass(false);
    setSelectedServiceIds([]);
    setCatFilter("all");
    setTab("services");
    setInheritTenant(true);
    setWeek(defaultWeek());

    let alive = true;

    const fetchAssigned = async () => {
      if (!edit) return;
      try {
        const { data } = await api.get(`/stylists/${edit.id}/services`);
        const ids = Array.isArray(data) ? data.map((s: AssignedSvc) => s.id).filter(Boolean) : [];
        if (alive) setSelectedServiceIds(ids);
      } catch { /* ignore */ }
    };

    const fetchWorkingHours = async () => {
      if (!edit) return;
      try {
        const { data } = await api.get(`/users/${edit.id}/working-hours`);
        // data puede ser null (hereda) o { monday:{active,open,close}, ... }
        if (!alive) return;
        if (data == null) {
          setInheritTenant(true);
          setWeek(defaultWeek());
        } else {
          // Normalizar a WeekState
          const w: WeekState = defaultWeek();
          (Object.keys(w) as DayKey[]).forEach(k => {
            const d = data[k];
            if (d) {
              w[k] = {
                active: !!d.active,
                open: d.open ? toTime(d.open) : "09:00",
                close: d.close ? toTime(d.close) : "17:00",
              };
            }
          });
          setInheritTenant(false);
          setWeek(w);
        }
      } catch { /* ignore */ }
    };

    fetchAssigned();
    fetchWorkingHours();

    return () => { alive = false; };
  }, [isOpen, edit]);

  const buildWorkingHoursPayload = (): any | null => {
    if (inheritTenant) return null;
    const err = validateWeek(week);
    if (err) throw new Error(err);
    const out: any = {};
    (Object.keys(week) as DayKey[]).forEach(k => {
      const d = week[k];
      out[k] = d.active
        ? { active: true, open: toTime(d.open), close: toTime(d.close) }
        : { active: false, open: null, close: null };
    });
    return out;
  };

  const saveAssignments = async (stylistId: string) => {
    await api.post(`/stylists/${stylistId}/services`, { service_ids: selectedServiceIds });
  };

  const save = async () => {
    if (!firstName.trim()) { alert("El nombre es obligatorio"); return; }
    if (paymentType === "salary") {
      if (!salaryMasked.trim()) { alert("Base salarial requerida para tipo 'salario'"); return; }
    } else {
      if (!commissionMasked.trim()) { alert("Porcentaje de comisión requerido para tipo 'comisión'"); return; }
    }

    // Construir números/máscaras
    const baseSalaryNumber = paymentType === "salary" ? parseCOPToNumber(salaryMasked) : 0;
    const commissionDecimal = paymentType === "commission" ? parsePercentToDecimal(commissionMasked) : null;

    // Construir horario (puede lanzar error si hay incongruencias)
    let working_hours: any | null = null;
    try {
      working_hours = buildWorkingHoursPayload(); // null si hereda
    } catch (e: any) {
      alert(e?.message || "Horario inválido");
      return;
    }

    setSaving(true);
    try {
      if (edit) {
        const body: any = {
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          role_id: 3,
          payment_type: paymentType,
          base_salary: baseSalaryNumber,
          commission_rate: commissionDecimal,
          working_hours, // <- puede ser null para heredar
        };
        await api.put(`/users/${edit.id}`, body);
        await saveAssignments(edit.id);
      } else {
        if (!password.trim()) { alert("La contraseña es obligatoria para crear un estilista"); setSaving(false); return; }
        const body: any = {
          tenant_id: tenantId,
          role_id: 3,
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          password: password.trim(),
          payment_type: paymentType,
          base_salary: baseSalaryNumber,
          commission_rate: commissionDecimal,
          working_hours, // <- puede ser null para heredar
        };
        const { data: created } = await api.post(`/users`, body);
        const newId = created?.id;
        if (newId) await saveAssignments(newId);
      }
      onSaved();
      onClose();
    } catch (e:any) {
      alert(e?.response?.data?.message || e?.message || 'No se pudo guardar el personal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="lg" centered>
      <ModalHeader toggle={onClose}>{edit ? "Editar estilista" : "Nuevo estilista"}</ModalHeader>
      <ModalBody>
        <Row className="g-3">
          <Col md={6}>
            <Label className="form-label">Nombre</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej: Marcos" />
          </Col>
          <Col md={6}>
            <Label className="form-label">Apellido</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej: Barbero" />
          </Col>
          <Col md={6}>
            <Label className="form-label">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="marcos@example.com" />
          </Col>
          <Col md={6}>
            <Label className="form-label">Teléfono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="3001234567" />
          </Col>

          {/* Password + ojito (solo al crear) */}
          {!edit && (
            <Col md={6}>
              <Label className="form-label">Contraseña</Label>
              <div className="input-group">
                <Input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  color="light"
                  onClick={() => setShowPass(v => !v)}
                  title={showPass ? "Ocultar" : "Mostrar"}
                >
                  <i className={showPass ? "ri-eye-off-line" : "ri-eye-line"} />
                </Button>
              </div>
            </Col>
          )}

          <Col md={6}>
            <Label className="form-label">Tipo de pago</Label>
            <Input
              type="select"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
            >
              <option value="salary">Salario</option>
              <option value="commission">Comisión</option>
            </Input>
          </Col>

          {/* Máscaras: Salario COP ó Comisión % */}
          {paymentType === "salary" ? (
            <Col md={6}>
              <Label className="form-label">Salario base</Label>
              <Input
                value={salaryMasked}
                placeholder="$500.000"
                onChange={(e) => setSalaryMasked(formatCOP(e.target.value))}
              />
            </Col>
          ) : (
            <Col md={6}>
              <Label className="form-label">Comisión</Label>
              <Input
                value={commissionMasked}
                placeholder="55%"
                onChange={(e) => setCommissionMasked(formatPercent(e.target.value))}
              />
            </Col>
          )}

          {/* ——— TABS: Servicios / Horarios ——— */}
          <Col md={12}>
            <Nav tabs className="mb-3">
              <NavItem>
                <NavLink
                  role="button"
                  className={classnames({ active: tab === "services" })}
                  onClick={() => setTab("services")}
                >
                  <i className="ri-scissors-2-line me-1" /> Servicios que realiza
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  role="button"
                  className={classnames({ active: tab === "hours" })}
                  onClick={() => setTab("hours")}
                >
                  <i className="ri-time-line me-1" /> Horarios
                </NavLink>
              </NavItem>
            </Nav>

            <TabContent activeTab={tab}>
              {/* Tab Servicios */}
              <TabPane tabId="services">
                <ServiceMultiSelect
                  services={services}
                  categories={categories}
                  selectedIds={selectedServiceIds}
                  onToggle={toggleService}
                  catFilter={catFilter}
                  onCatFilter={setCatFilter}
                />
              </TabPane>

              {/* Tab Horarios */}
              <TabPane tabId="hours">
                <div className="border rounded p-3">
                  <div className="form-check form-switch mb-3">
                    <Input
                      id="inheritSwitch"
                      className="form-check-input"
                      type="checkbox"
                      checked={inheritTenant}
                      onChange={() => setInheritTenant(v => !v)}
                    />
                    <Label className="form-check-label ms-2" htmlFor="inheritSwitch">
                      Usar el mismo horario del negocio, si marcas no puedes elegir su propio horario.
                    </Label>
                  </div>

                  {!inheritTenant && (
                    <>
                      {DAYS_UI.map(({ key, label }) => {
                        const d = week[key];
                        const isMonday = key === "monday";
                        return (
                          <div className="border rounded p-3 mb-3" key={key}>
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                              <div className="form-check form-switch">
                                <Input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`active-${key}`}
                                  checked={d.active}
                                  onChange={() => toggleDay(key)}
                                />
                                <Label className="form-check-label fw-semibold ms-2" htmlFor={`active-${key}`}>
                                  {label} {d.active ? "(Abierto)" : "(Cerrado)"}
                                </Label>
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                <div className="d-flex align-items-center gap-2">
                                  <Label className="mb-0" htmlFor={`open-${key}`}>Inicio</Label>
                                  <Input
                                    id={`open-${key}`}
                                    type="time"
                                    value={d.open}
                                    disabled={!d.active}
                                    onChange={(e) => changeHour(key, "open", e.target.value)}
                                  />
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                  <Label className="mb-0" htmlFor={`close-${key}`}>Fin</Label>
                                  <Input
                                    id={`close-${key}`}
                                    type="time"
                                    value={d.close}
                                    disabled={!d.active}
                                    onChange={(e) => changeHour(key, "close", e.target.value)}
                                  />
                                </div>
                                {isMonday && (
                                  <Button type="button" size="sm" color="secondary" className="ms-2" onClick={applyMondayToAll}>
                                    Aplicar a todos
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </TabPane>
            </TabContent>
          </Col>
        </Row>
      </ModalBody>

      <ModalFooter>
        <Button color="secondary" onClick={onClose}>Cancelar</Button>
        <Button color="primary" onClick={save} disabled={saving}>
          {saving && <Spinner size="sm" className="me-2" />} Guardar
        </Button>
      </ModalFooter>
    </Modal>
  );
};

/* =========================
   Vista Personal
========================= */
const Personal: React.FC = () => {
  const tenantId = useMemo(() => decodeTenantId() || "", []);
  const [error, setError] = useState<string | null>(null);

  // Carga cat/servicios (para modal)
  const [catLoading, setCatLoading] = useState(false);
  const [svcLoading, setSvcLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Staff
  const [staffLoading, setStaffLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [assignedByStaff, setAssignedByStaff] = useState<Record<string, AssignedSvc[]>>({});

  // Modal
  const [stModalOpen, setStModalOpen] = useState(false);
  const [stEdit, setStEdit] = useState<Staff | null>(null);

  const loadCategories = async () => {
    setCatLoading(true);
    try {
      const { data } = await api.get('/categories');
      setCategories(data || []);
    } catch (e:any) {
      setError(e?.response?.data?.message || e?.message || 'No se pudieron cargar las categorías');
    } finally {
      setCatLoading(false);
    }
  };

  const loadServices = async () => {
    setSvcLoading(true);
    try {
      const { data } = await api.get(`/services/tenant/${tenantId}`);
      setServices(Array.isArray(data) ? data : []);
    } catch (e:any) {
      setError(e?.response?.data?.message || e?.message || 'No se pudieron cargar los servicios');
    } finally {
      setSvcLoading(false);
    }
  };

  const loadAssignedForStaff = async (list: Staff[]) => {
    const entries: [string, AssignedSvc[]][] = await Promise.all(
      list.map(async (u) => {
        try {
          const { data } = await api.get(`/stylists/${u.id}/services`);
          const arr: AssignedSvc[] = Array.isArray(data) ? data : [];
          return [u.id, arr] as [string, AssignedSvc[]];
        } catch {
          return [u.id, []] as [string, AssignedSvc[]];
        }
      })
    );
    const map: Record<string, AssignedSvc[]> = {};
    entries.forEach(([id, svcs]) => { map[id] = svcs; });
    setAssignedByStaff(map);
  };

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const { data } = await api.get(`/users/tenant/${tenantId}`, { params: { role_id: 3 } as any });
      const arr = Array.isArray(data) ? data : [];
      setStaff(arr);
      await loadAssignedForStaff(arr);
    } catch (e:any) {
      setError(e?.response?.data?.message || e?.message || 'No se pudo cargar el personal');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId) return;
    loadCategories();
    loadServices();
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const refreshStaff = async () => { await loadStaff(); };

  const openNewStaff = () => { setStEdit(null); setStModalOpen(true); };
  const openEditStaff = (u: Staff) => { setStEdit(u); setStModalOpen(true); };
  const deleteStaff = async (u: Staff) => {
    if (!window.confirm(`¿Eliminar a ${u.first_name}${u.last_name ? ` ${u.last_name}` : ""}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      await loadStaff();
    } catch (e:any) {
      alert(e?.response?.data?.message || e?.message || 'No se pudo eliminar el personal');
    }
  };

  return (
    <div>
      {error && <Alert color="danger" fade={false}>{error}</Alert>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Personal</h5>
        <div className="d-flex align-items-center gap-2">
          {(staffLoading || catLoading || svcLoading) && <Spinner size="sm" />}
          <Button color="primary" onClick={openNewStaff}>
            <i className="ri-add-line me-1" /> Nuevo estilista
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table hover className="align-middle">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Servicios que realiza</th>
              <th style={{width: 140}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted">Sin personal</td></tr>
            )}
            {staff.map(u => {
              const svcs = assignedByStaff[u.id] || [];
              const show = svcs.slice(0, 3);
              const more = Math.max(0, svcs.length - show.length);
              return (
                <tr key={u.id}>
                  <td className="fw-semibold">{u.first_name} {u.last_name || ""}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.phone || "—"}</td>
                  <td>
                    {show.length === 0 && <span className="text-muted">—</span>}
                    {show.map(s => (
                      <Badge key={s.id} pill color="light" className="text-dark me-1 mb-1">
                        {s.name}
                      </Badge>
                    ))}
                    {more > 0 && (
                      <Badge pill color="soft-secondary" className="mb-1">+{more}</Badge>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button size="sm" color="soft-primary" onClick={() => openEditStaff(u)}>
                        <i className="ri-edit-line" />
                      </Button>
                      <Button size="sm" color="soft-danger" onClick={() => deleteStaff(u)}>
                        <i className="ri-delete-bin-line" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>

      <StaffModal
        isOpen={stModalOpen}
        onClose={() => setStModalOpen(false)}
        onSaved={refreshStaff}
        tenantId={tenantId}
        services={services}
        categories={categories}
        edit={stEdit}
      />
    </div>
  );
};

export default Personal;
