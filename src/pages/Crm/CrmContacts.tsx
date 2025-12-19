import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Col,
  Container,
  Row,
  Card,
  CardBody,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Label,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  Form,
  ModalFooter,
  FormFeedback,
  Spinner,
  Badge,
  Button,
  InputGroup,
  Offcanvas,
  OffcanvasBody
} from "reactstrap";
import { useSelector, useDispatch } from "react-redux";
import { createSelector } from "reselect";
import { useFormik } from "formik";
import * as Yup from "yup";
import { unwrapResult } from '@reduxjs/toolkit';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import BreadCrumb from "../../Components/Common/BreadCrumb";
import Loader from "../../Components/Common/Loader";
import dummyImg from "../../assets/images/users/user-dummy-img.jpg";

import {
  getContacts,
  addNewContact,
  updateContact,
  deleteContact,
} from "../../slices/crm/thunk";

const CrmContacts = () => {
  const dispatch: any = useDispatch();

  const selectCrmState = createSelector(
    (state: any) => state.Crm,
    (crm) => ({
      clients: crm.crmcontacts || [],
      loading: crm.loading || false,
      error: crm.error,
    })
  );
  const { clients, loading, error } = useSelector(selectCrmState);

  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [contactToEdit, setContactToEdit] = useState<any>(null);
  const [modal, setModal] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [sideBar, setSideBar] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    dispatch(getContacts());
  }, [dispatch]);

  const toggle = useCallback(() => {
    if (modal) {
      setModal(false);
      setContactToEdit(null);
      setShowPassword(false);
    } else {
      setModal(true);
    }
  }, [modal]);

  const handleAddClientClick = () => {
    setIsEdit(false);
    setContactToEdit(null);
    validation.resetForm();
    toggle();
  };

  const handleEditClick = useCallback((clientData: any) => {
    setIsEdit(true);
    const nameParts = clientData.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ');

    setContactToEdit({
      id: clientData.id,
      first_name: firstName,
      last_name: lastName,
      email: clientData.email,
      phone: clientData.phone,
    });
    toggle();
  }, [toggle]);

  const onClickDelete = (clientData: any) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Estás a punto de eliminar a ${clientData.name}. ¡No podrás revertir esto!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, ¡eliminar!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        handleDeleteContact(clientData.id);
      }
    });
  };

  const handleDeleteContact = async (contactId: string) => {
    if (contactId) {
      try {
        const resultAction = await dispatch(deleteContact(contactId));
        unwrapResult(resultAction);
        Swal.fire('¡Eliminado!', 'El cliente ha sido eliminado con éxito.', 'success');
      } catch (err) {
        Swal.fire('Error', 'Ocurrió un error al eliminar el cliente.', 'error');
      }
    }
  };

  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: (contactToEdit && contactToEdit.first_name) || "",
      last_name: (contactToEdit && contactToEdit.last_name) || "",
      email: (contactToEdit && contactToEdit.email) || "",
      phone: (contactToEdit && contactToEdit.phone) || "",
      password: "",
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required("El nombre es obligatorio"),
      email: Yup.string().email("Debe ser un email válido").required("El email es obligatorio"),
      phone: Yup.string().optional(),
      password: Yup.string().when('isEdit', {
        is: false,
        then: (schema) => schema.min(6, "La contraseña debe tener al menos 6 caracteres").required("La contraseña es obligatoria"),
        otherwise: (schema) => schema.optional(),
      }),
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      const clientData = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone,
        ...(values.password && !isEdit && { password: values.password }),
      };

      try {
        if (isEdit) {
          const resultAction = await dispatch(updateContact({ id: contactToEdit.id, ...clientData }));
          unwrapResult(resultAction);
          Swal.fire({ title: "¡Éxito!", text: "Cliente actualizado con éxito.", icon: "success" });
        } else {
          const resultAction = await dispatch(addNewContact(clientData));
          unwrapResult(resultAction);
          Swal.fire({ title: "¡Éxito!", text: "Cliente creado con éxito.", icon: "success" });
        }
        resetForm();
        toggle();
      } catch (err: any) {
        Swal.fire({ title: "Error", text: err.error || "Ocurrió un error", icon: "error" });
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Filtrar clientes por búsqueda
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter((client: any) =>
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
    );
  }, [clients, searchTerm]);

  // Determinar si el cliente vino de WhatsApp
  const isWhatsAppClient = (client: any) => {
    return client?.email?.includes('@whatsapp.temp');
  };

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(0).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  };

  // Colores para avatares según inicial
  const getAvatarColor = (name: string) => {
    const colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary'];
    const charCode = name?.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  document.title = "Clientes | CRM";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Clientes" pageTitle="CRM" />

          {/* Header con búsqueda y acciones */}
          <Card>
            <CardBody>
              <Row className="g-2">
                <Col sm={4}>
                  <div className="search-box">
                    <Input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por nombre, email o teléfono..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <i className="ri-search-line search-icon"></i>
                  </div>
                </Col>
                <Col className="col-sm-auto ms-auto">
                  <div className="list-grid-nav hstack gap-1">
                    <Button
                      color={viewMode === 'grid' ? 'primary' : 'soft-info'}
                      className="btn btn-icon fs-14"
                      onClick={() => setViewMode('grid')}
                    >
                      <i className="ri-grid-fill"></i>
                    </Button>
                    <Button
                      color={viewMode === 'list' ? 'primary' : 'soft-info'}
                      className="btn btn-icon fs-14"
                      onClick={() => setViewMode('list')}
                    >
                      <i className="ri-list-unordered"></i>
                    </Button>
                    <Button color="success" onClick={handleAddClientClick}>
                      <i className="ri-add-fill me-1 align-bottom"></i> Agregar Cliente
                    </Button>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Estadísticas rápidas */}
          <Row className="mb-3">
            <Col md={3}>
              <Card className="card-animate">
                <CardBody>
                  <div className="d-flex align-items-center">
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-primary-subtle text-primary rounded-2 fs-2">
                        <i className="ri-user-3-line"></i>
                      </span>
                    </div>
                    <div className="flex-grow-1 overflow-hidden ms-3">
                      <p className="text-uppercase fw-medium text-muted text-truncate mb-0">Total Clientes</p>
                      <h4 className="fs-22 fw-semibold mb-0">{clients?.length || 0}</h4>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="card-animate">
                <CardBody>
                  <div className="d-flex align-items-center">
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-success-subtle text-success rounded-2 fs-2">
                        <i className="ri-whatsapp-line"></i>
                      </span>
                    </div>
                    <div className="flex-grow-1 overflow-hidden ms-3">
                      <p className="text-uppercase fw-medium text-muted text-truncate mb-0">Vía WhatsApp</p>
                      <h4 className="fs-22 fw-semibold mb-0">
                        {clients?.filter((c: any) => isWhatsAppClient(c)).length || 0}
                      </h4>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="card-animate">
                <CardBody>
                  <div className="d-flex align-items-center">
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-info-subtle text-info rounded-2 fs-2">
                        <i className="ri-calendar-check-line"></i>
                      </span>
                    </div>
                    <div className="flex-grow-1 overflow-hidden ms-3">
                      <p className="text-uppercase fw-medium text-muted text-truncate mb-0">Con Citas</p>
                      <h4 className="fs-22 fw-semibold mb-0">
                        {clients?.filter((c: any) => c.cantidadServicios > 0).length || 0}
                      </h4>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="card-animate">
                <CardBody>
                  <div className="d-flex align-items-center">
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-warning-subtle text-warning rounded-2 fs-2">
                        <i className="ri-star-line"></i>
                      </span>
                    </div>
                    <div className="flex-grow-1 overflow-hidden ms-3">
                      <p className="text-uppercase fw-medium text-muted text-truncate mb-0">Servicios Totales</p>
                      <h4 className="fs-22 fw-semibold mb-0">
                        {clients?.reduce((acc: number, c: any) => acc + (c.cantidadServicios || 0), 0) || 0}
                      </h4>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Lista de clientes */}
          {loading && clients.length === 0 ? (
            <Loader />
          ) : error ? (
            <div className="alert alert-danger">Error al cargar clientes: {error.error || 'Error desconocido'}</div>
          ) : (
            <Row>
              {viewMode === 'grid' ? (
                // Vista Grid (Tarjetas)
                filteredClients.map((client: any, index: number) => (
                  <Col key={client.id || index} xl={3} lg={4} md={6}>
                    <Card className="team-box border shadow-none">
                      <div className={`team-cover bg-${getAvatarColor(client.name)}-subtle`} style={{ height: '80px' }}>
                        {isWhatsAppClient(client) && (
                          <Badge color="success" className="position-absolute top-0 end-0 m-2">
                            <i className="ri-whatsapp-line me-1"></i>WhatsApp
                          </Badge>
                        )}
                      </div>
                      <CardBody className="p-4">
                        <Row className="align-items-center">
                          <Col className="team-settings">
                            <Row className="align-items-center">
                              <Col>
                                <UncontrolledDropdown direction='start' className="text-end">
                                  <DropdownToggle tag="a" role="button" className="text-muted">
                                    <i className="ri-more-fill fs-17"></i>
                                  </DropdownToggle>
                                  <DropdownMenu>
                                    <DropdownItem onClick={() => { setIsOpen(true); setSideBar(client); }}>
                                      <i className="ri-eye-line me-2 align-middle text-muted"></i>Ver
                                    </DropdownItem>
                                    <DropdownItem onClick={() => handleEditClick(client)}>
                                      <i className="ri-pencil-line me-2 align-middle text-muted"></i>Editar
                                    </DropdownItem>
                                    {client.phone && (
                                      <DropdownItem tag="a" href={`https://wa.me/${client.phone}`} target="_blank">
                                        <i className="ri-whatsapp-line me-2 align-middle text-success"></i>WhatsApp
                                      </DropdownItem>
                                    )}
                                    <DropdownItem className="text-danger" onClick={() => onClickDelete(client)}>
                                      <i className="ri-delete-bin-5-line me-2 align-middle"></i>Eliminar
                                    </DropdownItem>
                                  </DropdownMenu>
                                </UncontrolledDropdown>
                              </Col>
                            </Row>
                          </Col>
                          <Col lg={12} className="text-center mt-n5">
                            <div className="team-profile-img">
                              <div className="avatar-lg img-thumbnail rounded-circle flex-shrink-0 mx-auto">
                                {client.img ? (
                                  <img src={client.img} alt="" className="img-fluid d-block rounded-circle" />
                                ) : (
                                  <div className={`avatar-title text-uppercase border rounded-circle bg-${getAvatarColor(client.name)}-subtle text-${getAvatarColor(client.name)} fs-20`}>
                                    {getInitials(client.name)}
                                  </div>
                                )}
                              </div>
                              <div className="team-content mt-3">
                                <Link
                                  to="#"
                                  onClick={() => { setIsOpen(true); setSideBar(client); }}
                                >
                                  <h5 className="fs-16 mb-1">{client.name}</h5>
                                </Link>
                                <p className="text-muted mb-0 fs-12">
                                  {client.phone ? (
                                    <a href={`tel:${client.phone}`} className="text-muted">
                                      <i className="ri-phone-line me-1"></i>{client.phone}
                                    </a>
                                  ) : (
                                    <span className="text-muted">Sin teléfono</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </Col>
                          <Col lg={12} className="mt-3">
                            <Row className="text-muted text-center">
                              <Col xs={6} className="border-end border-end-dashed">
                                <h5 className="mb-1 text-primary">{client.cantidadServicios || 0}</h5>
                                <p className="text-muted mb-0 fs-12">Servicios</p>
                              </Col>
                              <Col xs={6}>
                                <div className="d-flex flex-wrap gap-1 justify-content-center">
                                  {client.tags && client.tags.length > 0 ? (
                                    client.tags.slice(0, 2).map((tag: string, idx: number) => (
                                      <Badge key={idx} color="primary" pill className="fs-10">{tag}</Badge>
                                    ))
                                  ) : (
                                    <span className="text-muted fs-12">Sin servicios</span>
                                  )}
                                </div>
                              </Col>
                            </Row>
                          </Col>
                        </Row>
                      </CardBody>
                    </Card>
                  </Col>
                ))
              ) : (
                // Vista Lista
                <Col lg={12}>
                  <Card>
                    <CardBody>
                      <div className="table-responsive">
                        <table className="table table-hover align-middle table-nowrap mb-0">
                          <thead className="table-light">
                            <tr>
                              <th scope="col">Cliente</th>
                              <th scope="col">Teléfono</th>
                              <th scope="col">Email</th>
                              <th scope="col">Servicios</th>
                              <th scope="col">Origen</th>
                              <th scope="col">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredClients.map((client: any, index: number) => (
                              <tr key={client.id || index}>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0">
                                      {client.img ? (
                                        <img src={client.img} alt="" className="avatar-xs rounded-circle" />
                                      ) : (
                                        <div className={`avatar-xs`}>
                                          <span className={`avatar-title rounded-circle bg-${getAvatarColor(client.name)}-subtle text-${getAvatarColor(client.name)}`}>
                                            {getInitials(client.name)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-grow-1 ms-2">
                                      <h6 className="mb-0">{client.name}</h6>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  {client.phone ? (
                                    <a href={`https://wa.me/${client.phone}`} target="_blank" rel="noreferrer" className="text-success">
                                      <i className="ri-whatsapp-line me-1"></i>{client.phone}
                                    </a>
                                  ) : '-'}
                                </td>
                                <td>{client.email || '-'}</td>
                                <td>
                                  <Badge color="primary">{client.cantidadServicios || 0}</Badge>
                                </td>
                                <td>
                                  {isWhatsAppClient(client) ? (
                                    <Badge color="success"><i className="ri-whatsapp-line me-1"></i>WhatsApp</Badge>
                                  ) : (
                                    <Badge color="info">Web</Badge>
                                  )}
                                </td>
                                <td>
                                  <div className="hstack gap-2">
                                    <Button color="soft-info" size="sm" onClick={() => { setIsOpen(true); setSideBar(client); }}>
                                      <i className="ri-eye-line"></i>
                                    </Button>
                                    <Button color="soft-primary" size="sm" onClick={() => handleEditClick(client)}>
                                      <i className="ri-pencil-line"></i>
                                    </Button>
                                    <Button color="soft-danger" size="sm" onClick={() => onClickDelete(client)}>
                                      <i className="ri-delete-bin-line"></i>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              )}

              {filteredClients.length === 0 && (
                <Col lg={12}>
                  <div className="py-4 text-center">
                    <i className="ri-search-line display-5 text-success"></i>
                    <h5 className="mt-4">
                      {searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
                    </h5>
                    {!searchTerm && (
                      <Button color="primary" className="mt-2" onClick={handleAddClientClick}>
                        <i className="ri-add-fill me-1"></i>Agregar primer cliente
                      </Button>
                    )}
                  </div>
                </Col>
              )}
            </Row>
          )}
        </Container>
      </div>

      {/* Offcanvas para detalles del cliente */}
      <Offcanvas
        isOpen={isOpen}
        direction="end"
        toggle={() => setIsOpen(!isOpen)}
        className="offcanvas-end border-0"
        style={{ width: '380px' }}
      >
        <OffcanvasBody className="profile-offcanvas p-0">
          <div className={`team-cover bg-${getAvatarColor(sideBar?.name || '')}`} style={{ height: '120px' }}>
            <div className="d-flex justify-content-end p-2">
              <button type="button" className="btn btn-light btn-icon btn-sm" onClick={() => setIsOpen(false)}>
                <i className="ri-close-line fs-16"></i>
              </button>
            </div>
          </div>
          <div className="p-3 text-center mt-n5">
            <div className="avatar-lg img-thumbnail rounded-circle mx-auto bg-white">
              {sideBar?.img ? (
                <img src={sideBar.img} alt="" className="img-fluid rounded-circle" />
              ) : (
                <div className={`avatar-title rounded-circle bg-${getAvatarColor(sideBar?.name || '')}-subtle text-${getAvatarColor(sideBar?.name || '')} fs-24`}>
                  {getInitials(sideBar?.name || '')}
                </div>
              )}
            </div>
            <div className="mt-3">
              <h5 className="fs-17 mb-1">{sideBar?.name || 'Cliente'}</h5>
              {isWhatsAppClient(sideBar) && (
                <Badge color="success" className="mb-2">
                  <i className="ri-whatsapp-line me-1"></i>Registrado via WhatsApp
                </Badge>
              )}
            </div>
          </div>

          <Row className="g-0 text-center border-top">
            <Col xs={6}>
              <div className="p-3 border-end">
                <h5 className="mb-1 text-primary">{sideBar?.cantidadServicios || 0}</h5>
                <p className="text-muted mb-0 fs-12">Servicios</p>
              </div>
            </Col>
            <Col xs={6}>
              <div className="p-3">
                <h5 className="mb-1">
                  {sideBar?.tags?.length || 0}
                </h5>
                <p className="text-muted mb-0 fs-12">Tipos</p>
              </div>
            </Col>
          </Row>

          <div className="p-3">
            <h6 className="text-muted text-uppercase fw-semibold mb-3">
              <i className="ri-information-line me-1"></i>Información de Contacto
            </h6>

            <div className="mb-3">
              <p className="text-muted mb-1 fs-12">Teléfono</p>
              {sideBar?.phone ? (
                <a href={`tel:${sideBar.phone}`} className="fw-medium d-block">
                  <i className="ri-phone-line me-1 text-success"></i>{sideBar.phone}
                </a>
              ) : (
                <span className="text-muted">No registrado</span>
              )}
            </div>

            <div className="mb-3">
              <p className="text-muted mb-1 fs-12">Email</p>
              {sideBar?.email && !sideBar.email.includes('@whatsapp.temp') ? (
                <a href={`mailto:${sideBar.email}`} className="fw-medium d-block">
                  <i className="ri-mail-line me-1 text-primary"></i>{sideBar.email}
                </a>
              ) : (
                <span className="text-muted">No registrado</span>
              )}
            </div>

            {sideBar?.tags && sideBar.tags.length > 0 && (
              <div className="mb-3">
                <p className="text-muted mb-2 fs-12">Servicios Frecuentes</p>
                <div className="d-flex flex-wrap gap-1">
                  {sideBar.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} color="primary-subtle" className="text-primary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-top hstack gap-2">
            {sideBar?.phone && (
              <a
                href={`https://wa.me/${sideBar.phone}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success w-100"
              >
                <i className="ri-whatsapp-line me-1"></i>WhatsApp
              </a>
            )}
            <Button color="primary" className="w-100" onClick={() => { setIsOpen(false); handleEditClick(sideBar); }}>
              <i className="ri-pencil-line me-1"></i>Editar
            </Button>
          </div>
        </OffcanvasBody>
      </Offcanvas>

      {/* Modal de Crear/Editar */}
      <Modal id="showModal" isOpen={modal} toggle={toggle} centered>
        <ModalHeader className="bg-primary-subtle p-3" toggle={toggle}>
          {isEdit ? `Editar Cliente: ${contactToEdit?.first_name || ''} ${contactToEdit?.last_name || ''}`.trim() : "Agregar Cliente"}
        </ModalHeader>
        <Form onSubmit={validation.handleSubmit}>
          <ModalBody>
            <Row className="g-3">
              <Col md={6}>
                <Label htmlFor="first_name-field">Nombre</Label>
                <Input name="first_name" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.first_name} invalid={!!(validation.touched.first_name && validation.errors.first_name)} />
                {validation.touched.first_name && validation.errors.first_name && <FormFeedback>{validation.errors.first_name as string}</FormFeedback>}
              </Col>
              <Col md={6}>
                <Label htmlFor="last_name-field">Apellido</Label>
                <Input name="last_name" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.last_name} />
              </Col>
              <Col md={12}>
                <Label htmlFor="email-field">Email</Label>
                <Input name="email" type="email" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.email} invalid={!!(validation.touched.email && validation.errors.email)} />
                {validation.touched.email && validation.errors.email && <FormFeedback>{validation.errors.email as string}</FormFeedback>}
              </Col>
              <Col md={12}>
                <Label htmlFor="phone-field">Teléfono</Label>
                <Input name="phone" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.phone} />
              </Col>
              {!isEdit && (
                <Col md={12}>
                  <Label htmlFor="password-field">Contraseña</Label>
                  <InputGroup>
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      onChange={validation.handleChange}
                      onBlur={validation.handleBlur}
                      value={validation.values.password}
                      invalid={!!(validation.touched.password && validation.errors.password)}
                    />
                    <button
                      className="btn btn-light"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <i className={showPassword ? "ri-eye-off-fill" : "ri-eye-fill"}></i>
                    </button>
                    {validation.touched.password && validation.errors.password && <FormFeedback>{validation.errors.password as string}</FormFeedback>}
                  </InputGroup>
                </Col>
              )}
            </Row>
          </ModalBody>
          <ModalFooter>
            <div className="hstack gap-2 justify-content-end">
              <button type="button" className="btn btn-light" onClick={toggle}>Cerrar</button>
              <button type="submit" className="btn btn-success" disabled={validation.isSubmitting}>
                {validation.isSubmitting ? <Spinner size="sm" /> : (isEdit ? "Guardar Cambios" : "Agregar Cliente")}
              </button>
            </div>
          </ModalFooter>
        </Form>
      </Modal>
    </React.Fragment>
  );
};

export default CrmContacts;