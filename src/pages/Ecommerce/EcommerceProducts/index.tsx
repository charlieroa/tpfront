// Ubicación: src/pages/Ecommerce/EcommerceProducts/index.tsx
// NUEVO DISEÑO: Estilo Premium Dashboard con efectos visuales modernos

import React, { useEffect, useMemo, useState, ChangeEvent } from "react";
import {
    Container, UncontrolledDropdown, DropdownToggle, DropdownItem, DropdownMenu,
    Row, Card, CardBody, Col, Modal, ModalHeader, ModalBody,
    ModalFooter, Button, Form, Label, Input, Spinner, InputGroup,
    Badge, Progress, Nav, NavItem, NavLink
} from "reactstrap";
import classnames from "classnames";
import Swal from 'sweetalert2';
import CreatableSelect from 'react-select/creatable';
import CurrencyInput from 'react-currency-input-field';
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";

// Redux
import { useSelector, useDispatch } from "react-redux";
import {
    createNewProduct, createNewCategory, deleteExistingProduct, fetchProductCategories,
    fetchProducts, updateExistingProduct, uploadProductImage, updateExistingCategory, deleteExistingCategory
} from "../../../slices/products/thunk";
import { Product } from "../../../services/productApi";
import { AppDispatch, RootState } from "../../../index";
import { api } from "../../../services/api";
import { getToken } from "../../../services/auth";

import BreadCrumb from "../../../Components/Common/BreadCrumb";
import CategoryManagerModal from "../../../Components/Common/CategoryManagerModal";

const BACKEND_URL = process.env.REACT_APP_API_URL;

type TabKey = "all" | "cliente" | "estilista";

const decodeTenantId = (): string | null => {
    try {
        const t = getToken();
        if (!t) return null;
        const decoded: any = jwtDecode(t);
        return decoded?.user?.tenant_id || decoded?.tenant_id || null;
    } catch { return null; }
};

// Estilos inline para efectos premium
const styles = {
    productCard: {
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        border: 'none',
        borderRadius: '16px',
        overflow: 'hidden',
    },
    productCardHover: {
        transform: 'translateY(-8px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    },
    imageContainer: {
        position: 'relative' as const,
        height: '200px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    productImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const,
        transition: 'transform 0.5s ease',
    },
    priceTag: {
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontWeight: 'bold',
        fontSize: '1.1rem',
    },
    stockBadge: {
        position: 'absolute' as const,
        top: '12px',
        left: '12px',
        zIndex: 10,
    },
    actionOverlay: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        opacity: 0,
        transition: 'opacity 0.3s ease',
    },
    statCard: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        color: 'white',
        border: 'none',
    },
    statCard2: {
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        borderRadius: '16px',
        color: 'white',
        border: 'none',
    },
    statCard3: {
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        borderRadius: '16px',
        color: 'white',
        border: 'none',
    },
    statCard4: {
        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        borderRadius: '16px',
        color: 'white',
        border: 'none',
    },
};

