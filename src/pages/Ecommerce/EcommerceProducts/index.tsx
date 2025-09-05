// src/pages/Apps/Ecommerce/Products/BeautyProductsTabsDummy.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownItem,
  DropdownMenu,
  Nav,
  NavItem,
  NavLink,
  UncontrolledCollapse,
  Row,
  Card,
  CardHeader,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  Label,
  Input,
} from "reactstrap";
import classnames from "classnames";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

import BreadCrumb from "../../../Components/Common/BreadCrumb";
import TableContainer from "../../../Components/Common/TableContainer";

// Celdas simples
const PriceCell = ({ cell }: any) => {
  const val = cell.getValue();
  return <span>{typeof val === "string" ? val : `$${val}`}</span>;
};
const RatingCell = () => <span></span>; // rating vacío
const PublishedCell = ({ cell }: any) => <span className="text-muted">{cell.getValue()}</span>;

// Datos base (dummy)
const INITIAL_PRODUCTS = [
  {
    id: "B-1001",
    name: "Keratina Pro Liss 500ml",
    category: "Beauty",
    stock: 10,
    price: "$79.900",
    orders: 18,
    rating: "",
    publishedDate: "2025-09-01",
    image:
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800&auto=format&fit=crop",
    status: "published",
  },
  {
    id: "B-1002",
    name: "Serum Capilar Argan 100ml",
    category: "Beauty",
    stock: 15,
    price: "$39.900",
    orders: 27,
    rating: "",
    publishedDate: "2025-09-01",
    image:
      "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=800&auto=format&fit=crop",
    status: "published",
  },
];

type TabKey = "all" | "reventa" | "personal";

