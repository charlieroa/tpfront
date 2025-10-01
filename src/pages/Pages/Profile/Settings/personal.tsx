// Archivo: src/pages/Settings/personal.tsx (Asegúrate de que la ruta sea correcta)

// --- Importaciones ---
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button, Spinner, Table, Badge, Modal, ModalHeader, ModalBody, ModalFooter,
  Row, Col, Input, Label, Alert, UncontrolledDropdown, DropdownToggle, DropdownMenu,
  Nav, NavItem, NavLink, TabContent, TabPane,
  Pagination, PaginationItem, PaginationLink
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

// --- AJUSTE: Estos tipos ahora vendrán como props, pero los mantenemos para referencia ---
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
type DayKey = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";
type DayState = { active: boolean; open: string; close: string };
type WeekState = Record<DayKey, DayState>;

// --- AJUSTE: Definimos las props que el componente recibirá desde Settings.tsx ---
interface PersonalProps {
  services: Service[];
  categories: Category[];
   onStaffChange: () => void;
}

/* =========================
   Helpers
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
    const digits = (raw || "").replace(/[^\d.,]/g, "").replace(",", ".");
    if (!digits) return "";
    const val = parseFloat(digits);
    if (!isFinite(val)) return "";
    const clean = Math.max(0, Math.min(100, val));
    const shown = Number.isInteger(clean) ? `${clean}` : clean.toFixed(2).replace(/\.?0+$/, "");
    return `${shown}%`;
};

const parsePercentToDecimal = (masked: string): number | null => {
    let s = (masked || "").trim();
    if (!s) return null;
    if (s.endsWith("%")) {
        s = s.slice(0, -1);
    }
    const n = parseFloat(s.replace(",", "."));
    if (!isFinite(n)) return null;
    return Math.max(0, Math.min(100, n)) / 100;
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
    lunes:   { ...DEFAULT_DAY },
    martes:   { ...DEFAULT_DAY },
    miercoles: { ...DEFAULT_DAY },
    jueves:   { ...DEFAULT_DAY },
    viernes:  { ...DEFAULT_DAY },
    sabado:   { ...DEFAULT_DAY },
    domingo:  { ...DEFAULT_DAY },
});

const DAYS_UI: { key: DayKey; label: string }[] = [
    { key: "lunes",   label: "Lunes" },
    { key: "martes",  label: "Martes" },
    { key: "miercoles", label: "Miércoles" },
    { key: "jueves",  label: "Jueves" },
    { key: "viernes",   label: "Viernes" },
    { key: "sabado",  label: "Sábado" },
    { key: "domingo",   label: "Domingo" },
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
   Componentes Anidados
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
    const [tab, setTab] = useState<"services" | "hours">("services");
    const [roleId, setRoleId] = useState<number>(edit?.role_id || 3); 
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [paymentType, setPaymentType] = useState<PaymentType>("salary");
    const [salaryMasked, setSalaryMasked] = useState<string>("");
    const [commissionMasked, setCommissionMasked] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPass, setShowPass] = useState<boolean>(false);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [catFilter, setCatFilter] = useState<string | "all">("all");
    const [inheritTenant, setInheritTenant] = useState<boolean>(true);
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
      const monday = week.lunes;
      setWeek(prev => {
        const next: WeekState = { ...prev };
        (Object.keys(next) as DayKey[]).forEach(k => {
          if (k === "lunes") return;
          next[k] = { ...next[k], active: monday.active, open: monday.open, close: monday.close };
        });
        return next;
      });
    };
  
    useEffect(() => {
      const isEditing = !!edit;
      const currentRoleId = isEditing ? edit.role_id : 3;
      setRoleId(currentRoleId);
      setFirstName(isEditing ? edit.first_name : "");
      setLastName(isEditing ? edit.last_name || "" : "");
      setEmail(isEditing ? edit.email || "" : "");
      setPhone(isEditing ? edit.phone || "" : "");
      const currentPaymentType = isEditing && currentRoleId === 3 ? (edit.payment_type as PaymentType) || "salary" : "salary";
      setPaymentType(currentPaymentType);
      setSalaryMasked(isEditing && edit.base_salary != null ? formatCOP(String(edit.base_salary)) : "");
      setCommissionMasked(isEditing && edit.commission_rate != null ? formatPercent(String(edit.commission_rate * 100)) : "");
      setPassword("");
      setShowPass(false);
      setSelectedServiceIds([]);
      setCatFilter("all");
      setTab("services");
      setInheritTenant(true);
      setWeek(defaultWeek());
      let alive = true;
      if (isEditing && edit.role_id === 3) {
          const fetchAssigned = async () => {
              try {
                  const { data } = await api.get(`/stylists/${edit.id}/services`);
                  const ids = Array.isArray(data) ? data.map((s: AssignedSvc) => s.id).filter(Boolean) : [];
                  if (alive) setSelectedServiceIds(ids);
              } catch { /* ignore */ }
          };
          const fetchWorkingHours = async () => {
              const keyMap: Record<DayKey, string> = { lunes: "monday", martes: "tuesday", miercoles: "wednesday", jueves: "thursday", viernes: "friday", sabado: "saturday", domingo: "sunday" };
              try {
                  const { data } = await api.get(`/users/${edit.id}/working-hours`);
                  if (!alive) return;
                  if (data == null) {
                      setInheritTenant(true);
                      setWeek(defaultWeek());
                  } else {
                      const w: WeekState = defaultWeek();
                      (Object.keys(w) as DayKey[]).forEach(k => {
                          const keyEnIngles = keyMap[k];
                          const dayData = data[keyEnIngles];
                          if (dayData) {
                              w[k] = { active: !!dayData.active, open: dayData.open ? toTime(dayData.open) : "09:00", close: dayData.close ? toTime(dayData.close) : "17:00" };
                          }
                      });
                      setInheritTenant(false);
                      setWeek(w);
                  }
              } catch { /* ignore */ }
          };
          fetchAssigned();
          fetchWorkingHours();
      }
      return () => { alive = false; };
    }, [isOpen, edit]);
    
    useEffect(() => {
      if (roleId === 2) {
          setPaymentType("salary");
      }
    }, [roleId]);

    useEffect(() => {
        if (paymentType === 'salary') {
            setCommissionMasked("");
        } else if (paymentType === 'commission') {
            setSalaryMasked("");
        }
    }, [paymentType]);
  
    const buildWorkingHoursPayload = (): any | null => {
      if (inheritTenant) return null;
      const err = validateWeek(week);
      if (err) throw new Error(err);
      const keyMapToEnglish: Record<DayKey, string> = { lunes: "monday", martes: "tuesday", miercoles: "wednesday", jueves: "thursday", viernes: "friday", sabado: "saturday", domingo: "sunday" };
      const out: any = {};
      (Object.keys(week) as DayKey[]).forEach(k => {
        const d = week[k];
        const keyEnIngles = keyMapToEnglish[k];
        out[keyEnIngles] = d.active ? { active: true, open: toTime(d.open), close: toTime(d.close) } : { active: false, open: null, close: null };
      });
      return out;
    };
  
    const saveAssignments = async (stylistId: string) => {
      await api.post(`/stylists/${stylistId}/services`, { service_ids: selectedServiceIds });
    };
    
    const save = async () => {
        if (!firstName.trim()) {
            Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'El nombre es obligatorio.' });
            return;
        }
        
        if (!salaryMasked.trim() && paymentType === 'salary' && roleId === 3) {
            Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'El salario base es requerido para estilistas con este tipo de pago.' });
            return;
        }
    
        const isStylist = roleId === 3;
        let working_hours: any | null = null;
        if (isStylist) {
            try {
                working_hours = buildWorkingHoursPayload();
            } catch (e: any) {
                Swal.fire({ icon: 'error', title: 'Horario Inválido', text: e?.message || "Por favor revisa los horarios." });
                return;
            }
        }
    
        setSaving(true);
        try {
            const baseBody = {
                first_name: firstName.trim(),
                last_name: lastName.trim() || null,
                email: email.trim() || null,
                phone: phone.trim() || null,
                role_id: roleId,
                payment_type: isStylist ? paymentType : "salary",
                base_salary: (isStylist && paymentType === 'salary') ? parseCOPToNumber(salaryMasked) : 0,
                commission_rate: (isStylist && paymentType === 'commission') ? parsePercentToDecimal(commissionMasked) : null,
                working_hours: isStylist ? working_hours : undefined,
            };
    
            if (edit) {
                await api.put(`/users/${edit.id}`, baseBody);
                if (isStylist) await saveAssignments(edit.id);
            } else {
                if (!password.trim()) {
                    Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'La contraseña es obligatoria para crear personal.' });
                    setSaving(false);
                    return;
                }
                const createBody = {
                    ...baseBody,
                    tenant_id: tenantId,
                    password: password.trim(),
                };
                const { data: created } = await api.post(`/users`, createBody);
                if (created?.id && isStylist) await saveAssignments(created.id);
            }

            Swal.fire({
                icon: 'success',
                title: edit ? '¡Personal actualizado!' : '¡Personal creado!',
                showConfirmButton: false,
                timer: 1500
            });

            onSaved();
            onClose();
        } catch (e:any) {
            Swal.fire({
                icon: 'error',
                title: 'Error al guardar',
                text: e?.response?.data?.message || e?.response?.data?.error || e?.message || 'No se pudo guardar el personal'
            });
        } finally {
            setSaving(false);
        }
    };
    
    const roleName = roleId === 2 ? "Cajero" : "Estilista";
  
    return (
        <Modal isOpen={isOpen} toggle={onClose} size="lg" centered>
            <ModalHeader toggle={onClose}>{edit ? `Editar ${roleName}` : `Nuevo Personal`}</ModalHeader>
            <ModalBody>
                <Row className="g-3">
                    {!edit && (
                        <Col md={12}>
                        <Label className="form-label">Tipo de Personal</Label>
                        <Input
                            type="select"
                            value={roleId}
                            onChange={(e) => setRoleId(Number(e.target.value))}
                        >
                            <option value={3}>Estilista</option>
                            <option value={2}>Cajero</option>
                        </Input>
                        </Col>
                    )}
        
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
                        <div className="input-group">
                            <Input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"/>
                            <Button type="button" color="light" onClick={() => setShowPass(v => !v)} title={showPass ? "Ocultar" : "Mostrar"}>
                            <i className={showPass ? "ri-eye-off-line" : "ri-eye-line"} />
                            </Button>
                        </div>
                        </Col>
                    )}
                    
                    {roleId === 3 && (
                        <Col md={6}>
                            <Label className="form-label">Tipo de pago</Label>
                            <Input type="select" value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
                            <option value="salary">Salario</option>
                            <option value="commission">Comisión</option>
                            </Input>
                        </Col>
                    )}
        
                    {(paymentType === "salary" && roleId === 3) && (
                        <Col md={6}>
                            <Label className="form-label">Salario base</Label>
                            <Input value={salaryMasked} placeholder="$500.000" onChange={(e) => setSalaryMasked(formatCOP(e.target.value))} />
                        </Col>
                    )}

                    {(paymentType === "commission" && roleId === 3) && (
                        <Col md={6}>
                            <Label className="form-label">Comisión</Label>
                            <Input value={commissionMasked} placeholder="55%" onChange={(e) => setCommissionMasked(formatPercent(e.target.value))} />
                        </Col>
                    )}
                    
                    {roleId === 3 && (
                        <Col md={12}>
                            <Nav tabs className="mb-3">
                            <NavItem>
                                <NavLink role="button" className={classnames({ active: tab === "services" })} onClick={() => setTab("services")}>
                                <i className="ri-scissors-2-line me-1" /> Servicios que realiza
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink role="button" className={classnames({ active: tab === "hours" })} onClick={() => setTab("hours")}>
                                <i className="ri-time-line me-1" /> Horarios
                                </NavLink>
                            </NavItem>
                            </Nav>
                
                            <TabContent activeTab={tab}>
                            <TabPane tabId="services">
                                <ServiceMultiSelect services={services} categories={categories} selectedIds={selectedServiceIds} onToggle={toggleService} catFilter={catFilter} onCatFilter={setCatFilter} />
                            </TabPane>
                            <TabPane tabId="hours">
                                <div className="border rounded p-3">
                                <div className="form-check form-switch mb-3">
                                    <Input id="inheritSwitch" className="form-check-input" type="checkbox" checked={inheritTenant} onChange={() => setInheritTenant(v => !v)} />
                                    <Label className="form-check-label ms-2" htmlFor="inheritSwitch">
                                        Usar el mismo horario del negocio. Si desmarcas, puedes elegir su propio horario.
                                    </Label>
                                </div>
                                {!inheritTenant && (
                                    <>
                                    {DAYS_UI.map(({ key, label }) => {
                                        const d = week[key];
                                        const isMonday = key === "lunes";
                                        return (
                                        <div className="border rounded p-3 mb-3" key={key}>
                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                                            <div className="form-check form-switch">
                                                <Input className="form-check-input" type="checkbox" id={`active-${key}`} checked={d.active} onChange={() => toggleDay(key)} />
                                                <Label className="form-check-label fw-semibold ms-2" htmlFor={`active-${key}`}>
                                                {label} {d.active ? "(Abierto)" : "(Cerrado)"}
                                                </Label>
                                            </div>
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="d-flex align-items-center gap-2">
                                                <Label className="mb-0" htmlFor={`open-${key}`}>Inicio</Label>
                                                <Input id={`open-${key}`} type="time" value={d.open} disabled={!d.active} onChange={(e) => changeHour(key, "open", e.target.value)} />
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                <Label className="mb-0" htmlFor={`close-${key}`}>Fin</Label>
                                                <Input id={`close-${key}`} type="time" value={d.close} disabled={!d.active} onChange={(e) => changeHour(key, "close", e.target.value)} />
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
                    )}
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

// --- AJUSTE: El componente principal ahora recibe props ---
const Personal: React.FC<PersonalProps> = ({ services, categories, onStaffChange }) => {
    const tenantId = useMemo(() => decodeTenantId() || "", []);
    const [error, setError] = useState<string | null>(null);
    const [staffLoading, setStaffLoading] = useState(false);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [assignedByStaff, setAssignedByStaff] = useState<Record<string, AssignedSvc[]>>({});
    const [stModalOpen, setStModalOpen] = useState(false);
    const [stEdit, setStEdit] = useState<Staff | null>(null);
    const PAGE_SIZE = 6;
    const [page, setPage] = useState<number>(1);
  
    const totalPages = useMemo(() => Math.max(1, Math.ceil(staff.length / PAGE_SIZE)), [staff.length]);
    const paginatedStaff = useMemo(() => staff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [staff, page]);
  
    useEffect(() => {
      if (page > totalPages) setPage(totalPages);
      if (staff.length === 0) setPage(1);
    }, [staff.length, totalPages, page]);
  
    const loadAssignedForStaff = async (list: Staff[]) => {
      const stylists = list.filter(u => u.role_id === 3); 
      if (stylists.length === 0) {
          setAssignedByStaff({});
          return;
      }
      const entries = await Promise.all(
          stylists.map(async (u) => {
          try {
            const { data } = await api.get(`/stylists/${u.id}/services`);
            return [u.id, Array.isArray(data) ? data : []] as [string, AssignedSvc[]];
          } catch {
            return [u.id, []] as [string, AssignedSvc[]];
          }
        })
      );
      setAssignedByStaff(Object.fromEntries(entries));
    };
    
    const loadStaff = async () => {
      setStaffLoading(true);
      try {
        const { data } = await api.get(`/users/tenant/${tenantId}`, { params: { role_ids: '2,3' } });
        const allStaff = Array.isArray(data) ? data : [];
        const filteredStaff = allStaff.filter(user => user.role_id === 2 || user.role_id === 3);
        setStaff(filteredStaff);
        await loadAssignedForStaff(filteredStaff);
        setPage(1);
      } catch (e:any) {
        setError(e?.response?.data?.message || e?.message || 'No se pudo cargar el personal');
      } finally {
        setStaffLoading(false);
      }
    };
  
    useEffect(() => {
      if (!tenantId) return;
      loadStaff();
    }, [tenantId]);
  
    // --- AJUSTE: `refreshStaff` ahora notifica al componente padre ---
    const refreshStaff = async () => { 
        await loadStaff(); 
        onStaffChange(); // <-- AVISA AL PADRE QUE HUBO UN CAMBIO
    };
  
    const openNewStaff = () => { setStEdit(null); setStModalOpen(true); };
    const openEditStaff = (u: Staff) => { setStEdit(u); setStModalOpen(true); };
    
    const deleteStaff = async (u: Staff) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Vas a eliminar a ${u.first_name}${u.last_name ? ` ${u.last_name}` : ""}. ¡Esta acción no se puede deshacer!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        });
    
        if (result.isConfirmed) {
            try {
                await api.delete(`/users/${u.id}`);
                // --- AJUSTE: `refreshStaff` se llama aquí también para notificar al padre ---
                await refreshStaff();
                Swal.fire(
                    '¡Eliminado!',
                    `${u.first_name} ha sido eliminado del personal.`,
                    'success'
                );
            } catch (e:any) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: e?.response?.data?.message || e?.message || 'No se pudo eliminar el personal.'
                });
            }
        }
    };

    const renderPageNumbers = () => {
        const windowSize = 5;
        let start = Math.max(1, page - Math.floor(windowSize / 2));
        let end = start + windowSize - 1;
        if (end > totalPages) {
          end = totalPages;
          start = Math.max(1, end - windowSize + 1);
        }
        const items = [];
        for (let p = start; p <= end; p++) {
          items.push(
            <PaginationItem key={p} active={p === page}>
              <PaginationLink onClick={() => setPage(p)}>{p}</PaginationLink>
            </PaginationItem>
          );
        }
        return items;
    };
  
    return (
      <div>
        {/* ... (El resto del JSX no necesita cambios) ... */}
        {error && <Alert color="danger" fade={false}>{error}</Alert>}
        <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Personal</h5>
            <div className="d-flex align-items-center gap-2">
            {staffLoading && <Spinner size="sm" />}
            <Button color="primary" onClick={openNewStaff}>
                <i className="ri-add-line me-1" /> Nuevo Personal
            </Button>
            </div>
        </div>
        <div className="table-responsive">
            <Table hover className="align-middle">
            <thead>
                <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Pago</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Servicios que realiza</th>
                <th style={{width: 140}}>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {paginatedStaff.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted">Sin personal</td></tr>
                )}
                {paginatedStaff.map(u => {
                const svcs = assignedByStaff[u.id] || [];
                const show = svcs.slice(0, 3);
                const more = Math.max(0, svcs.length - show.length);
                return (
                    <tr key={u.id}>
                    <td className="fw-semibold">{u.first_name} {u.last_name || ""}</td>
                    <td>
                        {u.role_id === 2 ? <Badge color="info">Cajero</Badge> : <Badge color="success">Estilista</Badge>}
                    </td>
                    <td>
                        {u.role_id === 3 ? (
                            u.payment_type === 'commission' && u.commission_rate ? (
                                <Badge color="info" pill>
                                    {(u.commission_rate * 100).toFixed(0)}%
                                </Badge>
                            ) : u.payment_type === 'salary' ? (
                                <Badge color="light" className="text-dark" pill>
                                    {formatCOP(String(u.base_salary))}
                                </Badge>
                            ) : <span className="text-muted">—</span>
                        ) : (
                            <span className="text-muted">—</span>
                        )}
                    </td>
                    <td>{u.email || "—"}</td>
                    <td>{u.phone || "—"}</td>
                    <td>
                        {u.role_id === 3 ? (
                            <>
                            {show.length === 0 && <span className="text-muted">—</span>}
                            {show.map(s => <Badge key={s.id} pill color="light" className="text-dark me-1 mb-1">{s.name}</Badge>)}
                            {more > 0 && <Badge pill color="soft-secondary" className="mb-1">+{more}</Badge>}
                            </>
                        ) : (
                            <span className="text-muted">N/A</span>
                        )}
                    </td>
                    <td>
                        <div className="d-flex gap-2">
                        <Button size="sm" color="soft-primary" onClick={() => openEditStaff(u)}><i className="ri-edit-line" /></Button>
                        <Button size="sm" color="soft-danger" onClick={() => deleteStaff(u)}><i className="ri-delete-bin-line" /></Button>
                        </div>
                    </td>
                    </tr>
                );
                })}
            </tbody>
            </Table>
        </div>

        <div className="d-flex justify-content-end">
            <Pagination className="pagination-separated mb-0">
            <PaginationItem disabled={page === 1}><PaginationLink first onClick={() => setPage(1)} /></PaginationItem>
            <PaginationItem disabled={page === 1}><PaginationLink previous onClick={() => setPage(p => Math.max(1, p - 1))} /></PaginationItem>
            {renderPageNumbers()}
            <PaginationItem disabled={page === totalPages}><PaginationLink next onClick={() => setPage(p => Math.min(totalPages, p + 1))} /></PaginationItem>
            <PaginationItem disabled={page === totalPages}><PaginationLink last onClick={() => setPage(totalPages)} /></PaginationItem>
            </Pagination>
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