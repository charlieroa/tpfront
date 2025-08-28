// src/pages/Settings/index.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card, CardBody, CardHeader, Col, Container, Form, Input, Label,
  Nav, NavItem, NavLink, Row, TabContent, TabPane, Alert, Button, Spinner,
  Modal, ModalHeader, ModalBody, ModalFooter, Table, Badge,
  Pagination, PaginationItem, PaginationLink
} from 'reactstrap';
import classnames from "classnames";
import { jwtDecode } from "jwt-decode";

import progileBg from '../../../../assets/images/profile-bg.jpg';
import avatar1 from '../../../../assets/images/users/avatar-1.jpg'; // Usaremos este como placeholder de logo

import { api } from "../../../../services/api";
import { getToken } from "../../../../services/auth";

// ——— NUEVO: Vista separada de Personal ———
import Personal from "../../../../pages/Pages/Profile/Settings/personal";

/* =========================
   Tipos (solo los que usa Settings)
========================= */
type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type DayState = { active: boolean; start: string; end: string };
type WorkingHoursPerDay = Record<DayKey, DayState>;

type Tenant = {
  id: string;
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  iva_rate?: number | null;
  admin_fee_percent?: number | null;
  slug?: string | null;
  working_hours?: Record<string, string | null> | null;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
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

/* =========================
   Constantes & helpers
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
          <Col md={12}>
            <Label className="form-label">Categoría</Label>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {categories.length === 0 && <span className="text-muted">No hay categorías. Crea una nueva.</span>}
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
                <Input placeholder="Nombre de la nueva categoría" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                <Button type="button" color="success" onClick={createCategoryInline}>Crear</Button>
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
        <Button color="primary" onClick={save}>
          Guardar
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

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Datos peluquería (pares por fila)
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [ivaRate, setIvaRate] = useState<string>("");
  const [adminFee, setAdminFee] = useState<string>("");

  // Logo
  const [logoUrl, setLogoUrl] = useState<string>("");
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);

  const [perDay, setPerDay] = useState<WorkingHoursPerDay>(defaultWeek());

  const [catLoading, setCatLoading] = useState(false);
  const [svcLoading, setSvcLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [svModalOpen, setSvModalOpen] = useState(false);
  const [svEdit, setSvEdit] = useState<Service | null>(null);

  // NUEVO: paginación de Servicios
  const SVC_PAGE_SIZE = 6;
  const [svcPage, setSvcPage] = useState<number>(1);
  const totalSvcPages = useMemo(() => Math.max(1, Math.ceil(services.length / SVC_PAGE_SIZE)), [services.length]);
  const paginatedServices = useMemo(() => {
    const start = (svcPage - 1) * SVC_PAGE_SIZE;
    const end = start + SVC_PAGE_SIZE;
    return services.slice(start, end);
  }, [services, svcPage]);
  useEffect(() => {
    if (svcPage > totalSvcPages) setSvcPage(totalSvcPages);
    if (services.length === 0) setSvcPage(1);
  }, [services.length, totalSvcPages]); // eslint-disable-line react-hooks/exhaustive-deps

  // NUEVO: conteo de personal para progreso (25%)
  const [staffCount, setStaffCount] = useState<number>(0);
  const [staffLoading, setStaffLoading] = useState<boolean>(false);

  const tabChange = (tab: "1" | "2" | "3" | "4") => { if (activeTab !== tab) setActiveTab(tab); };

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
        setPhone((t?.phone ?? "") as string);
        setAddress((t?.address ?? "") as string);
        setEmail((t?.email ?? "") as string);
        setWebsite((t?.website ?? "") as string);
        setIvaRate(t?.iva_rate == null ? "" : String(t.iva_rate));
        setAdminFee(t?.admin_fee_percent == null ? "" : String(t.admin_fee_percent));
        setLogoUrl(t?.logo_url || "");

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

  // ===== Logo Handlers =====
  const openLogoPicker = () => {
    logoInputRef.current?.click();
  };

  const handleLogoFile = async (file: File) => {
    // Preview inmediato
    const localUrl = URL.createObjectURL(file);
    setLogoUrl(localUrl);

    // Intento de upload (opcional, si tienes endpoint)
    try {
      setUploadingLogo(true);
      const form = new FormData();
      form.append('file', file);
      // Ajusta la ruta si ya tienes un uploader
      const { data } = await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Se asume que data.url devuelve la URL pública
      if (data?.url) setLogoUrl(data.url);
    } catch {
      // Si falla, mantenemos el preview local
    } finally {
      setUploadingLogo(false);
    }
  };

  const onLogoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleLogoFile(f);
  };

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
        phone: phone.trim() || null,
        address: address.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        working_hours: buildWorkingHoursPayload(perDay),
        iva_rate: ensureNumber(ivaRate),
        admin_fee_percent: ensureNumber(adminFee),
        logo_url: logoUrl || null,
      };

      await api.put(`/tenants/${tenantId}`, payload);
      const { data: fresh } = await api.get(`/tenants/${tenantId}`);

      setTenant(fresh);
      setName((fresh?.name ?? "") as string);
      setPhone((fresh?.phone ?? "") as string);
      setAddress((fresh?.address ?? "") as string);
      setEmail((fresh?.email ?? "") as string);
      setWebsite((fresh?.website ?? "") as string);
      setIvaRate(fresh?.iva_rate == null ? "" : String(fresh.iva_rate));
      setAdminFee(fresh?.admin_fee_percent == null ? "" : String(fresh.admin_fee_percent));
      setLogoUrl(fresh?.logo_url || "");

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

  const toggleDay = (day: DayKey) => setPerDay(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
  const changeHour = (day: DayKey, field: "start" | "end", value: string) =>
    setPerDay(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
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
      // Opcional: si prefieres volver siempre a la página 1 al recargar:
      setSvcPage(1);
    } catch (e:any) {
      setError(e?.response?.data?.message || e?.message || 'No se pudieron cargar los servicios');
    } finally {
      setSvcLoading(false);
    }
  };

  // ====== NUEVO: cargar personal (solo conteo) ======
  const loadStaffCount = async () => {
    if (!tenantId) return;
    setStaffLoading(true);
    try {
      // Si tu API usa otra convención, ajústala aquí:
      // Opción A (users con filtro de rol):
      const { data } = await api.get(`/users/tenant/${tenantId}?role=stylist`);
      const list = Array.isArray(data) ? data : [];
      setStaffCount(list.length);

      // Opción B (si usas /staff/tenant/:tenantId), descomenta:
      // const { data } = await api.get(`/staff/tenant/${tenantId}`);
      // setStaffCount(Array.isArray(data) ? data.length : 0);
    } catch (e:any) {
      // Si falla, no rompemos UI; marcamos 0
      setStaffCount(0);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId) return;
    loadCategories();
    loadServices();
    loadStaffCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const refreshAllServices = async () => { await loadCategories(); await loadServices(); };
  const openNewService = () => { setSvEdit(null); setSvModalOpen(true); };
  const openEditService = (svc: Service) => { setSvEdit(svc); setSvModalOpen(true); };
  const deleteService = async (svc: Service) => {
    if (!window.confirm(`¿Eliminar el servicio "${svc.name}"?`)) return;
    try {
      await api.delete(`/services/${svc.id}`);
      await loadServices();
      // El useEffect de servicios ajusta la página si quedara fuera de rango
    } catch (e:any) {
      alert(e?.response?.data?.message || e?.message || 'No se pudo eliminar el servicio');
    }
  };

  // ====== NUEVO: progreso 4x25% ======
  const progress = useMemo(() => {
    // 1) Datos
    const datosOk = name.trim() !== "" && address.trim() !== "" && phone.trim() !== "";

    // 2) Horarios (al menos un día activo + sin errores)
    const hasActive = DAYS.some(({ key }) => perDay[key].active);
    const hoursErr = validateWorkingHours(perDay);
    const horariosOk = hasActive && hoursErr === null;

    // 3) Servicios
    const serviciosOk = services.length > 0;

    // 4) Personal
    const personalOk = staffCount > 0;

    const score =
      (datosOk ? 1 : 0) +
      (horariosOk ? 1 : 0) +
      (serviciosOk ? 1 : 0) +
      (personalOk ? 1 : 0);

    return score * 25; // 0, 25, 50, 75, 100
  }, [name, address, phone, perDay, services.length, staffCount]);

  // Render de números de página para Servicios
  const renderSvcPageNumbers = () => {
    const windowSize = 5;
    let start = Math.max(1, svcPage - Math.floor(windowSize / 2));
    let end = start + windowSize - 1;
    if (end > totalSvcPages) {
      end = totalSvcPages;
      start = Math.max(1, end - windowSize + 1);
    }
    const items = [];
    for (let p = start; p <= end; p++) {
      items.push(
        <PaginationItem key={p} active={p === svcPage}>
          <PaginationLink onClick={() => setSvcPage(p)}>{p}</PaginationLink>
        </PaginationItem>
      );
    }
    return items;
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
          {/* Header visual */}
          <div className="position-relative mx-n4 mt-n4">
            <div className="profile-wid-bg profile-setting-img">
              <img src={progileBg} className="profile-wid-img" alt="" />
              <div className="overlay-content">
                <div className="text-end p-3">
                  <div className="p-0 ms-auto rounded-circle profile-photo-edit">
                    <Input id="profile-foreground-img-file-input" type="file" className="profile-foreground-img-file-input" />
                   
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Row>
            {/* Col izquierda: logo + progreso */}
            <Col xxl={3}>
              <Card className="mt-n5">
                <CardBody className="p-4 text-center">
                  {/* BLOQUE DE LOGO EDITABLE */}
                  <div className="profile-user position-relative d-inline-block mx-auto mb-4" style={{ cursor: 'pointer' }} onClick={openLogoPicker} title="Cambiar logo">
                    <img
                      src={logoUrl || avatar1}
                      className="rounded-circle avatar-xl img-thumbnail user-profile-image"
                      alt="logo"
                    />
                    <span
                      className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 36, height: 36, border: '2px solid white' }}
                    >
                      <i className="ri-image-edit-line"></i>
                    </span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="d-none"
                      onChange={onLogoInputChange}
                    />
                  </div>
                  <div className="small text-muted mb-2">
                    {uploadingLogo ? "Subiendo logo…" : "Haz clic en el logo para cambiarlo"}
                  </div>
                  <h5 className="fs-16 mb-1">{tenant?.slug || "Mi peluquería"}</h5>
                </CardBody>
              </Card>

              {/* Avance */}
              <Card>
                <CardBody>
                  <div className="d-flex align-items-center mb-3">
                    <div className="flex-grow-1"><h5 className="card-title mb-0">Avance de configuración</h5></div>
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

                  {/* Opcional: mini leyenda del estado por bloque */}
                  <ul className="list-unstyled mt-3 mb-0">
                    <li className="d-flex align-items-center gap-2">
                      <i className={`ri-checkbox-${(name && phone && address) ? 'circle' : 'blank'}-line`}></i>
                      <span>Datos</span>
                    </li>
                    <li className="d-flex align-items-center gap-2">
                      <i className={`ri-checkbox-${(DAYS.some(d => perDay[d.key].active) && validateWorkingHours(perDay) === null) ? 'circle' : 'blank'}-line`}></i>
                      <span>Horarios</span>
                    </li>
                    <li className="d-flex align-items-center gap-2">
                      <i className={`ri-checkbox-${(services.length > 0) ? 'circle' : 'blank'}-line`}></i>
                      <span>Servicios</span>
                    </li>
                    <li className="d-flex align-items-center gap-2">
                      <i className={`ri-checkbox-${(staffCount > 0) ? 'circle' : 'blank'}-line`}></i>
                      <span>Personal {staffLoading && <Spinner size="sm" />}</span>
                    </li>
                  </ul>
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
                    {/* TAB 1: Datos de la Peluquería (pares por fila) */}
                    <TabPane tabId="1">
                      <Form onSubmit={handleSaveInfo}>
                        <Row className="g-3">
                          <Col lg={6}>
                            <div className="mb-0">
                              <Label htmlFor="nameInput" className="form-label">Nombre</Label>
                              <Input id="nameInput" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bunker Barber Shop" required />
                            </div>
                          </Col>
                          <Col lg={6}>
                            <div className="mb-0">
                              <Label htmlFor="phoneInput" className="form-label">Teléfono</Label>
                              <Input id="phoneInput" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3001234567" required />
                            </div>
                          </Col>

                          <Col lg={6}>
                            <div className="mb-0">
                              <Label htmlFor="addressInput" className="form-label">Dirección</Label>
                              <Input id="addressInput" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej: Calle 123 #45-67" required />
                            </div>
                          </Col>
                          <Col lg={6}>
                            <div className="mb-0">
                              <Label htmlFor="emailInput" className="form-label">Email</Label>
                              <Input id="emailInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@mi-peluqueria.com" />
                            </div>
                          </Col>

                          <Col lg={6}>
                            <div className="mb-0">
                              <Label htmlFor="websiteInput" className="form-label">Página web</Label>
                              <Input id="websiteInput" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://mi-peluqueria.com" />
                            </div>
                          </Col>
                          <Col lg={3}>
                            <div className="mb-0">
                              <Label htmlFor="ivaInput" className="form-label">IVA (%)</Label>
                              <Input id="ivaInput" type="number" min={0} max={100} step="0.01" value={ivaRate} onChange={(e) => setIvaRate(e.target.value)} placeholder="19" />
                            </div>
                          </Col>
                          <Col lg={3}>
                            <div className="mb-0">
                              <Label htmlFor="adminFeeInput" className="form-label">% Administrativo</Label>
                              <Input id="adminFeeInput" type="number" min={0} max={100} step="0.01" value={adminFee} onChange={(e) => setAdminFee(e.target.value)} placeholder="10" />
                            </div>
                          </Col>

                          <Col lg={12} className="pt-2">
                            <div className="hstack gap-2 justify-content-end">
                              <Button type="submit" color="primary" disabled={saving}>
                                {saving && <Spinner size="sm" className="me-2" />} Guardar cambios
                              </Button>
                              <Button
                                type="button"
                                color="soft-success"
                                onClick={() => {
                                  setName((tenant?.name ?? "") as string);
                                  setPhone((tenant?.phone ?? "") as string);
                                  setAddress((tenant?.address ?? "") as string);
                                  setEmail((tenant?.email ?? "") as string);
                                  setWebsite((tenant?.website ?? "") as string);
                                  setIvaRate(tenant?.iva_rate == null ? "" : String(tenant?.iva_rate));
                                  setAdminFee(tenant?.admin_fee_percent == null ? "" : String(tenant?.admin_fee_percent));
                                  setLogoUrl(tenant?.logo_url || "");
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

                    {/* TAB 2 */}
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

                    {/* TAB 3: Servicios (con paginación SIEMPRE visible) */}
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
                            {paginatedServices.length === 0 && (
                              <tr><td colSpan={5} className="text-center text-muted">Sin servicios</td></tr>
                            )}
                            {paginatedServices.map(s => {
                              const catName = categories.find(c => c.id === s.category_id)?.name || "—";
                              return (
                                <tr key={s.id}>
                                  <td className="fw-semibold">{s.name}</td>
                                  <td><Badge pill color="light" className="text-dark">{catName}</Badge></td>
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

                      {/* Controles de paginación — SIEMPRE visibles */}
                      <div className="d-flex justify-content-end">
                        <Pagination className="pagination-separated mb-0">
                          <PaginationItem disabled={svcPage === 1}>
                            <PaginationLink first onClick={() => setSvcPage(1)} />
                          </PaginationItem>
                          <PaginationItem disabled={svcPage === 1}>
                            <PaginationLink previous onClick={() => setSvcPage(p => Math.max(1, p - 1))} />
                          </PaginationItem>

                          {renderSvcPageNumbers()}

                          <PaginationItem disabled={svcPage === totalSvcPages}>
                            <PaginationLink next onClick={() => setSvcPage(p => Math.min(totalSvcPages, p + 1))} />
                          </PaginationItem>
                          <PaginationItem disabled={svcPage === totalSvcPages}>
                            <PaginationLink last onClick={() => setSvcPage(totalSvcPages)} />
                          </PaginationItem>
                        </Pagination>
                      </div>

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

                    {/* TAB 4: Personal */}
                    <TabPane tabId="4">
                      <Personal />
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
