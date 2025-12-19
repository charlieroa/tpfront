// Ubicación: src/pages/Ecommerce/EcommerceProducts/index.tsx
// DISEÑO LIMPIO: Estilo Velzon minimalista con tabla hover elegante

import React, { useEffect, useMemo, useState } from "react";
import {
    Container, Row, Card, CardBody, CardHeader, Col, Modal, ModalHeader, ModalBody,
    ModalFooter, Button, Form, Label, Input, Spinner, Badge,
    UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem
} from "reactstrap";
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

const decodeTenantId = (): string | null => {
    try {
        const t = getToken();
        if (!t) return null;
        const decoded: any = jwtDecode(t);
        return decoded?.user?.tenant_id || decoded?.tenant_id || null;
    } catch { return null; }
};

const ProductsPage = () => {
    document.title = "Inventario | StyleApp";
    const dispatch: AppDispatch = useDispatch();
    const { products: allProducts, categories, status } = useSelector((state: RootState) => state.products);

    const [canSellToStaff, setCanSellToStaff] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

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

    const getStockBadge = (stock: number) => {
        if (stock <= 0) return <Badge color="danger" className="bg-danger-subtle text-danger">Agotado</Badge>;
        if (stock < 5) return <Badge color="warning" className="bg-warning-subtle text-warning">Bajo: {stock}</Badge>;
        return <span className="fw-medium">{stock}</span>;
    };

    // --- Filtros ---
    const categoryOptions = useMemo(() => categories.map(cat => ({ value: cat.id, label: cat.name })), [categories]);

    const filteredProducts = useMemo(() => {
        let filtered = [...allProducts];
        if (searchTerm) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (activeCategoryFilter !== "all") filtered = filtered.filter(p => p.category_id === activeCategoryFilter);
        return filtered;
    }, [allProducts, activeCategoryFilter, searchTerm]);

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
            cancelButtonText: 'Cancelar'
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

                    {/* --- Stats Mini Cards --- */}
                    <Row>
                        <Col xl={3} md={6}>
                            <Card className="card-animate">
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1">
                                            <p className="text-uppercase fw-medium text-muted mb-0">Total Productos</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-end justify-content-between mt-4">
                                        <h4 className="fs-22 fw-semibold mb-0">{stats.total}</h4>
                                        <span className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-primary-subtle rounded fs-3">
                                                <i className="ri-shopping-bag-line text-primary"></i>
                                            </span>
                                        </span>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={3} md={6}>
                            <Card className="card-animate">
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1">
                                            <p className="text-uppercase fw-medium text-muted mb-0">Poco Stock</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-end justify-content-between mt-4">
                                        <h4 className="fs-22 fw-semibold mb-0">{stats.lowStock}</h4>
                                        <span className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-warning-subtle rounded fs-3">
                                                <i className="ri-alert-line text-warning"></i>
                                            </span>
                                        </span>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={3} md={6}>
                            <Card className="card-animate">
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1">
                                            <p className="text-uppercase fw-medium text-muted mb-0">Agotados</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-end justify-content-between mt-4">
                                        <h4 className="fs-22 fw-semibold mb-0">{stats.outOfStock}</h4>
                                        <span className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-danger-subtle rounded fs-3">
                                                <i className="ri-close-circle-line text-danger"></i>
                                            </span>
                                        </span>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={3} md={6}>
                            <Card className="card-animate">
                                <CardBody>
                                    <div className="d-flex align-items-center">
                                        <div className="flex-grow-1">
                                            <p className="text-uppercase fw-medium text-muted mb-0">Valor Inventario</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-end justify-content-between mt-4">
                                        <h4 className="fs-22 fw-semibold mb-0">{formatCurrency(stats.totalValue)}</h4>
                                        <span className="avatar-sm flex-shrink-0">
                                            <span className="avatar-title bg-success-subtle rounded fs-3">
                                                <i className="ri-money-dollar-circle-line text-success"></i>
                                            </span>
                                        </span>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>

                    {/* --- Main Products Table --- */}
                    <Card>
                        <CardHeader className="border-0">
                            <Row className="g-3 align-items-center">
                                <Col lg={4}>
                                    <div className="search-box">
                                        <Input
                                            type="text"
                                            className="form-control search"
                                            placeholder="Buscar productos..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <i className="ri-search-line search-icon"></i>
                                    </div>
                                </Col>
                                <Col lg={3}>
                                    <select
                                        className="form-control"
                                        value={activeCategoryFilter}
                                        onChange={(e) => setActiveCategoryFilter(e.target.value)}
                                    >
                                        <option value="all">Todas las Categorías</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </Col>
                                <Col className="col-lg-auto ms-auto">
                                    <div className="hstack gap-2">
                                        <Button color="soft-secondary" onClick={() => setCategoryManagerOpen(true)}>
                                            <i className="ri-settings-3-line align-bottom me-1"></i> Categorías
                                        </Button>
                                        <Button color="success" onClick={handleAddClick}>
                                            <i className="ri-add-fill me-1 align-bottom"></i> Agregar Producto
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </CardHeader>

                        <CardBody>
                            {status === 'loading' ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                </div>
                            ) : (
                                <div className="table-responsive table-card">
                                    <table className="table table-hover table-centered align-middle table-nowrap mb-0">
                                        <thead className="text-muted table-light">
                                            <tr>
                                                <th scope="col">Producto</th>
                                                <th scope="col">Categoría</th>
                                                <th scope="col">P. Venta</th>
                                                {canSellToStaff && <th scope="col">P. Staff</th>}
                                                <th scope="col">Stock</th>
                                                <th scope="col">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                                                <tr key={product.id}>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="avatar-sm bg-light rounded p-1 me-2">
                                                                <img
                                                                    src={product.image_url ? `${BACKEND_URL}${product.image_url}` : "https://via.placeholder.com/60x60/f3f4f6/6b7280?text=P"}
                                                                    alt={product.name}
                                                                    className="img-fluid d-block"
                                                                    style={{ maxHeight: '40px', objectFit: 'contain' }}
                                                                    onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/60x60/f3f4f6/6b7280?text=P"; }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <h5 className="fs-14 my-1">
                                                                    <Link to="#" onClick={(e) => { e.preventDefault(); handleEditClick(product); }} className="text-reset">
                                                                        {product.name}
                                                                    </Link>
                                                                </h5>
                                                                {product.description && (
                                                                    <span className="text-muted fs-12">{product.description.substring(0, 40)}...</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="text-muted">{product.category_name || '-'}</span>
                                                    </td>
                                                    <td>
                                                        <h5 className="fs-14 my-1 fw-medium text-success">{formatCurrency(product.sale_price || 0)}</h5>
                                                    </td>
                                                    {canSellToStaff && (
                                                        <td>
                                                            <span className="text-primary">{formatCurrency(product.staff_price || 0)}</span>
                                                        </td>
                                                    )}
                                                    <td>
                                                        {getStockBadge(product.stock || 0)}
                                                    </td>
                                                    <td>
                                                        <UncontrolledDropdown>
                                                            <DropdownToggle href="#" className="btn btn-soft-secondary btn-sm" tag="button">
                                                                <i className="ri-more-fill"></i>
                                                            </DropdownToggle>
                                                            <DropdownMenu className="dropdown-menu-end">
                                                                <DropdownItem onClick={() => handleEditClick(product)}>
                                                                    <i className="ri-pencil-fill align-bottom me-2 text-muted"></i> Editar
                                                                </DropdownItem>
                                                                <DropdownItem divider />
                                                                <DropdownItem onClick={() => handleDeleteClick(product)} className="text-danger">
                                                                    <i className="ri-delete-bin-fill align-bottom me-2"></i> Eliminar
                                                                </DropdownItem>
                                                            </DropdownMenu>
                                                        </UncontrolledDropdown>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={canSellToStaff ? 6 : 5} className="text-center py-4">
                                                        <div className="text-muted">
                                                            <i className="ri-inbox-line fs-1 d-block mb-2"></i>
                                                            No hay productos que mostrar
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {filteredProducts.length > 0 && (
                                <div className="align-items-center mt-4 pt-2 justify-content-between row text-center text-sm-start">
                                    <div className="col-sm">
                                        <div className="text-muted">
                                            Mostrando <span className="fw-semibold">{filteredProducts.length}</span> de <span className="fw-semibold">{allProducts.length}</span> productos
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* --- Modal Producto --- */}
                    <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} centered size="lg">
                        <ModalHeader toggle={() => setModalOpen(false)}>
                            {isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
                        </ModalHeader>
                        <Form onSubmit={handleFormSubmit}>
                            <ModalBody>
                                <Row>
                                    <Col md={8} className="mb-3">
                                        <Label className="form-label">Nombre del Producto</Label>
                                        <Input required value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Shampoo Keratina 500ml" />
                                    </Col>
                                    <Col md={4} className="mb-3">
                                        <Label className="form-label">Categoría</Label>
                                        <div className="d-flex gap-2">
                                            <div className="flex-grow-1">
                                                <CreatableSelect
                                                    isClearable options={categoryOptions}
                                                    value={categoryOptions.find(o => o.value === formData.category_id)}
                                                    onChange={handleCategoryChange} onCreateOption={handleCreateCategory}
                                                    placeholder="Seleccionar..."
                                                />
                                            </div>
                                        </div>
                                    </Col>

                                    <Col md={4} className="mb-3">
                                        <Label className="form-label">Precio Venta</Label>
                                        <CurrencyInput className="form-control" value={formData.sale_price} onValueChange={(val) => setFormData(p => ({ ...p, sale_price: Number(val) }))} prefix="$ " groupSeparator="." decimalsLimit={0} />
                                    </Col>
                                    <Col md={4} className="mb-3">
                                        <Label className="form-label">Costo</Label>
                                        <CurrencyInput className="form-control" value={formData.cost_price} onValueChange={(val) => setFormData(p => ({ ...p, cost_price: Number(val) }))} prefix="$ " groupSeparator="." decimalsLimit={0} />
                                    </Col>
                                    <Col md={4} className="mb-3">
                                        <Label className="form-label">Stock</Label>
                                        <Input type="number" required value={formData.stock || ''} onChange={e => setFormData(p => ({ ...p, stock: Number(e.target.value) }))} />
                                    </Col>

                                    {canSellToStaff && (
                                        <>
                                            <Col md={4} className="mb-3">
                                                <Label className="form-label">Precio Staff</Label>
                                                <CurrencyInput className="form-control" value={formData.staff_price} onValueChange={(val) => setFormData(p => ({ ...p, staff_price: Number(val) }))} prefix="$ " groupSeparator="." decimalsLimit={0} />
                                            </Col>
                                            <Col md={4} className="mb-3">
                                                <Label className="form-label">Comisión Staff (%)</Label>
                                                <Input type="number" min="0" max="100" value={formData.product_commission_percent || ''} onChange={e => setFormData(p => ({ ...p, product_commission_percent: Number(e.target.value) }))} />
                                            </Col>
                                            <Col md={4} className="mb-3">
                                                <Label className="form-label">Audiencia</Label>
                                                <Input type="select" value={formData.audience_type || 'cliente'} onChange={(e) => setFormData(p => ({ ...p, audience_type: e.target.value as any }))}>
                                                    <option value="cliente">Solo Clientes</option>
                                                    <option value="estilista">Solo Staff</option>
                                                    <option value="ambos">Ambos</option>
                                                </Input>
                                            </Col>
                                        </>
                                    )}

                                    <Col md={12} className="mb-3">
                                        <Label className="form-label">Descripción</Label>
                                        <Input type="textarea" rows={2} value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                                    </Col>
                                    <Col md={12} className="mb-3">
                                        <Label className="form-label">Imagen</Label>
                                        <Input type="file" accept="image/*" onChange={handleFileChange} />
                                        {(imagePreview || formData.image_url) && (
                                            <div className="mt-2 text-center p-2 border rounded">
                                                <img src={imagePreview || (formData.image_url ? `${BACKEND_URL}${formData.image_url}` : '')} alt="Preview" style={{ maxHeight: "100px" }} />
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="light" onClick={() => setModalOpen(false)}>Cancelar</Button>
                                <Button color="success" type="submit">
                                    <i className="ri-save-3-line align-bottom me-1"></i> Guardar
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