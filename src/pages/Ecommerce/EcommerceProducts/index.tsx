// Ubicación: src/pages/Ecommerce/EcommerceProducts/index.tsx

import React, { useEffect, useMemo, useState, ChangeEvent } from "react";
import {
    Container, UncontrolledDropdown, DropdownToggle, DropdownItem, DropdownMenu,
    Row, Card, CardHeader, CardBody, Col, Modal, ModalHeader, ModalBody,
    ModalFooter, Button, Form, Label, Input, Spinner, InputGroup,
    UncontrolledCollapse, Badge, Pagination, PaginationItem, PaginationLink
} from "reactstrap";
import classnames from "classnames";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";
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

const ProductsPage = () => {
    document.title = "Tienda de Productos | StyleApp";
    const dispatch: AppDispatch = useDispatch();
    const { products: allProducts, categories, status, error } = useSelector((state: RootState) => state.products);

    // Configuración Tenant
    const [canSellToStaff, setCanSellToStaff] = useState(true);

    // Filtros
    const [activeTab, setActiveTab] = useState<TabKey>("all"); // Filtro de audiencia
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
    const [priceRange, setPriceRange] = useState([0, 500000]);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Modales y Forms
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
        } catch (err) {
            console.error("Error setting:", err);
            setCanSellToStaff(true);
        }
    };

    // --- Helpers Visuales ---
    const getStockStatus = (stock: number) => {
        if (stock <= 0) return { color: "danger", label: "Agotado", icon: "ri-error-warning-line" };
        if (stock < 5) return { color: "warning", label: "Poco Stock", icon: "ri-alert-line" };
        return { color: "success", label: "Disponible", icon: "ri-checkbox-circle-line" };
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
    };

    // --- Filtros y Lógica ---
    const categoryOptions = useMemo(() =>
        categories.map(cat => ({ value: cat.id, label: cat.name })),
        [categories]);

    const filteredProducts = useMemo(() => {
        let filtered = [...allProducts];

        // Texto
        if (searchTerm) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        // Audiencia (Tabs visuales)
        if (activeTab === 'cliente') {
            filtered = filtered.filter(p => p.audience_type === 'cliente' || p.audience_type === 'ambos');
        } else if (activeTab === 'estilista') {
            filtered = filtered.filter(p => p.audience_type === 'estilista' || p.audience_type === 'ambos');
        }

        // Categoría
        if (activeCategoryFilter !== "all") {
            filtered = filtered.filter(p => p.category_id === activeCategoryFilter);
        }

        // Precio
        filtered = filtered.filter(p => p.sale_price >= priceRange[0] && p.sale_price <= priceRange[1]);

        return filtered;
    }, [allProducts, activeTab, activeCategoryFilter, priceRange, searchTerm]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);

    // Resets
    useEffect(() => { setCurrentPage(1); }, [activeTab, activeCategoryFilter, searchTerm, priceRange]);


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
            text: `Se eliminará "${product.name}" permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                dispatch(deleteExistingProduct(product.id));
            }
        });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Lógica de guardado igual a la versión anterior
        if (isEditMode && formData.id) {
            const productDataToUpdate: Partial<Product> = { ...formData };
            delete productDataToUpdate.id;
            const imageUploadPromise = selectedImageFile ? dispatch(uploadProductImage({ id: formData.id, imageFile: selectedImageFile })) : Promise.resolve();
            await imageUploadPromise;
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
                    <BreadCrumb title="Tienda de Productos" pageTitle="Inventario" />

                    <Row>
                        <Col lg={12}>
                            <Card>
                                <CardHeader className="border-0">
                                    <div className="d-flex align-items-center">
                                        <h5 className="card-title mb-0 fw-semibold flex-grow-1">Catálogo de Productos</h5>
                                        <div className="flex-shrink-0 d-flex gap-2">
                                            <Button color="primary" onClick={handleAddClick}>
                                                <i className="ri-add-line align-bottom me-1"></i> Agregar Producto
                                            </Button>
                                            <Button color="success" id="filter-collapse" onClick={() => document.getElementById('collapseExample')?.classList.toggle('show')}>
                                                <i className="ri-filter-2-line align-bottom"></i> Filtros
                                            </Button>
                                        </div>
                                    </div>

                                    <UncontrolledCollapse toggler="#filter-collapse" defaultOpen>
                                        <Row className="row-cols-xxl-4 row-cols-lg-3 row-cols-md-2 row-cols-1 mt-3 g-3">
                                            <Col>
                                                <h6 className="text-uppercase fs-12 mb-2">Buscar</h6>
                                                <div className="position-relative">
                                                    <Input type="text" className="form-control" placeholder="Nombre del producto..."
                                                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                                    <i className="ri-search-line search-icon position-absolute top-50 translate-middle-y end-0 me-3"></i>
                                                </div>
                                            </Col>
                                            <Col>
                                                <h6 className="text-uppercase fs-12 mb-2">Categoría</h6>
                                                <Input type="select" className="form-select" value={activeCategoryFilter} onChange={(e) => setActiveCategoryFilter(e.target.value)}>
                                                    <option value="all">Todas las Categorías</option>
                                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                </Input>
                                            </Col>
                                            <Col>
                                                <h6 className="text-uppercase fs-12 mb-2">Audiencia</h6>
                                                <Input type="select" className="form-select" value={activeTab} onChange={(e) => setActiveTab(e.target.value as TabKey)}>
                                                    <option value="all">Todo</option>
                                                    <option value="cliente">Venta a Clientes</option>
                                                    <option value="estilista">Uso Interno/Profesional</option>
                                                </Input>
                                            </Col>
                                            <Col>
                                                <h6 className="text-uppercase fs-12 mb-2">Rango de Precio</h6>
                                                <Nouislider range={{ min: 0, max: 500000 }} start={priceRange} connect step={5000}
                                                    onSlide={(vals) => setPriceRange(vals.map(Number))} />
                                                <div className="d-flex justify-content-between mt-2">
                                                    <span className="text-muted small">{formatCurrency(priceRange[0])}</span>
                                                    <span className="text-muted small">{formatCurrency(priceRange[1])}</span>
                                                </div>
                                            </Col>
                                        </Row>
                                    </UncontrolledCollapse>
                                </CardHeader>
                            </Card>
                        </Col>
                    </Row>

                    {/* --- Grid de Productos --- */}
                    <Row>
                        {status === 'loading' ? (
                            <Col xs={12} className="text-center py-5"><Spinner color="primary" /></Col>
                        ) : paginatedProducts.length > 0 ? (
                            paginatedProducts.map((product) => {
                                const stockInfo = getStockStatus(product.stock);
                                return (
                                    <Col key={product.id} xxl={3} lg={4} md={6}>
                                        <Card className="explore-box card-animate border-0 shadow-sm overflow-hidden">
                                            <div className="position-relative">
                                                <img
                                                    src={product.image_url ? `${BACKEND_URL}${product.image_url}` : "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg"}
                                                    alt={product.name}
                                                    className="card-img-top explore-img"
                                                    style={{ height: "220px", objectFit: "cover", width: "100%" }}
                                                    onError={(e) => { e.currentTarget.src = "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg"; }}
                                                />
                                                <div className="position-absolute top-0 start-0 m-2">
                                                    <Badge color={stockInfo.color} className="fs-11">
                                                        <i className={`${stockInfo.icon} me-1`}></i> {stockInfo.label}: {product.stock}
                                                    </Badge>
                                                </div>
                                                {/* Action Buttons Overlay */}
                                                <div className="explore-place-bid-img">
                                                    <div className="d-flex gap-2 justify-content-center h-100 align-items-center bg-dark bg-opacity-25" style={{ backdropFilter: "blur(2px)" }}>
                                                        <Button size="sm" color="light" onClick={() => handleEditClick(product)}>
                                                            <i className="ri-pencil-fill text-muted align-bottom me-1"></i> Editar
                                                        </Button>
                                                        <Button size="sm" color="danger" onClick={() => handleDeleteClick(product)}>
                                                            <i className="ri-delete-bin-fill align-bottom"></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <CardBody>
                                                <div className="mb-2">
                                                    <h5 className="mb-1 text-truncate"><Link to="#" onClick={(e) => { e.preventDefault(); handleEditClick(product); }} className="text-dark">{product.name}</Link></h5>
                                                    <p className="text-muted fs-13 mb-0">{product.category_name || "Sin Categoría"}</p>
                                                </div>

                                                <div className="d-flex align-items-end justify-content-between mt-3">
                                                    <div>
                                                        <p className="text-muted fs-11 text-uppercase mb-1 fw-medium">Precio Venta</p>
                                                        <h5 className="fs-16 text-primary mb-0">{formatCurrency(product.sale_price || 0)}</h5>
                                                    </div>
                                                    {canSellToStaff && (
                                                        <div className="text-end">
                                                            <p className="text-muted fs-11 text-uppercase mb-1 fw-medium">Interno</p>
                                                            <h6 className="fs-14 text-secondary mb-0">{formatCurrency(product.staff_price || 0)}</h6>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Progress bar visual for stock */}
                                                <div className="mt-3">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span className="text-muted fs-11">Disponibilidad</span>
                                                        <span className="text-muted fs-11">{product.stock} unid.</span>
                                                    </div>
                                                    <div className="progress progress-sm rounded-pill">
                                                        <div
                                                            className={`progress-bar bg-${stockInfo.color}`}
                                                            role="progressbar"
                                                            style={{ width: `${Math.min(100, (product.stock / 20) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </Col>
                                );
                            })
                        ) : (
                            <Col xs={12}>
                                <div className="text-center py-5">
                                    <div className="avatar-lg mx-auto mb-3">
                                        <div className="avatar-title bg-light text-primary rounded-circle fs-1">
                                            <i className="ri-shopping-bag-3-line"></i>
                                        </div>
                                    </div>
                                    <h5>No se encontraron productos</h5>
                                    <p className="text-muted">Intenta ajustar los filtros de búsqueda</p>
                                </div>
                            </Col>
                        )}
                    </Row>

                    {/* Paginación */}
                    {paginatedProducts.length > 0 && totalPages > 1 && (
                        <Row className="justify-content-center mb-4">
                            <Pagination>
                                <PaginationItem disabled={currentPage === 1}>
                                    <PaginationLink previous onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                                </PaginationItem>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <PaginationItem key={page} active={currentPage === page}>
                                        <PaginationLink onClick={() => setCurrentPage(page)}>{page}</PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem disabled={currentPage === totalPages}>
                                    <PaginationLink next onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
                                </PaginationItem>
                            </Pagination>
                        </Row>
                    )}

                    {/* --- Modales --- */}
                    <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} centered size="lg">
                        <ModalHeader toggle={() => setModalOpen(false)}>{isEditMode ? 'Editar Producto' : 'Nuevo Producto'}</ModalHeader>
                        <Form onSubmit={handleFormSubmit}>
                            <ModalBody>
                                <Row>
                                    <Col md={8} className="mb-3">
                                        <Label>Nombre del Producto</Label>
                                        <Input required value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Shampoo Keratina 500ml" />
                                    </Col>
                                    <Col md={4} className="mb-3">
                                        <Label>Categoría</Label>
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
                                        <Label className="text-primary fw-medium">Precio Venta (Público)</Label>
                                        <CurrencyInput className="form-control" value={formData.sale_price} onValueChange={(val) => setFormData(p => ({ ...p, sale_price: Number(val) }))} prefix="$ " groupSeparator="." decimalsLimit={0} />
                                    </Col>
                                    {canSellToStaff && (
                                        <>
                                            <Col md={4} className="mb-3">
                                                <Label className="text-secondary fw-medium">Precio Interno (Staff)</Label>
                                                <CurrencyInput className="form-control" value={formData.staff_price} onValueChange={(val) => setFormData(p => ({ ...p, staff_price: Number(val) }))} prefix="$ " groupSeparator="." decimalsLimit={0} />
                                            </Col>
                                            <Col md={4} className="mb-3">
                                                <Label>Comisión Staff (%)</Label>
                                                <Input type="number" min="0" max="100" value={formData.product_commission_percent || ''} onChange={e => setFormData(p => ({ ...p, product_commission_percent: Number(e.target.value) }))} />
                                            </Col>
                                        </>
                                    )}

                                    <Col md={4} className="mb-3">
                                        <Label>Costo Base</Label>
                                        <CurrencyInput className="form-control" value={formData.cost_price} onValueChange={(val) => setFormData(p => ({ ...p, cost_price: Number(val) }))} prefix="$ " groupSeparator="." decimalsLimit={0} />
                                    </Col>
                                    <Col md={4} className="mb-3">
                                        <Label>Stock Disponible</Label>
                                        <Input type="number" required value={formData.stock || ''} onChange={e => setFormData(p => ({ ...p, stock: Number(e.target.value) }))} />
                                    </Col>
                                    {canSellToStaff && (
                                        <Col md={4} className="mb-3">
                                            <Label>Disponible Para</Label>
                                            <Input type="select" value={formData.audience_type || 'cliente'} onChange={(e) => setFormData(p => ({ ...p, audience_type: e.target.value as any }))}>
                                                <option value="cliente">Solo Clientes</option>
                                                <option value="estilista">Solo Staff</option>
                                                <option value="ambos">Ambos</option>
                                            </Input>
                                        </Col>
                                    )}

                                    <Col md={12} className="mb-3"><Label>Descripción</Label><Input type="textarea" rows={3} value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} /></Col>
                                    <Col md={12} className="mb-3">
                                        <Label>Imagen del Producto</Label>
                                        <Input type="file" accept="image/*" onChange={handleFileChange} />
                                        {(imagePreview || formData.image_url) && (
                                            <div className="mt-2 text-center p-2 border rounded bg-light">
                                                <img src={imagePreview || (formData.image_url ? `${BACKEND_URL}${formData.image_url}` : '')} alt="Previsualización" style={{ maxHeight: "150px", objectFit: "contain" }} />
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            </ModalBody>
                            <ModalFooter><Button color="light" onClick={() => setModalOpen(false)}>Cancelar</Button><Button color="primary" type="submit">Guardar Producto</Button></ModalFooter>
                        </Form>
                    </Modal>

                    <CategoryManagerModal isOpen={isCategoryManagerOpen} toggle={() => setCategoryManagerOpen(false)} title="Gestionar Categorías" categories={categories} onSave={handleUpdateCategory} onDelete={handleDeleteCategory} />
                </Container>
            </div>
        </React.Fragment>
    );
};

export default ProductsPage;