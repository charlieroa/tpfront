// src/pages/Settings/index.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, CardBody, CardHeader, Col, Container, Form, Input, Label,
  Nav, NavItem, NavLink, Row, TabContent, TabPane, Alert, Button, Spinner,
  Modal, ModalHeader, ModalBody, ModalFooter, Table, Badge
} from 'reactstrap';
import classnames from "classnames";
import { jwtDecode } from "jwt-decode";

// Imágenes (ajusta rutas si difieren)
import progileBg from '../../../../assets/images/profile-bg.jpg';
import avatar1 from '../../../../assets/images/users/avatar-1.jpg';

// Servicios
import { api } from "../../../../services/api";
import { getToken } from "../../../../services/auth";

/* =========================
   Tipos
========================= */
type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type DayState = { active: boolean; start: string; end: string };
type WorkingHoursPerDay = Record<DayKey, DayState>;

type Tenant = {
  id: string;
  name?: string | null;
  address?: string | null;
  phone?: string | null;

  // Extras (pueden no existir en tu DB; se guardan si el backend los soporta)
  email?: string | null;
  website?: string | null;
  iva_rate?: number | null;
  admin_fee_percent?: number | null;

  slug?: string | null;
  working_hours?: Record<string, string | null> | null;
  created_at?: string;
  updated_at?: string;
};

type Category = {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
};

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

type PaymentType = "salary" | "commission";

type Staff = {
  id: string;
  tenant_id?: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role_id: number; // 3 = estilista
  is_active?: boolean;

  // Pago
  payment_type?: PaymentType;
  base_salary?: number | null;
  commission_rate?: number | null;
};

/* =========================
   Constantes y helpers
========================= */
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

// Horarios
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
  DAYS.forEach(({ key }) => { base[key] = parseRange(wh[key] ?? null); });
  return base;
};
const buildWorkingHoursPayload = (perDay: WorkingHoursPerDay): Record<string, string> => {
  const out: Record<string, string> = {};
  DAYS.forEach(({ key }) => { out[key] = formatRange(perDay[key]); });
  return out;
};
const validateWorkingHours = (perDay: WorkingHoursPerDay): string | null => {
  for (const { key, label } of DAYS) {
    const d = perDay[key];
    if (d.active) {
      const [sh, sm] = toTime(d.start).split(":").map(Number);
      const [eh, em] = toTime(d.end).split(":").map(Number);
      if (eh*60+em <= sh*60+sm) return `El horario de ${label} es inválido: fin debe ser mayor que inicio.`;
    }
  }
  return null;
};

// Generales
const decodeTenantId = (): string | null => {
  try {
    const t = getToken();
    if (!t) return null;
    const decoded: any = jwtDecode(t);
    return decoded?.user?.tenant_id || decoded?.tenant_id || null;
  } catch { return null; }
};
const ensureNumber = (v: string) => (v.trim() === "" ? null : Number(v));