const BeautyProductsTabsDummy = () => {
  // Estado maestro
  const [allProducts, setAllProducts] = useState<any[]>(INITIAL_PRODUCTS);

  // Estado de UI
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [productList, setProductList] = useState<any[]>(INITIAL_PRODUCTS);

  const [cate, setCate] = useState("all");
  const [mincost, setMincost] = useState(0);
  const [maxcost, setMaxcost] = useState(100);

  // Modal Agregar producto
  const [addOpen, setAddOpen] = useState(false);
  const [newProd, setNewProd] = useState({
    name: "",
    price: "",
    stock: "",
    category: "Beauty",
    publishedDate: "2025-09-01",
  });
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  useEffect(() => {
    document.getElementById("product-price-range")?.setAttribute("data-slider-color", "success");
  }, []);

  // Helpers de pestañas
  const computeBaseForTab = (tab: TabKey, source: any[] = allProducts) => {
    if (tab === "reventa") return source.slice(0, 1);
    if (tab === "personal") return source.slice(1, 2);
    return source; // all
  };
  const applyTabFilter = (tab: TabKey, source: any[] = allProducts) => {
    setProductList(computeBaseForTab(tab, source));
  };
  const toggleTab = (tab: TabKey) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      setCate("all");
      setMincost(0);
      setMaxcost(100);
      applyTabFilter(tab);
    }
  };

  // Filtros laterales (dummy)
  const categories = (category: string) => {
    setCate(category);
    const base = computeBaseForTab(activeTab);
    setProductList(category === "all" ? base : base.filter((p) => p.category === category));
  };
  const onUpDate = (value: any) => {
    setMincost(value[0]);
    setMaxcost(value[1]);
    const base = computeBaseForTab(activeTab);
    const byCategory = cate === "all" ? base : base.filter((p) => p.category === cate);
    setProductList(byCategory); // solo visual; no filtramos por precio porque son strings
  };
  const onChangeRating = () => {
    const base = computeBaseForTab(activeTab);
    const byCategory = cate === "all" ? base : base.filter((p) => p.category === cate);
    setProductList(byCategory); // rating vacío; no filtra
  };
  const onUncheckMark = () => {
    const base = computeBaseForTab(activeTab);
    const byCategory = cate === "all" ? base : base.filter((p) => p.category === cate);
    setProductList(byCategory);
  };

  // Modal: carga de foto y submit
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setNewImageFile(file);
    setNewImagePreview(file ? URL.createObjectURL(file) : null);
  };
  const resetAddForm = () => {
    setNewProd({
      name: "",
      price: "",
      stock: "",
      category: "Beauty",
      publishedDate: "2025-09-01",
    });
    if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    setNewImageFile(null);
    setNewImagePreview(null);
  };
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `B-${Math.floor(Math.random() * 9000) + 1000}`,
      name: newProd.name || "Nuevo producto",
      category: newProd.category || "Beauty",
      stock: newProd.stock ? Number(newProd.stock) : 0,
      price: newProd.price || "$0",
      orders: 0,
      rating: "",
      publishedDate: newProd.publishedDate || "2025-09-01",
      image:
        newImagePreview ||
        "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800&auto=format&fit=crop",
      status: "published",
    };
    const updatedAll = [...allProducts, created];
    setAllProducts(updatedAll);
    const base = computeBaseForTab(activeTab, updatedAll);
    const byCategory = cate === "all" ? base : base.filter((p) => p.category === cate);
    setProductList(byCategory);
    setAddOpen(false);
    resetAddForm();
  };

  // Columnas
  const columns = useMemo(
    () => [
      {
        header: "Product",
        accessorKey: "name",
        enableColumnFilter: false,
        cell: (cell: any) => (
          <div className="d-flex align-items-center">
            <div className="flex-shrink-0 me-3">
              <div className="avatar-sm bg-light rounded p-1">
                <img src={cell.row.original.image} alt="" className="img-fluid d-block" />
              </div>
            </div>
            <div className="flex-grow-1">
              <h5 className="fs-14 mb-1">
                <a href="#" className="text-body" onClick={(e) => e.preventDefault()}>
                  {cell.getValue()}
                </a>
              </h5>
              <p className="text-muted mb-0">
                Category : <span className="fw-medium">{cell.row.original.category}</span>
              </p>
            </div>
          </div>
        ),
      },
      { header: "Stock", accessorKey: "stock", enableColumnFilter: false },
      { header: "Price", accessorKey: "price", enableColumnFilter: false, cell: (c: any) => <PriceCell {...c} /> },
      { header: "Orders", accessorKey: "orders", enableColumnFilter: false },
      { header: "Rating", accessorKey: "rating", enableColumnFilter: false, cell: () => <RatingCell /> },
      { header: "Published", accessorKey: "publishedDate", enableColumnFilter: false, cell: (c: any) => <PublishedCell {...c} /> },
      {
        header: "Action",
        cell: () => (
          <UncontrolledDropdown>
            <DropdownToggle href="#" className="btn btn-soft-secondary btn-sm" tag="button">
              <i className="ri-more-fill" />
            </DropdownToggle>
            <DropdownMenu className="dropdown-menu-end">
              <DropdownItem href="#" onClick={(e) => e.preventDefault()}>
                <i className="ri-eye-fill align-bottom me-2 text-muted"></i> View
              </DropdownItem>
              <DropdownItem href="#" onClick={(e) => e.preventDefault()}>
                <i className="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
              </DropdownItem>
              <DropdownItem divider />
              <DropdownItem href="#" onClick={(e) => e.preventDefault()}>
                <i className="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
              </DropdownItem>
            </DropdownMenu>
          </UncontrolledDropdown>
        ),
      },
    ],
    []
  );

  document.title = "Products (All / Reventa / Personal) | Velzon - React Admin & Dashboard";

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Products" pageTitle="Ecommerce" />

        <Row>
          {/* Sidebar filtros */}
          <Col xl={3} lg={4}>
            <Card>
              <CardHeader>
                <div className="d-flex mb-3">
                  <div className="flex-grow-1">
                    <h5 className="fs-16">Filters</h5>
                  </div>
                  <div className="flex-shrink-0">
                    <a
                      href="#"
                      className="text-decoration-underline"
                      onClick={(e) => {
                        e.preventDefault();
                        setMincost(0);
                        setMaxcost(100);
                        setCate("all");
                        applyTabFilter(activeTab);
                      }}
                    >
                      Clear All
                    </a>
                  </div>
                </div>
              </CardHeader>

              <div className="accordion accordion-flush">
                <div className="card-body border-bottom">
                  <p className="text-muted text-uppercase fs-12 fw-medium mb-2">Products</p>
                  <ul className="list-unstyled mb-0 filter-list">
                    <li>
                      <a
                        href="#"
                        className={cate === "Beauty" ? "active d-flex py-1 align-items-center" : "d-flex py-1 align-items-center"}
                        onClick={(e) => {
                          e.preventDefault();
                          categories("Beauty");
                        }}
                      >
                        <div className="flex-grow-1">
                          <h5 className="fs-13 mb-0 listname">Beauty</h5>
                        </div>
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className={cate === "all" ? "active d-flex py-1 align-items-center" : "d-flex py-1 align-items-center"}
                        onClick={(e) => {
                          e.preventDefault();
                          categories("all");
                        }}
                      >
                        <div className="flex-grow-1">
                          <h5 className="fs-13 mb-0 listname">All</h5>
                        </div>
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="card-body border-bottom">
                  <p className="text-muted text-uppercase fs-12 fw-medium mb-4">Price</p>
                  <Nouislider
                    range={{ min: 0, max: 100 }}
                    start={[mincost, maxcost]}
                    connect
                    onSlide={onUpDate}
                    id="product-price-range"
                  />
                  <div className="formCost d-flex gap-2 align-items-center mt-3">
                    <input className="form-control form-control-sm" type="text" value={`$ ${mincost}`} readOnly />
                    <span className="fw-semibold text-muted">to</span>
                    <input className="form-control form-control-sm" type="text" value={`$ ${maxcost}`} readOnly />
                  </div>
                </div>

                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <button className="accordion-button bg-transparent shadow-none" type="button" id="flush-headingRating">
                      <span className="text-muted text-uppercase fs-12 fw-medium">Rating</span>{" "}
                      <span className="badge bg-success rounded-pill align-middle ms-1">{allProducts.length}</span>
                    </button>
                  </h2>
                  <UncontrolledCollapse toggler="#flush-headingRating" defaultOpen>
                    <div className="accordion-collapse collapse show">
                      <div className="accordion-body text-body">
                        <div className="d-flex flex-column gap-2">
                          {[5, 4, 3, 2, 1].map((r) => (
                            <div className="form-check" key={r}>
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`productratingRadio${r}`}
                                onChange={(e) => (e.target.checked ? onChangeRating() : onUncheckMark())}
                              />
                              <label className="form-check-label" htmlFor={`productratingRadio${r}`}>
                                <span className="text-muted">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <i key={i} className={`mdi mdi-star${i < r ? " text-warning" : ""}`} />
                                  ))}
                                </span>{" "}
                                {r} & Above
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </UncontrolledCollapse>
                </div>
              </div>
            </Card>
          </Col>

          {/* Contenido principal */}
          <Col xl={9} lg={8}>
            <Card>
              <div className="card-header border-0">
                <Row className="align-items-center g-2">
                  <Col>
                    <Nav className="nav-tabs-custom card-header-tabs border-bottom-0" role="tablist">
                      <NavItem>
                        <NavLink
                          className={classnames({ active: activeTab === "all" }, "fw-semibold")}
                          onClick={() => toggleTab("all")}
                          href="#"
                        >
                          All{" "}
                          <span className="badge bg-danger-subtle text-danger align-middle rounded-pill ms-1">
                            {allProducts.length}
                          </span>
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          className={classnames({ active: activeTab === "reventa" }, "fw-semibold")}
                          onClick={() => toggleTab("reventa")}
                          href="#"
                        >
                          Reventa{" "}
                          <span className="badge bg-danger-subtle text-danger align-middle rounded-pill ms-1">1</span>
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          className={classnames({ active: activeTab === "personal" }, "fw-semibold")}
                          onClick={() => toggleTab("personal")}
                          href="#"
                        >
                          Personal{" "}
                          <span className="badge bg-danger-subtle text-danger align-middle rounded-pill ms-1">1</span>
                        </NavLink>
                      </NavItem>
                    </Nav>
                  </Col>

                  {/* ÚNICO botón: Agregar producto (abre modal) */}
                  <Col className="text-end">
                    <Button color="primary" onClick={() => setAddOpen(true)}>
                      <i className="ri-add-line align-middle me-1"></i>
                      Agregar producto
                    </Button>
                  </Col>
                </Row>
              </div>

              <div className="card-body pt-0">
                {productList && productList.length > 0 ? (
                  <TableContainer
                    columns={columns}
                    data={productList}
                    isGlobalFilter={true}
                    customPageSize={10}
                    divClass="table-responsive mb-1"
                    tableClass="mb-0 align-middle table-borderless"
                    theadClass="table-light text-muted"
                    isProductsFilter={true}
                    SearchPlaceholder="Search Products..."
                  />
                ) : (
                  <div className="py-4 text-center">
                    <div>
                      <i className="ri-search-line display-5 text-success" />
                    </div>
                    <div className="mt-4">
                      <h5>Sorry! No Result Found</h5>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Modal Agregar producto (con carga de foto y vista previa) */}
        <Modal isOpen={addOpen} toggle={() => setAddOpen(!addOpen)}>
          <ModalHeader toggle={() => setAddOpen(!addOpen)}>Agregar producto</ModalHeader>
          <Form onSubmit={handleAddProduct}>
            <ModalBody>
              <Row className="g-3">
                <Col md={12}>
                  <Label className="form-label">Nombre</Label>
                  <Input
                    type="text"
                    value={newProd.name}
                    onChange={(e) => setNewProd((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nombre del producto"
                    required
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Precio</Label>
                  <Input
                    type="text"
                    value={newProd.price}
                    onChange={(e) => setNewProd((p) => ({ ...p, price: e.target.value }))}
                    placeholder="$79.900"
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Stock</Label>
                  <Input
                    type="number"
                    value={newProd.stock}
                    onChange={(e) => setNewProd((p) => ({ ...p, stock: e.target.value }))}
                    placeholder="10"
                    min={0}
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Categoría</Label>
                  <Input
                    type="text"
                    value={newProd.category}
                    onChange={(e) => setNewProd((p) => ({ ...p, category: e.target.value }))}
                    placeholder="Beauty"
                  />
                </Col>
                <Col md={6}>
                  <Label className="form-label">Fecha publicación</Label>
                  <Input
                    type="date"
                    value={newProd.publishedDate}
                    onChange={(e) => setNewProd((p) => ({ ...p, publishedDate: e.target.value }))}
                  />
                </Col>
                <Col md={12}>
                  <Label className="form-label">Foto</Label>
                  <Input type="file" accept="image/*" onChange={handleFileChange} />
                  {newImagePreview && (
                    <div className="mt-3 d-flex align-items-center gap-3">
                      <img
                        src={newImagePreview}
                        alt="preview"
                        style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }}
                      />
                      <span className="text-muted">Vista previa</span>
                    </div>
                  )}
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <Button
                type="button"
                color="light"
                onClick={() => {
                  setAddOpen(false);
                  resetAddForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" color="primary">
                Guardar
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default BeautyProductsTabsDummy;