const ProductsPage = () => {
    document.title = "Inventario Premium | StyleApp";
    const dispatch: AppDispatch = useDispatch();
    const { products: allProducts, categories, status } = useSelector((state: RootState) => state.products);

    const [canSellToStaff, setCanSellToStaff] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    // Modales
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCategoryManagerOpen, setCategoryManagerOpen] = useState(false);

    useEffect(() => {
        dispatch(fetchProducts());
        dispatch(fetchProductCategories());
        fetchTenantSettings();
    }, [dispatch]);

    const fetchTenantSettings = async () => {
        try {
            const tenantId = decodeTenantId();
            if (tenantId) {
                const response = await api.get(`/tenants/${tenantId}`);
                setCanSellToStaff(response.data.products_for_staff_enabled ?? true);
            }
        } catch { setCanSellToStaff(true); }
    };

    // --- Stats ---
    const stats = useMemo(() => {
        const total = allProducts.length;
        const lowStock = allProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 5).length;
        const outOfStock = allProducts.filter(p => (p.stock || 0) <= 0).length;
        const totalValue = allProducts.reduce((acc, p) => acc + ((p.sale_price || 0) * (p.stock || 0)), 0);
        return { total, lowStock, outOfStock, totalValue };
    }, [allProducts]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

    const getStockInfo = (stock: number) => {
        if (stock <= 0) return { color: "danger", label: "Agotado", bg: "bg-danger" };
        if (stock < 5) return { color: "warning", label: `Solo ${stock}`, bg: "bg-warning" };
        return { color: "success", label: `${stock} disp.`, bg: "bg-success" };
    };

    // --- Filtros ---
    const categoryOptions = useMemo(() => categories.map(cat => ({ value: cat.id, label: cat.name })), [categories]);

    const filteredProducts = useMemo(() => {
        let filtered = [...allProducts];
        if (searchTerm) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (activeTab === 'cliente') filtered = filtered.filter(p => p.audience_type === 'cliente' || p.audience_type === 'ambos');
        if (activeTab === 'estilista') filtered = filtered.filter(p => p.audience_type === 'estilista' || p.audience_type === 'ambos');
        if (activeCategoryFilter !== "all") filtered = filtered.filter(p => p.category_id === activeCategoryFilter);
        return filtered;
    }, [allProducts, activeTab, activeCategoryFilter, searchTerm]);

    // --- Handlers ---
    const handleAddClick = () => {
        setIsEditMode(false);
        setFormData({ audience_type: 'cliente', cost_price: 0, sale_price: 0, staff_price: 0, stock: 0, product_commission_percent: 0 });
        setImagePreview(null);
        setSelectedImageFile(null);
        setModalOpen(true);
    };

    const handleEditClick = (product: Product) => {
        setIsEditMode(true);
        setFormData(product);
        setImagePreview(product.image_url ? `${BACKEND_URL}${product.image_url}` : null);
        setSelectedImageFile(null);
        setModalOpen(true);
    };

    const handleDeleteClick = (product: Product) => {
        Swal.fire({
            title: '¿Eliminar producto?',
            text: `"${product.name}" será eliminado permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            background: '#1a1a2e',
            color: '#fff'
        }).then((result) => { if (result.isConfirmed) dispatch(deleteExistingProduct(product.id)); });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditMode && formData.id) {
            const productDataToUpdate: Partial<Product> = { ...formData };
            delete productDataToUpdate.id;
            if (selectedImageFile) await dispatch(uploadProductImage({ id: formData.id, imageFile: selectedImageFile }));
            dispatch(updateExistingProduct({ id: formData.id, productData: productDataToUpdate }));
        } else {
            const productData: Omit<Product, 'id' | 'image_url'> = {
                name: formData.name!, description: formData.description,
                cost_price: Number(formData.cost_price || 0), sale_price: Number(formData.sale_price || 0),
                staff_price: Number(formData.staff_price || 0), stock: Number(formData.stock || 0),
                category_id: formData.category_id, audience_type: canSellToStaff ? formData.audience_type! : 'cliente',
                product_commission_percent: Number(formData.product_commission_percent || 0),
            };
            dispatch(createNewProduct({ productData, imageFile: selectedImageFile || undefined }));
        }
        setModalOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setSelectedImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : null);
    };

    const handleCategoryChange = (val: any) => setFormData(p => ({ ...p, category_id: val?.value }));
    const handleCreateCategory = (val: string) => dispatch(createNewCategory(val));
    const handleUpdateCategory = async (id: string, name: string) => dispatch(updateExistingCategory({ id, name }));
    const handleDeleteCategory = async (id: string) => {
        await dispatch(deleteExistingCategory(id));
        if (formData.category_id === id) setFormData(p => ({ ...p, category_id: undefined }));
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Inventario" pageTitle="Productos" />

                    {/* --- Stats Cards con Gradientes --- */}
                    <Row className="mb-4">
                        <Col xl={3} md={6}>
                            <Card style={styles.statCard} className="card-animate">
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-white bg-opacity-25 rounded-circle fs-2">
                                                📦
                                            </span>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <p className="text-white-50 mb-1 text-uppercase fs-12">Total Productos</p>
                                            <h3 className="mb-0 text-white">{stats.total}</h3>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={3} md={6}>
                            <Card style={styles.statCard2} className="card-animate">
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-white bg-opacity-25 rounded-circle fs-2">
                                                ⚠️
                                            </span>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <p className="text-white-50 mb-1 text-uppercase fs-12">Poco Stock</p>
                                            <h3 className="mb-0 text-white">{stats.lowStock}</h3>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={3} md={6}>
                            <Card style={styles.statCard3} className="card-animate">
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-white bg-opacity-25 rounded-circle fs-2">
                                                ❌
                                            </span>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <p className="text-white-50 mb-1 text-uppercase fs-12">Agotados</p>
                                            <h3 className="mb-0 text-white">{stats.outOfStock}</h3>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={3} md={6}>
                            <Card style={styles.statCard4} className="card-animate">
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-white bg-opacity-25 rounded-circle fs-2">
                                                💰
                                            </span>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <p className="text-white-50 mb-1 text-uppercase fs-12">Valor Inventario</p>
                                            <h3 className="mb-0 text-white fs-5">{formatCurrency(stats.totalValue)}</h3>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    {/* --- Header con Filtros y Búsqueda --- */}
                    <Card className="mb-4" style={{ borderRadius: '16px', border: 'none' }}>
                        <CardBody>
                            <Row className="g-3 align-items-center">
                                <Col lg={4}>
                                    <div className="search-box">
                                        <Input
                                            type="text"
                                            className="form-control form-control-lg bg-light border-0"
                                            placeholder="🔍 Buscar productos..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ borderRadius: '12px' }}
                                        />
                                    </div>
                                </Col>
                                <Col lg={3}>
                                    <Input
                                        type="select"
                                        className="form-select form-select-lg bg-light border-0"
                                        value={activeCategoryFilter}
                                        onChange={(e) => setActiveCategoryFilter(e.target.value)}
                                        style={{ borderRadius: '12px' }}
                                    >
                                        <option value="all">🏷️ Todas las Categorías</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </Input>
                                </Col>
                                <Col lg={3}>
                                    <Nav pills className="nav-pills-custom">
                                        <NavItem>
                                            <NavLink className={classnames({ active: activeTab === 'all' })} onClick={() => setActiveTab('all')} style={{ cursor: 'pointer' }}>
                                                Todos
                                            </NavLink>
                                        </NavItem>
                                        <NavItem>
                                            <NavLink className={classnames({ active: activeTab === 'cliente' })} onClick={() => setActiveTab('cliente')} style={{ cursor: 'pointer' }}>
                                                Clientes
                                            </NavLink>
                                        </NavItem>
                                        {canSellToStaff && (
                                            <NavItem>
                                                <NavLink className={classnames({ active: activeTab === 'estilista' })} onClick={() => setActiveTab('estilista')} style={{ cursor: 'pointer' }}>
                                                    Staff
                                                </NavLink>
                                            </NavItem>
                                        )}
                                    </Nav>
                                </Col>
                                <Col lg={2} className="text-end">
                                    <Button
                                        color="primary"
                                        size="lg"
                                        onClick={handleAddClick}
                                        style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
                                    >
                                        <i className="ri-add-line me-1"></i> Nuevo
                                    </Button>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* --- Grid de Productos Premium --- */}
                    <Row>
                        {status === 'loading' ? (
                            <Col xs={12} className="text-center py-5">
                                <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
                                <p className="mt-3 text-muted">Cargando productos...</p>
                            </Col>
                        ) : filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => {
                                const stockInfo = getStockInfo(product.stock || 0);
                                const isHovered = hoveredCard === product.id;
                                return (
                                    <Col key={product.id} xxl={3} xl={4} lg={4} md={6} className="mb-4">
                                        <Card
                                            style={{
                                                ...styles.productCard,
                                                ...(isHovered ? styles.productCardHover : {}),
                                                boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.15)' : '0 4px 15px rgba(0,0,0,0.08)',
                                            }}
                                            onMouseEnter={() => setHoveredCard(product.id)}
                                            onMouseLeave={() => setHoveredCard(null)}
                                        >
                                            {/* Imagen con Overlay */}
                                            <div style={styles.imageContainer}>
                                                <Badge
                                                    color={stockInfo.color}
                                                    style={styles.stockBadge}
                                                    className="px-3 py-2 fs-12"
                                                >
                                                    {stockInfo.label}
                                                </Badge>

                                                <img
                                                    src={product.image_url ? `${BACKEND_URL}${product.image_url}` : "https://via.placeholder.com/300x200/667eea/ffffff?text=Sin+Imagen"}
                                                    alt={product.name}
                                                    style={{
                                                        ...styles.productImage,
                                                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                                                    }}
                                                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300x200/667eea/ffffff?text=Sin+Imagen"; }}
                                                />

                                                {/* Action Buttons Overlay */}
                                                <div style={{
                                                    ...styles.actionOverlay,
                                                    opacity: isHovered ? 1 : 0,
                                                }}>
                                                    <Button color="light" className="rounded-circle" onClick={() => handleEditClick(product)}>
                                                        <i className="ri-edit-2-line fs-18"></i>
                                                    </Button>
                                                    <Button color="danger" className="rounded-circle" onClick={() => handleDeleteClick(product)}>
                                                        <i className="ri-delete-bin-line fs-18"></i>
                                                    </Button>
                                                </div>
                                            </div>

                                            <CardBody className="p-4">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <h5 className="mb-1 text-truncate" style={{ maxWidth: '180px' }}>
                                                            {product.name}
                                                        </h5>
                                                        <p className="text-muted fs-12 mb-0">
                                                            {product.category_name || 'Sin Categoría'}
                                                        </p>
                                                    </div>
                                                    <span style={styles.priceTag}>
                                                        {formatCurrency(product.sale_price || 0)}
                                                    </span>
                                                </div>

                                                {/* Stock Progress */}
                                                <div className="mt-3">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span className="text-muted fs-11">Stock</span>
                                                        <span className="fw-medium">{product.stock || 0} unidades</span>
                                                    </div>
                                                    <Progress
                                                        value={Math.min(100, ((product.stock || 0) / 20) * 100)}
                                                        color={stockInfo.color}
                                                        style={{ height: '6px', borderRadius: '3px' }}
                                                    />
                                                </div>

                                                {canSellToStaff && (
                                                    <div className="mt-3 pt-3 border-top">
                                                        <div className="d-flex justify-content-between">
                                                            <span className="text-muted fs-12">Precio Staff</span>
                                                            <span className="text-primary fw-medium">{formatCurrency(product.staff_price || 0)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardBody>
                                        </Card>
                                    </Col>
                                );
                            })
                        ) : (
                            <Col xs={12}>
                                <Card className="text-center py-5" style={{ borderRadius: '16px', border: 'none' }}>
                                    <CardBody>
                                        <div style={{ fontSize: '4rem' }}>📦</div>
                                        <h4 className="mt-3">No hay productos</h4>
                                        <p className="text-muted">Agrega tu primer producto para comenzar</p>
                                        <Button color="primary" onClick={handleAddClick} style={{ borderRadius: '12px' }}>
                                            <i className="ri-add-line me-1"></i> Agregar Producto
                                        </Button>
                                    </CardBody>
                                </Card>
                            </Col>
                        )}
                    </Row>

                    {/* --- Modal Producto --- */}
                    <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} centered size="lg">
                        <ModalHeader toggle={() => setModalOpen(false)} className="bg-primary text-white">
                            {isEditMode ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
                        </ModalHeader>
                        <Form onSubmit={handleFormSubmit}>
                            <ModalBody>
                                <Row>
                                    <Col md={8} className="mb-3">
                                        <Label className="fw-medium">Nombre del Producto</Label>
                                        <Input required value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Shampoo Keratina 500ml" className="border-0 bg-light" />
                                    </Col>
                                    <Col md={4} className="mb-3">
                                        <Label className="fw-medium">Categoría</Label>
                                        <div className="d-flex gap-2">
                                            <div className="flex-grow-1">
                                                <CreatableSelect
                                                    isClearable options={categoryOptions}
                                                    value={categoryOptions.find(o => o.value === formData.category_id)}
                                                    onChange={handleCategoryChange} onCreateOption={handleCreateCategory}
                                                    placeholder="Seleccionar..."
                                                />
                                            </div>
                                            <Button color="light" size="sm" onClick={() => setCategoryManagerOpen(true)}><i className="ri-settings-3-line"></i></Button>
                                        </div>
                                    </Col>

                                    <Col md={4} className="mb-3">
                                        <Label className="fw-medium text-success">💰 Precio Venta</Label>
                                        <CurrencyInput className="form-control bg-light border-0" value={formData.sale_price} onValueChange={(val) => setFormData(p => ({ ...p, sale_price: Number(val) }))} prefix="$ " groupSeparator="." decimalsLimit={0} />
                                    </Col>
                                    {canSellToStaff && (
                                        <>
                                            <Col md={4} className="mb-3">
                                                <Label className="fw-medium text-primary">👤 Precio Staff</Label>
                                                <CurrencyInput className="form-control bg-light border-0" value={formData.staff_price} onValueChange={(val) => setFormData(p => ({ ...p, staff_price: Number(val) }))} prefix="$ " groupSeparator="." decimalsLimit={0} />
                                            </Col>
                                            <Col md={4} className="mb-3">
                                                <Label className="fw-medium">% Comisión</Label>
                                                <Input type="number" className="bg-light border-0" min="0" max="100" value={formData.product_commission_percent || ''} onChange={e => setFormData(p => ({ ...p, product_commission_percent: Number(e.target.value) }))} />
                                            </Col>
                                        </>
                                    )}

                                    <Col md={4} className="mb-3">
                                        <Label className="fw-medium">💵 Costo</Label>
                                        <CurrencyInput className="form-control bg-light border-0" value={formData.cost_price} onValueChange={(val) => setFormData(p => ({ ...p, cost_price: Number(val) }))} prefix="$ " groupSeparator="." decimalsLimit={0} />
                                    </Col>
                                    <Col md={4} className="mb-3">
                                        <Label className="fw-medium">📦 Stock</Label>
                                        <Input type="number" className="bg-light border-0" required value={formData.stock || ''} onChange={e => setFormData(p => ({ ...p, stock: Number(e.target.value) }))} />
                                    </Col>
                                    {canSellToStaff && (
                                        <Col md={4} className="mb-3">
                                            <Label className="fw-medium">🎯 Audiencia</Label>
                                            <Input type="select" className="bg-light border-0" value={formData.audience_type || 'cliente'} onChange={(e) => setFormData(p => ({ ...p, audience_type: e.target.value as any }))}>
                                                <option value="cliente">Solo Clientes</option>
                                                <option value="estilista">Solo Staff</option>
                                                <option value="ambos">Ambos</option>
                                            </Input>
                                        </Col>
                                    )}

                                    <Col md={12} className="mb-3">
                                        <Label className="fw-medium">📝 Descripción</Label>
                                        <Input type="textarea" className="bg-light border-0" rows={2} value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                                    </Col>
                                    <Col md={12} className="mb-3">
                                        <Label className="fw-medium">📷 Imagen</Label>
                                        <Input type="file" className="bg-light border-0" accept="image/*" onChange={handleFileChange} />
                                        {(imagePreview || formData.image_url) && (
                                            <div className="mt-2 text-center p-3 bg-light rounded">
                                                <img src={imagePreview || (formData.image_url ? `${BACKEND_URL}${formData.image_url}` : '')} alt="Preview" style={{ maxHeight: "120px", borderRadius: '12px' }} />
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="light" onClick={() => setModalOpen(false)}>Cancelar</Button>
                                <Button color="primary" type="submit" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
                                    💾 Guardar
                                </Button>
                            </ModalFooter>
                        </Form>
                    </Modal>

                    <CategoryManagerModal isOpen={isCategoryManagerOpen} toggle={() => setCategoryManagerOpen(false)} title="Gestionar Categorías" categories={categories} onSave={handleUpdateCategory} onDelete={handleDeleteCategory} />
                </Container>
            </div>
        </React.Fragment>
    );
};

export default ProductsPage;