/* =========================
   Modal Servicio (crear/editar)
========================= */
const ServiceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  onCategoryCreated: (c: Category) => void;
  tenantId: string;
  edit?: Service | null;
}> = ({ isOpen, onClose, onSaved, categories, onCategoryCreated, tenantId, edit }) => {
  const [saving, setSaving] = useState(false);

  const [categoryId, setCategoryId] = useState<string>(edit?.category_id || (categories[0]?.id || ""));
  const [name, setName] = useState<string>(edit?.name || "");
  const [price, setPrice] = useState<string>(edit ? String(edit.price) : "");
  const [duration, setDuration] = useState<string>(edit ? String(edit.duration_minutes) : "");
  const [description, setDescription] = useState<string>(edit?.description || "");

  // crear categoría inline
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    if (edit) {
      setCategoryId(edit.category_id);
      setName(edit.name);
      setPrice(String(edit.price));
      setDuration(String(edit.duration_minutes));
      setDescription(edit.description || "");
    } else {
      setCategoryId(categories[0]?.id || "");
      setName("");
      setPrice("");
      setDuration("");
      setDescription("");
    }
    setCreatingCat(false);
    setNewCatName("");
  }, [isOpen, edit, categories]);

  const createCategoryInline = async () => {
    if (!newCatName.trim()) return;
    try {
      setSaving(true);
      const { data } = await api.post('/categories', { name: newCatName.trim() });
      setCreatingCat(false);
      setNewCatName("");
      onCategoryCreated(data);
      setCategoryId(data.id);
    } catch (e:any) {
      alert(e?.response?.data?.message || e?.message || 'No se pudo crear la categoría');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!categoryId || !name.trim() || !price || !duration) {
      alert("Por favor completa categoría, nombre, precio y duración.");
      return;
    }
    const body: any = {
      category_id: categoryId,
      name: name.trim(),
      price: Number(price),
      duration_minutes: Number(duration),
      description: description.trim() || null,
    };

    setSaving(true);
    try {
      if (edit) {
        await api.put(`/services/${edit.id}`, body);
      } else {
        body.tenant_id = tenantId;
        await api.post(`/services`, body);
      }
      onSaved();
      onClose();
    } catch (e:any) {
      alert(e?.response?.data?.message || e?.message || 'No se pudo guardar el servicio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="lg" centered>
      <ModalHeader toggle={onClose}>{edit ? "Editar servicio" : "Nuevo servicio"}</ModalHeader>
      <ModalBody>
        <Row className="g-3">
          {/* Categoría como TAGS seleccionables */}
          <Col md={12}>
            <Label className="form-label">Categoría</Label>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {categories.length === 0 && (
                <span className="text-muted">No hay categorías. Crea una nueva.</span>
              )}
              {categories.map(c => (
                <Badge
                  key={c.id}
                  pill
                  color={c.id === categoryId ? "primary" : "light"}
                  className={c.id === categoryId ? "" : "text-dark"}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.name}
                </Badge>
              ))}
              <Button
                type="button"
                color={creatingCat ? "soft-secondary" : "secondary"}
                size="sm"
                onClick={() => setCreatingCat(v => !v)}
              >
                {creatingCat ? "Cancelar" : "Nueva categoría"}
              </Button>
            </div>
            {creatingCat && (
              <div className="d-flex gap-2 mt-2">
                <Input
                  placeholder="Nombre de la nueva categoría"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <Button type="button" color="success" onClick={createCategoryInline} disabled={saving}>
                  Crear
                </Button>
              </div>
            )}
          </Col>

          <Col md={6}>
            <Label className="form-label">Nombre del servicio</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Corte para Dama" />
          </Col>

          <Col md={6}>
            <Label className="form-label">Duración (minutos)</Label>
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ej: 60" />
          </Col>

          <Col md={6}>
            <Label className="form-label">Precio</Label>
            <Input type="number" min={0} step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej: 50000" />
          </Col>

          <Col md={12}>
            <Label className="form-label">Descripción (opcional)</Label>
            <Input type="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
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
   Modal Personal (crear/editar + asignar servicios)
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

  // Datos básicos
  const [firstName, setFirstName] = useState(edit?.first_name || "");
  const [lastName, setLastName]   = useState(edit?.last_name || "");
  const [email, setEmail]         = useState(edit?.email || "");
  const [phone, setPhone]         = useState(edit?.phone || "");

  // Pago
  const [paymentType, setPaymentType] = useState<PaymentType>( (edit?.payment_type as PaymentType) || "salary" );
  const [baseSalary, setBaseSalary]   = useState<string>( edit?.base_salary != null ? String(edit.base_salary) : "" );
  const [commission, setCommission]   = useState<string>( edit?.commission_rate != null ? String(edit.commission_rate) : "" );

  // Password solo al crear
  const [password, setPassword] = useState<string>("");

  // Asignación de servicios
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState<string | "all">("all");

  const visibleServices = useMemo(
    () => catFilter === "all" ? services : services.filter(s => s.category_id === catFilter),
    [services, catFilter]
  );

  useEffect(() => {
    // Reset al abrir
    setFirstName(edit?.first_name || "");
    setLastName(edit?.last_name || "");
    setEmail(edit?.email || "");
    setPhone(edit?.phone || "");
    setPaymentType( (edit?.payment_type as PaymentType) || "salary" );
    setBaseSalary(edit?.base_salary != null ? String(edit.base_salary) : "");
    setCommission(edit?.commission_rate != null ? String(edit.commission_rate) : "");
    setPassword("");

    setSelectedServiceIds([]);
    setCatFilter("all");

    // Si es edición, intentamos precargar servicios asignados
    const fetchAssigned = async () => {
      if (!edit) return;
      try {
        const { data } = await api.get(`/stylists/${edit.id}/services`);
        // Acepta varios formatos: array de ids, array de objetos con id, {service_ids:[]}, {services:[{id}]}
        let ids: string[] = [];
        if (Array.isArray(data)) {
          if (data.length && typeof data[0] === "string") ids = data as string[];
          else if (data.length && typeof data[0] === "object") ids = (data as any[]).map(x => x.id).filter(Boolean);
        } else if (data?.service_ids && Array.isArray(data.service_ids)) {
          ids = data.service_ids;
        } else if (data?.services && Array.isArray(data.services)) {
          ids = data.services.map((s:any) => s.id).filter(Boolean);
        }
        setSelectedServiceIds(ids);
      } catch {
        // Si no existe el GET, lo ignoramos silenciosamente
      }
    };
    fetchAssigned();
  }, [isOpen, edit]);

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const saveAssignments = async (stylistId: string) => {
    // Paso 2 de tu módulo: asignar servicios
    await api.post(`/stylists/${stylistId}/services`, { service_ids: selectedServiceIds });
  };

  const save = async () => {
    if (!firstName.trim()) { alert("El nombre es obligatorio"); return; }

    // Validación simple de pago
    if (paymentType === "salary") {
      if (baseSalary.trim() === "") { alert("Base salarial requerida para tipo 'salario'"); return; }
    } else {
      if (commission.trim() === "") { alert("Porcentaje de comisión requerido para tipo 'comisión'"); return; }
    }

    setSaving(true);
    try {
      if (edit) {
        // Editar estilista
        const body: any = {
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          role_id: 3,
          payment_type: paymentType,
          base_salary: paymentType === "salary" ? Number(baseSalary) : 0,
          commission_rate: paymentType === "commission" ? Number(commission) : null,
        };
        await api.put(`/users/${edit.id}`, body);
        await saveAssignments(edit.id);
      } else {
        // Crear estilista (requiere password)
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
          base_salary: paymentType === "salary" ? Number(baseSalary) : 0,
          commission_rate: paymentType === "commission" ? Number(commission) : null,
        };
        const { data: created } = await api.post(`/users`, body);
        const newId = created?.id;
        if (newId) {
          await saveAssignments(newId);
        }
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

          {!edit && (
            <Col md={6}>
              <Label className="form-label">Contraseña</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password123" />
            </Col>
          )}

          <Col md={6}>
            <Label className="form-label">Tipo de pago</Label>
            <Input type="select" value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
              <option value="salary">Salario</option>
              <option value="commission">Comisión</option>
            </Input>
          </Col>

          {paymentType === "salary" ? (
            <Col md={6}>
              <Label className="form-label">Salario base</Label>
              <Input type="number" min={0} step="1" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="1500000" />
            </Col>
          ) : (
            <Col md={6}>
              <Label className="form-label">% Comisión (0–1)</Label>
              <Input type="number" min={0} max={1} step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="0.55" />
            </Col>
          )}

          {/* Asignación de servicios */}
          <Col md={12}>
            <hr />
            <h6 className="mb-2">Servicios que realiza</h6>
            <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
              <Badge
                pill
                color={catFilter === "all" ? "primary" : "light"}
                className={catFilter === "all" ? "" : "text-dark"}
                style={{ cursor: "pointer" }}
                onClick={() => setCatFilter("all")}
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
                  onClick={() => setCatFilter(c.id)}
                >
                  {c.name}
                </Badge>
              ))}
            </div>

            <div className="border rounded p-2" style={{ maxHeight: 280, overflowY: "auto" }}>
              {visibleServices.length === 0 && (
                <div className="text-muted">No hay servicios para esta selección.</div>
              )}
              {visibleServices.map(s => (
                <div className="form-check" key={s.id}>
                  <Input
                    className="form-check-input"
                    type="checkbox"
                    id={`svc-${s.id}`}
                    checked={selectedServiceIds.includes(s.id)}
                    onChange={() => toggleService(s.id)}
                  />
                  <Label className="form-check-label" htmlFor={`svc-${s.id}`}>
                    <span className="fw-semibold">{s.name}</span>{" "}
                    <span className="text-muted">
                      ({s.duration_minutes} min · ${s.price.toLocaleString()})
                    </span>{" "}
                    <Badge pill color="light" className="text-dark">
                      {categories.find(c => c.id === s.category_id)?.name || "—"}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
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
   Página Settings
========================= */
const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"1" | "2" | "3" | "4">("1");

  // ---- Estado base (tenant, errores, progreso) ----
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Datos (DB reales)
  const [name, setName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // Extras
  const [email, setEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [ivaRate, setIvaRate] = useState<string>("");
  const [adminFee, setAdminFee] = useState<string>("");

  // Horarios
  const [perDay, setPerDay] = useState<WorkingHoursPerDay>(defaultWeek());

  // Servicios / Categorías
  const [catLoading, setCatLoading] = useState(false);
  const [svcLoading, setSvcLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [svModalOpen, setSvModalOpen] = useState(false);
  const [svEdit, setSvEdit] = useState<Service | null>(null);

  // Personal
  const [staffLoading, setStaffLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [stModalOpen, setStModalOpen] = useState(false);
  const [stEdit, setStEdit] = useState<Staff | null>(null);

  const tabChange = (tab: "1" | "2" | "3" | "4") => { if (activeTab !== tab) setActiveTab(tab); };

  // Cargar tenant + info + horarios
  useEffect(() => {
    document.title = "Configuración | Peluquería";
    const load = async () => {
      setLoading(true);
      setError(null);
      setSavedMsg(null);
      try {
        const tenantId = decodeTenantId();
        if (!tenantId) {
          setError("No se encontró el tenant en tu sesión. Inicia sesión nuevamente.");
          setLoading(false);
          return;
        }
        const { data } = await api.get(`/tenants/${tenantId}`);
        const t: Tenant = data;

        setTenant(t);
        setName((t?.name ?? "") as string);
        setAddress((t?.address ?? "") as string);
        setPhone((t?.phone ?? "") as string);

        setEmail((t?.email ?? "") as string);
        setWebsite((t?.website ?? "") as string);
        setIvaRate(t?.iva_rate == null ? "" : String(t.iva_rate));
        setAdminFee(t?.admin_fee_percent == null ? "" : String(t.admin_fee_percent));

        setPerDay(normalizeWorkingHoursFromAPI(t?.working_hours));
      } catch (e:any) {
        const msg = e?.response?.data?.message || e?.message || "No se pudo cargar la información.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Progreso: 100% si info (nombre+dirección+tel) y algún día activo; si no, 50%
  const progress = useMemo(() => {
    const infoOk = name.trim() !== "" && address.trim() !== "" && phone.trim() !== "";
    const hasActive = DAYS.some(({ key }) => perDay[key].active);
    return infoOk && hasActive ? 100 : 50;
  }, [name, address, phone, perDay]);

  // Guardar Info + Horarios (+extras) con re-fetch
  const saveAll = async () => {
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const tenantId = tenant?.id || decodeTenantId();
      if (!tenantId) throw new Error("No se encontró el tenant para actualizar.");

      const hoursErr = validateWorkingHours(perDay);
      if (hoursErr) { setError(hoursErr); setSaving(false); return; }

      const payload: any = {
        name: name.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        working_hours: buildWorkingHoursPayload(perDay),
        email: email.trim() || null,
        website: website.trim() || null,
        iva_rate: ensureNumber(ivaRate),
        admin_fee_percent: ensureNumber(adminFee),
      };

      await api.put(`/tenants/${tenantId}`, payload);
      const { data: fresh } = await api.get(`/tenants/${tenantId}`);

      setTenant(fresh);
      setName((fresh?.name ?? "") as string);
      setAddress((fresh?.address ?? "") as string);
      setPhone((fresh?.phone ?? "") as string);
      setEmail((fresh?.email ?? "") as string);
      setWebsite((fresh?.website ?? "") as string);
      setIvaRate(fresh?.iva_rate == null ? "" : String(fresh.iva_rate));
      setAdminFee(fresh?.admin_fee_percent == null ? "" : String(fresh.admin_fee_percent));
      setPerDay(normalizeWorkingHoursFromAPI(fresh?.working_hours));

      setSavedMsg("¡Cambios guardados correctamente!");
    } catch (e:any) {
      const msg = e?.response?.data?.message || e?.message || "No se pudieron guardar los cambios.";
      setError(msg);
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 2500);
    }
  };

  const handleSaveInfo = async (e?: React.FormEvent) => { e?.preventDefault(); await saveAll(); };
  const handleSaveHours = async (e?: React.FormEvent) => { e?.preventDefault(); await saveAll(); };

  // Handlers horarios
  const toggleDay = (day: DayKey) => {
    setPerDay(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
  };
  const changeHour = (day: DayKey, field: "start" | "end", value: string) => {
    setPerDay(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };
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

  // ====== Servicios / Categorías ======
  const tenantId = useMemo(() => decodeTenantId() || "", []);
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
  useEffect(() => {
    if (!tenantId) return;
    loadCategories();
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const refreshAllServices = async () => {
    await loadCategories();
    await loadServices();
  };
  const openNewService = () => { setSvEdit(null); setSvModalOpen(true); };
  const openEditService = (svc: Service) => { setSvEdit(svc); setSvModalOpen(true); };
  const deleteService = async (svc: Service) => {
    if (!window.confirm(`¿Eliminar el servicio "${svc.name}"?`)) return;
    try {
      await api.delete(`/services/${svc.id}`);
      await loadServices();
    } catch (e:any) {
      alert(e?.response?.data?.message || e?.message || 'No se pudo eliminar el servicio');
    }
  };

  // ====== Personal ======
  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const { data } = await api.get(`/users/tenant/${tenantId}`, { params: { role_id: 3 } as any });
      setStaff(Array.isArray(data) ? data : []);
    } catch (e:any) {
      setError(e?.response?.data?.message || e?.message || 'No se pudo cargar el personal');
    } finally {
      setStaffLoading(false);
    }
  };
  useEffect(() => {
    if (!tenantId) return;
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

  /* =========================
     Loading inicial
  ========================= */
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

  /* =========================
     Render
  ========================= */
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
                <CardBody className="p-4 text-center">
                  <div className="profile-user position-relative d-inline-block mx-auto  mb-4">
                    <img src={avatar1} className="rounded-circle avatar-xl img-thumbnail user-profile-image" alt="user-profile" />
                  </div>
                  <h5 className="fs-16 mb-1">{tenant?.slug || "Mi peluquería"}</h5>
                  <p className="text-muted mb-0">ID: {tenant?.id || "—"}</p>
                </CardBody>
              </Card>

              {/* Progreso */}
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

            {/* Col derecha: Tabs */}
            <Col xxl={9}>
              <Card className="mt-xxl-n5">
                <CardHeader>
                  <Nav className="nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === "1" })} onClick={() => tabChange("1")} role="button">
                        <i className="fas fa-home"></i>&nbsp; Datos de la peluquería
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === "2" })} onClick={() => tabChange("2")} role="button">
                        <i className="ri-time-line"></i>&nbsp; Horarios por día
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === "3" })} onClick={() => tabChange("3")} role="button">
                        <i className="ri-scissors-2-line"></i>&nbsp; Servicios
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink className={classnames({ active: activeTab === "4" })} onClick={() => tabChange("4")} role="button">
                        <i className="ri-team-line"></i>&nbsp; Personal
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
                          <Col lg={6}>
                            <div className="mb-3">
                              <Label htmlFor="nameInput" className="form-label">Nombre</Label>
                              <Input id="nameInput" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bunker Barber Shop" required />
                            </div>
                          </Col>
                          <Col lg={6}>
                            <div className="mb-3">
                              <Label htmlFor="phoneInput" className="form-label">Teléfono</Label>
                              <Input id="phoneInput" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3001234567" required />
                            </div>
                          </Col>
                          <Col lg={12}>
                            <div className="mb-3">
                              <Label htmlFor="addressInput" className="form-label">Dirección</Label>
                              <Input id="addressInput" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej: Calle 123 #45-67" required />
                            </div>
                          </Col>

                          {/* Extras */}
                          <Col lg={6}>
                            <div className="mb-3">
                              <Label htmlFor="emailInput" className="form-label">Email</Label>
                              <Input id="emailInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@mi-peluqueria.com" />
                            </div>
                          </Col>
                          <Col lg={6}>
                            <div className="mb-3">
                              <Label htmlFor="websiteInput" className="form-label">Página web</Label>
                              <Input id="websiteInput" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://mi-peluqueria.com" />
                            </div>
                          </Col>
                          <Col lg={3}>
                            <div className="mb-3">
                              <Label htmlFor="ivaInput" className="form-label">IVA (%)</Label>
                              <Input id="ivaInput" type="number" min={0} max={100} step="0.01" value={ivaRate} onChange={(e) => setIvaRate(e.target.value)} placeholder="19" />
                            </div>
                          </Col>
                          <Col lg={3}>
                            <div className="mb-3">
                              <Label htmlFor="adminFeeInput" className="form-label">% Administrativo</Label>
                              <Input id="adminFeeInput" type="number" min={0} max={100} step="0.01" value={adminFee} onChange={(e) => setAdminFee(e.target.value)} placeholder="10" />
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
                                  setName((tenant?.name ?? "") as string);
                                  setAddress((tenant?.address ?? "") as string);
                                  setPhone((tenant?.phone ?? "") as string);
                                  setEmail((tenant?.email ?? "") as string);
                                  setWebsite((tenant?.website ?? "") as string);
                                  setIvaRate(tenant?.iva_rate == null ? "" : String(tenant?.iva_rate));
                                  setAdminFee(tenant?.admin_fee_percent == null ? "" : String(tenant?.admin_fee_percent));
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

                    {/* TAB 2: Horarios por día */}
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
                                    <div className="form-check form-switch">
                                      <Input className="form-check-input" type="checkbox" id={`active-${key}`} checked={day.active} onChange={() => toggleDay(key)} />
                                      <Label className="form-check-label fw-semibold ms-2" htmlFor={`active-${key}`}>
                                        {label} {day.active ? "(Abierto)" : "(Cerrado)"}
                                      </Label>
                                    </div>
                                    <div className="d-flex align-items-center gap-3">
                                      <div className="d-flex align-items-center gap-2">
                                        <Label className="mb-0" htmlFor={`start-${key}`}>Inicio</Label>
                                        <Input id={`start-${key}`} type="time" value={day.start} disabled={!day.active} onChange={(e) => changeHour(key, "start", e.target.value)} />
                                      </div>
                                      <div className="d-flex align-items-center gap-2">
                                        <Label className="mb-0" htmlFor={`end-${key}`}>Fin</Label>
                                        <Input id={`end-${key}`} type="time" value={day.end} disabled={!day.active} onChange={(e) => changeHour(key, "end", e.target.value)} />
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
                              <Button type="button" color="soft-success" onClick={() => setPerDay(normalizeWorkingHoursFromAPI(tenant?.working_hours))}>
                                Cancelar
                              </Button>
                            </div>
                          </Col>
                        </Row>
                      </Form>
                    </TabPane>

                    {/* TAB 3: Servicios */}
                    <TabPane tabId="3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">Servicios</h5>
                        <div className="d-flex align-items-center gap-2">
                          {svcLoading && <Spinner size="sm" />}
                          <Button color="primary" onClick={openNewService}>
                            <i className="ri-add-line me-1" /> Nuevo servicio
                          </Button>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <Table hover className="align-middle">
                          <thead>
                            <tr>
                              <th>Servicio</th>
                              <th>Categoría</th>
                              <th>Duración</th>
                              <th>Precio</th>
                              <th style={{width: 140}}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {services.length === 0 && (
                              <tr><td colSpan={5} className="text-center text-muted">Sin servicios</td></tr>
                            )}
                            {services.map(s => {
                              const catName = categories.find(c => c.id === s.category_id)?.name || "—";
                              return (
                                <tr key={s.id}>
                                  <td className="fw-semibold">{s.name}</td>
                                  <td>
                                    <Badge pill color="light" className="text-dark">{catName}</Badge>
                                  </td>
                                  <td>{s.duration_minutes} min</td>
                                  <td>${s.price.toLocaleString()}</td>
                                  <td>
                                    <div className="d-flex gap-2">
                                      <Button size="sm" color="soft-primary" onClick={() => openEditService(s)}>
                                        <i className="ri-edit-line" />
                                      </Button>
                                      <Button size="sm" color="soft-danger" onClick={() => deleteService(s)}>
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

                      {/* Modal Servicio */}
                      <ServiceModal
                        isOpen={svModalOpen}
                        onClose={() => setSvModalOpen(false)}
                        onSaved={refreshAllServices}
                        categories={categories}
                        onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
                        tenantId={tenantId}
                        edit={svEdit}
                      />
                    </TabPane>

                    {/* TAB 4: Personal (Estilistas) */}
                    <TabPane tabId="4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">Personal</h5>
                        <div className="d-flex align-items-center gap-2">
                          {staffLoading && <Spinner size="sm" />}
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
                              <th style={{width: 140}}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staff.length === 0 && (
                              <tr><td colSpan={4} className="text-center text-muted">Sin personal</td></tr>
                            )}
                            {staff.map(u => (
                              <tr key={u.id}>
                                <td className="fw-semibold">
                                  {u.first_name} {u.last_name || ""}
                                </td>
                                <td>{u.email || "—"}</td>
                                <td>{u.phone || "—"}</td>
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
                            ))}
                          </tbody>
                        </Table>
                      </div>

                      {/* Modal Personal (con asignación de servicios) */}
                      <StaffModal
                        isOpen={stModalOpen}
                        onClose={() => setStModalOpen(false)}
                        onSaved={refreshStaff}
                        tenantId={tenantId}
                        services={services}
                        categories={categories}
                        edit={stEdit}
                      />
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
