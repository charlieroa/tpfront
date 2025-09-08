// Ubicación: src/pages/Ecommerce/EcommerceProducts/index.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
    Container, UncontrolledDropdown, DropdownToggle, DropdownItem, DropdownMenu,
    Nav, NavItem, NavLink, Row, Card, CardHeader, Col,
    Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, Label, Input, Spinner
} from "reactstrap";
import classnames from "classnames";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

// Redux
import { useSelector, useDispatch } from "react-redux";
import { createNewProduct, deleteExistingProduct, fetchProductCategories, fetchProducts, updateExistingProduct, uploadProductImage } from "../../../slices/products/thunk";
import { Product } from "../../../services/productApi";
import { AppDispatch, RootState } from "../../../index";

import BreadCrumb from "../../../Components/Common/BreadCrumb";
import TableContainer from "../../../Components/Common/TableContainer";

// ¡SOLUCIÓN! Define la URL de tu backend aquí. Es una buena práctica usar variables de entorno.
const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Tipos para el formulario y filtros
type TabKey = "all" | "cliente" | "estilista";

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================
const ProductsPage = () => {
    // 1. CONEXIÓN CON REDUX
    const dispatch: AppDispatch = useDispatch();
    const {
        products: allProducts,
        categories,
        status,
        error
    } = useSelector((state: RootState) => state.products);

    // 2. ESTADO LOCAL PARA LA UI (filtros y modales)
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [priceRange, setPriceRange] = useState([0, 500000]);
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    // 3. OBTENER DATOS REALES AL CARGAR EL COMPONENTE
    useEffect(() => {
        dispatch(fetchProducts());
        dispatch(fetchProductCategories());
    }, [dispatch]);

    // 4. LÓGICA DE FILTRADO (MEMOIZED PARA EFICIENCIA)
    const filteredProducts = useMemo(() => {
        let filtered = [...allProducts];
        if (activeTab !== "all") {
            filtered = filtered.filter(p => p.audience_type === activeTab || p.audience_type === 'ambos');
        }
        if (activeCategory !== "all") {
            filtered = filtered.filter(p => p.category_id === activeCategory);
        }
        filtered = filtered.filter(p => p.sale_price >= priceRange[0] && p.sale_price <= priceRange[1]);
        return filtered;
    }, [allProducts, activeTab, activeCategory, priceRange]);

    // 5. MANEJADORES DE ACCIONES (CRUD)
    const handleAddClick = () => {
        setIsEditMode(false);
        setFormData({ audience_type: 'cliente', cost_price: 0, sale_price: 0, staff_price: 0, stock: 0 });
        setImagePreview(null);
        setSelectedImageFile(null);
        setModalOpen(true);
    };

    const handleEditClick = (product: Product) => {
        setIsEditMode(true);
        setFormData(product);
        // Usamos BACKEND_URL también aquí para la vista previa en modo edición
        setImagePreview(product.image_url ? `${BACKEND_URL}${product.image_url}` : null);
        setSelectedImageFile(null);
        setModalOpen(true);
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setConfirmDeleteModal(true);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            dispatch(deleteExistingProduct(productToDelete.id));
            setConfirmDeleteModal(false);
            setProductToDelete(null);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditMode && formData.id) {
            const productDataToUpdate: Partial<Product> = { ...formData };
            delete productDataToUpdate.id;
            
            if (selectedImageFile) {
                await dispatch(uploadProductImage({ id: formData.id, imageFile: selectedImageFile }));
            }
            dispatch(updateExistingProduct({ id: formData.id, productData: productDataToUpdate }));
        } else {
            const productData: Omit<Product, 'id' | 'image_url'> = {
                name: formData.name!,
                description: formData.description,
                cost_price: Number(formData.cost_price || 0),
                sale_price: Number(formData.sale_price || 0),
                staff_price: Number(formData.staff_price || 0),
                stock: Number(formData.stock || 0),
                category_id: formData.category_id,
                audience_type: formData.audience_type!,
            };
            dispatch(createNewProduct({ productData, imageFile: selectedImageFile || undefined }));
        }
        setModalOpen(false);
        resetFormAndImage();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setSelectedImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : null);
    };

    const resetFormAndImage = () => {
        setFormData({ audience_type: 'cliente' });
        setSelectedImageFile(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
    };

    // Columnas de la tabla
    const columns = useMemo(() => [
        {
            header: "Producto", accessorKey: "name", enableColumnFilter: false,
            cell: (cell: any) => (
                <div className="d-flex align-items-center">
                    <div className="flex-shrink-0 me-3">
                        <div className="avatar-sm bg-light rounded p-1">
                            {/* ¡LA LÍNEA CLAVE! Usamos BACKEND_URL para construir la ruta completa a la imagen */}
                            <img 
                                src={cell.row.original.image_url ? `${BACKEND_URL}${cell.row.original.image_url}` : "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg"} 
                                alt={cell.getValue()} 
                                className="img-fluid d-block" 
                                style={{height: "100%", objectFit: "cover"}} 
                                onError={(e) => { e.currentTarget.src = "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg"; }}
                            />
                        </div>
                    </div>
                    <div className="flex-grow-1">
                        <h5 className="fs-14 mb-1">{cell.getValue()}</h5>
                        <p className="text-muted mb-0">Categoría: <span className="fw-medium">{cell.row.original.category_name || 'N/A'}</span></p>
                    </div>
                </div>
            ),
        },
        { header: "Stock", accessorKey: "stock", enableColumnFilter: false },
        { header: "Precio Venta", accessorKey: "sale_price", enableColumnFilter: false, cell: ({ cell }: any) => <span>${new Intl.NumberFormat('es-CO').format(cell.getValue())}</span> },
        { header: "Audiencia", accessorKey: "audience_type", enableColumnFilter: false },
        {
            header: "Acción", enableColumnFilter: false,
            cell: ({ row }: any) => (
                <UncontrolledDropdown>
                    <DropdownToggle href="#" className="btn btn-soft-secondary btn-sm" tag="button"><i className="ri-more-fill" /></DropdownToggle>
                    <DropdownMenu className="dropdown-menu-end">
                        <DropdownItem onClick={() => handleEditClick(row.original)}><i className="ri-pencil-fill align-bottom me-2 text-muted" /> Editar</DropdownItem>
                        <DropdownItem onClick={() => handleDeleteClick(row.original)}><i className="ri-delete-bin-fill align-bottom me-2 text-muted" /> Eliminar</DropdownItem>
                    </DropdownMenu>
                </UncontrolledDropdown>
            ),
        },
    ], [BACKEND_URL]); // <-- Añadimos BACKEND_URL a las dependencias del useMemo

    document.title = "Inventario de Productos | StyleApp";

    return (
        <div className="page-content">
            <Container fluid>
                <BreadCrumb title="Productos" pageTitle="Inventario" />
                <Row>
                    {/* Sidebar */}
                    <Col xl={3} lg={4}>
                        <Card>
                             <CardHeader><h5 className="fs-16">Filtros</h5></CardHeader>
                             <div className="card-body border-bottom">
                                <p className="text-muted text-uppercase fs-12 fw-medium mb-2">Categorías</p>
                                <ul className="list-unstyled mb-0 filter-list">
                                    <li><a href="#!" className={activeCategory === 'all' ? 'active' : ''} onClick={() => setActiveCategory("all")}>Todos</a></li>
                                    {categories.map((cat) => (
                                        <li key={cat.id}><a href="#!" className={activeCategory === cat.id ? 'active' : ''} onClick={() => setActiveCategory(cat.id)}>{cat.name}</a></li>
                                    ))}
                                </ul>
                             </div>
                             <div className="card-body border-bottom">
                                <p className="text-muted text-uppercase fs-12 fw-medium mb-4">Precio</p>
                                <Nouislider range={{ min: 0, max: 500000 }} start={priceRange} connect step={1000} onSlide={(values) => setPriceRange(values.map(Number))} id="product-price-range" />
                                <div className="formCost d-flex gap-2 align-items-center mt-3"><span className="fw-semibold text-muted">${new Intl.NumberFormat('es-CO').format(priceRange[0])} a ${new Intl.NumberFormat('es-CO').format(priceRange[1])}</span></div>
                             </div>
                        </Card>
                    </Col>

                    {/* Contenido Principal */}
                    <Col xl={9} lg={8}>
                        <Card>
                            <div className="card-header border-0">
                                <Row className="align-items-center g-2">
                                    <Col>
                                        <Nav className="nav-tabs-custom card-header-tabs border-bottom-0" role="tablist">
                                            <NavItem><NavLink className={classnames({ active: activeTab === 'all' })} onClick={() => setActiveTab('all')} href="#">Todos</NavLink></NavItem>
                                            <NavItem><NavLink className={classnames({ active: activeTab === 'cliente' })} onClick={() => setActiveTab('cliente')} href="#">Venta a Clientes</NavLink></NavItem>
                                            <NavItem><NavLink className={classnames({ active: activeTab === 'estilista' })} onClick={() => setActiveTab('estilista')} href="#">Uso Personal</NavLink></NavItem>
                                        </Nav>
                                    </Col>
                                    <Col className="text-end"><Button color="primary" onClick={handleAddClick}><i className="ri-add-line align-middle me-1" /> Agregar Producto</Button></Col>
                                </Row>
                            </div>
                            <div className="card-body pt-0">
                                {status === 'loading' && <div className="text-center p-5"><Spinner color="primary">Cargando...</Spinner></div>}
                                {status === 'failed' && <div className="text-center text-danger">Error: {error}</div>}
                                {status === 'succeeded' && (
                                    <TableContainer
                                        columns={columns} data={filteredProducts} isGlobalFilter={true} customPageSize={10}
                                        divClass="table-responsive mb-1" tableClass="mb-0 align-middle table-borderless"
                                        theadClass="table-light text-muted" SearchPlaceholder="Buscar productos..."
                                    />
                                )}
                            </div>
                        </Card>
                    </Col>
                </Row>
                
                {/* Modal para Agregar/Editar Producto */}
                <Modal isOpen={modalOpen} toggle={() => { setModalOpen(!modalOpen); resetFormAndImage(); }} centered size="lg">
                    <ModalHeader toggle={() => { setModalOpen(!modalOpen); resetFormAndImage(); }}>{isEditMode ? 'Editar Producto' : 'Agregar Nuevo Producto'}</ModalHeader>
                    <Form onSubmit={handleFormSubmit}>
                        <ModalBody>
                             <Row>
                                <Col md={6} className="mb-3"><Label>Nombre</Label><Input value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required/></Col>
                                <Col md={6} className="mb-3"><Label>Categoría</Label><Input type="select" value={formData.category_id || ''} onChange={e => setFormData(p => ({ ...p, category_id: e.target.value }))}><option value="">Seleccione una categoría</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Input></Col>
                                <Col md={4} className="mb-3"><Label>Precio de Venta</Label><Input type="number" value={formData.sale_price || ''} onChange={e => setFormData(p => ({ ...p, sale_price: Number(e.target.value) }))} required/></Col>
                                <Col md={4} className="mb-3"><Label>Precio para Personal</Label><Input type="number" value={formData.staff_price || ''} onChange={e => setFormData(p => ({ ...p, staff_price: Number(e.target.value) }))} /></Col>
                                <Col md={4} className="mb-3"><Label>Costo</Label><Input type="number" value={formData.cost_price || ''} onChange={e => setFormData(p => ({ ...p, cost_price: Number(e.target.value) }))} /></Col>
                                <Col md={6} className="mb-3"><Label>Stock</Label><Input type="number" value={formData.stock || ''} onChange={e => setFormData(p => ({ ...p, stock: Number(e.target.value) }))} required /></Col>
                                <Col md={6} className="mb-3"><Label>Audiencia</Label><Input type="select" value={formData.audience_type || ''} onChange={e => setFormData(p => ({ ...p, audience_type: e.target.value as any }))} required><option value="cliente">Venta a Cliente</option><option value="estilista">Uso Personal</option><option value="ambos">Ambos</option></Input></Col>
                                <Col md={12} className="mb-3"><Label>Descripción</Label><Input type="textarea" value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} /></Col>
                                <Col md={12} className="mb-3"><Label>Foto</Label><Input type="file" accept="image/*" onChange={handleFileChange} />
                                    {imagePreview && (
                                        <div className="mt-3"><img src={imagePreview} alt="preview" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }} /></div>
                                    )}
                                </Col>
                            </Row>
                        </ModalBody>
                        <ModalFooter>
                            <Button type="button" color="light" onClick={() => { setModalOpen(false); resetFormAndImage(); }}>Cancelar</Button>
                            <Button type="submit" color="primary">Guardar</Button>
                        </ModalFooter>
                    </Form>
                </Modal>
                
                {/* Modal de Confirmación de Borrado */}
                <Modal isOpen={confirmDeleteModal} toggle={() => setConfirmDeleteModal(!confirmDeleteModal)} centered>
                    <ModalHeader>Confirmar Eliminación</ModalHeader>
                    <ModalBody><p>¿Estás seguro de que deseas eliminar el producto "{productToDelete?.name}"? Esta acción no se puede deshacer.</p></ModalBody>
                    <ModalFooter>
                        <Button color="light" onClick={() => setConfirmDeleteModal(false)}>Cancelar</Button>
                        <Button color="danger" onClick={confirmDelete}>Eliminar</Button>
                    </ModalFooter>
                </Modal>
            </Container>
        </div>
    );
};

export default ProductsPage;