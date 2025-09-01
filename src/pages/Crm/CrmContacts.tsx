import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { isEmpty } from "lodash";

// Import Images
import avatar10 from "../../assets/images/users/avatar-10.jpg";

import {
  Col,
  Container,
  Row,
  Card,
  CardHeader,
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
  Table,
  FormFeedback
} from "reactstrap";
import Select from "react-select";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";

// Export Modal
import ExportCSVModal from "../../Components/Common/ExportCSVModal";

//Import actions (se conservan aunque no las usemos para listar)
import {
  getContacts as onGetContacts,
  addNewContact as onAddNewContact,
  updateContact as onUpdateContact,
  deleteContact as onDeleteContact,
} from "../../slices/thunks";
//redux
import { useSelector, useDispatch } from "react-redux";
import TableContainer from "../../Components/Common/TableContainer";

// Formik
import * as Yup from "yup";
import { useFormik } from "formik";

import Loader from "../../Components/Common/Loader";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createSelector } from "reselect";

import dummyImg from "../../assets/images/users/user-dummy-img.jpg";

const CrmContacts = () => {
  const dispatch: any = useDispatch();
  const selectLayoutState = (state: any) => state.Crm;
  const crmcontactData = createSelector(
    selectLayoutState,
    (state: any) => ({
      crmcontacts: state.crmcontacts,
      error: state.error,
    })
  );
  const { crmcontacts, error } = useSelector(crmcontactData);

  // Datos fijos de Laura
  const lauraData = useMemo(() => ([
    {
      id: "1",
      img: avatar10,
      name: "Laura cliente",
      email: "laura@cliente.com",
      phone: "3112244567",
      tags: ["Corte hombre"], // Últimos servicios
    }
  ]), []);

  useEffect(() => {
    // Si tu app requiere cargar algo, mantenemos la llamada
    if (crmcontacts && !crmcontacts.length) {
      dispatch(onGetContacts());
    }
  }, [dispatch, crmcontacts]);

  useEffect(() => {
    setContact(crmcontacts);
  }, [crmcontacts]);

  useEffect(() => {
    if (!isEmpty(crmcontacts)) {
      setContact(crmcontacts);
      setIsEdit(false);
    }
  }, [crmcontacts]);

  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [contact, setContact] = useState<any>([]);
  const [info, setInfo] = useState<any>({});

  // Seleccionar por defecto a Laura en el panel derecho
  useEffect(() => {
    if (lauraData?.length) setInfo(lauraData[0]);
  }, [lauraData]);

  // Modales / delete
  const [deleteModal, setDeleteModal] = useState<boolean>(false);
  const [deleteModalMulti, setDeleteModalMulti] = useState<boolean>(false);
  const [modal, setModal] = useState<boolean>(false);

  const toggle = useCallback(() => {
    if (modal) {
      setModal(false);
      setContact(null);
      setSelectedImage('');
      setImgStore('');
    } else {
      setModal(true);
      setTag([]);
      setAssignTag([]);
    }
  }, [modal]);

  const handleDeleteContact = () => {
    if (contact) {
      dispatch(onDeleteContact(contact.id));
      setDeleteModal(false);
    }
  };

  const onClickDelete = (c: any) => {
    setContact(c);
    setDeleteModal(true);
  };

  // Formik (se conserva para el modal de alta/edición si lo quieres usar)
  const dateFormat = () => {
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return (d.getDate() + ' ' + months[d.getMonth()] + ', ' + d.getFullYear());
  };

  const validation: any = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: (contact && contact.id) || '',
      img: (contact && contact.img) || '',
      name: (contact && contact.name) || '',
      company: (contact && contact.company) || '',
      designation: (contact && contact.designation) || '',
      email: (contact && contact.email) || '',
      phone: (contact && contact.phone) || '',
      score: (contact && contact.score) || '',
      tags: (contact && contact.tags) || [],
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Please Enter Name"),
      img: Yup.string().required("Please Enter Image"),
      company: Yup.string().required("Please Enter Company"),
      designation: Yup.string().required("Please Enter Designation"),
      email: Yup.string().required("Please Enter Email"),
      phone: Yup.string().required("Please Enter Phone"),
      score: Yup.string().required("Please Enter score"),
    }),
    onSubmit: (values) => {
      if (isEdit) {
        const updateContact = {
          id: contact ? contact.id : 0,
          img: values.img,
          name: values.name,
          company: values.company,
          designation: values.designation,
          email: values.email,
          phone: values.phone,
          score: values.score,
          date: dateFormat(),
          tags: assignTag,
        };
        dispatch(onUpdateContact(updateContact));
        validation.resetForm();
      } else {
        const newContact = {
          id: (Math.floor(Math.random() * (30 - 20)) + 20).toString(),
          img: values["img"],
          name: values["name"],
          company: values["company"],
          designation: values["designation"],
          email: values["email"],
          phone: values["phone"],
          score: values["score"],
          date: dateFormat(),
          tags: assignTag,
        };
        dispatch(onAddNewContact(newContact));
        validation.resetForm();
      }
      toggle();
    },
  });

  const handleContactClick = useCallback((arg: any) => {
    const c = arg;
    setContact({
      id: c.id,
      img: c.img,
      name: c.name,
      company: c.company,
      email: c.email,
      designation: c.designation,
      phone: c.phone,
      score: c.score,
      date: c.date,
      tags: c.tags,
    });
    setIsEdit(true);
    toggle();
  }, [toggle]);

  const handleRowClick = useCallback((rowData: any) => {
    setInfo(rowData);
  }, []);

  // Checked All / Delete Multiple (se conserva)
  const checkedAll = useCallback(() => {
    const checkall: any = document.getElementById("checkBoxAll");
    const ele = document.querySelectorAll(".contactCheckBox");
    if (checkall?.checked) {
      ele.forEach((e: any) => { e.checked = true; });
    } else {
      ele.forEach((e: any) => { e.checked = false; });
    }
    deleteCheckbox();
  }, []);

  const [selectedCheckBoxDelete, setSelectedCheckBoxDelete] = useState([] as any[]);
  const [isMultiDeleteButton, setIsMultiDeleteButton] = useState<boolean>(false);

  const deleteMultiple = () => {
    const checkall: any = document.getElementById("checkBoxAll");
    selectedCheckBoxDelete.forEach((element: any) => {
      dispatch(onDeleteContact(element.value));
      setTimeout(() => { toast.clearWaitingQueue(); }, 3000);
    });
    setIsMultiDeleteButton(false);
    if (checkall) checkall.checked = false;
  };

  const deleteCheckbox = () => {
    const ele: any = document.querySelectorAll(".contactCheckBox:checked");
    ele.length > 0 ? setIsMultiDeleteButton(true) : setIsMultiDeleteButton(false);
    setSelectedCheckBoxDelete(ele);
  };

  // Columnas — ajustadas a tu pedido
  const columns = useMemo(
    () => [
      {
        header: <input type="checkbox" className="form-check-input" id="checkBoxAll" onClick={() => checkedAll()} />,
        cell: (cell: any) => {
          return <input type="checkbox" className="contactCheckBox form-check-input" value={cell.getValue()} onChange={() => deleteCheckbox()} />;
        },
        id: '#',
        accessorKey: "id",
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        header: "Name",
        accessorKey: "name",
        enableColumnFilter: false,
        cell: (cell: any) => {
          const rowData = cell.row.original;
          return (
            <div
              className="d-flex align-items-center"
              role="button"
              tabIndex={0}
              onClick={() => handleRowClick(rowData)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleRowClick(rowData);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="flex-shrink-0">
                <img
                  src={rowData.img || dummyImg}
                  alt=""
                  className="avatar-xs rounded-circle"
                />
              </div>
              <div className="flex-grow-1 ms-2 name">
                {cell.getValue()}
              </div>
            </div>
          );
        },
      },
      // ❌ Company eliminado
      {
        header: "Email ID",
        accessorKey: "email",
        enableColumnFilter: false,
      },
      {
        header: "Phone No",
        accessorKey: "phone",
        enableColumnFilter: false,
      },
      {
        header: "Cantidad servicios",
        accessorKey: "cantidadServicios",
        enableColumnFilter: false,
        cell: (cell: any) => {
          const row = cell.row.original;
          const count = Array.isArray(row.tags) ? row.tags.length : 0;
          return <span>{count}</span>;
        }
      },
      {
        header: "Últimos servicios",
        accessorKey: "tags",
        enableColumnFilter: false,
        cell: (cell: any) => (
          <>
            {(cell.getValue() || []).map((item: any, key: any) => (
              <span className="badge bg-primary-subtle text-primary me-1" key={key}>{item}</span>
            ))}
          </>
        ),
      },
      // ❌ Last Contacted eliminado
      {
        header: "Action",
        cell: (cellProps: any) => {
          return (
            <ul className="list-inline hstack gap-2 mb-0">
              <li className="list-inline-item edit" title="Call">
                <Link to="#" className="text-muted d-inline-block">
                  <i className="ri-phone-line fs-16"></i>
                </Link>
              </li>
              <li className="list-inline-item edit" title="Message">
                <Link to="#" className="text-muted d-inline-block">
                  <i className="ri-question-answer-line fs-16"></i>
                </Link>
              </li>
              <li className="list-inline-item">
                <UncontrolledDropdown>
                  <DropdownToggle
                    href="#"
                    className="btn btn-soft-primary btn-sm dropdown"
                    tag="button"
                  >
                    <i className="ri-more-fill align-middle"></i>
                  </DropdownToggle>
                  <DropdownMenu className="dropdown-menu-end">
                    <DropdownItem className="dropdown-item" href="#"
                      onClick={() => { const contactData = cellProps.row.original; setInfo(contactData); }}
                    >
                      <i className="ri-eye-fill align-bottom me-2 text-muted"></i>{" "}
                      View
                    </DropdownItem>
                    <DropdownItem
                      className="dropdown-item edit-item-btn"
                      href="#"
                      onClick={() => { const contactData = cellProps.row.original; handleContactClick(contactData); }}
                    >
                      <i className="ri-pencil-fill align-bottom me-2 text-muted"></i>{" "}
                      Edit
                    </DropdownItem>
                    <DropdownItem
                      className="dropdown-item remove-item-btn"
                      href="#"
                      onClick={() => { const contactData = cellProps.row.original; onClickDelete(contactData); }}
                    >
                      <i className="ri-delete-bin-fill align-bottom me-2 text-muted"></i>{" "}
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </UncontrolledDropdown>
              </li>
            </ul>
          );
        },
      },
    ],
    [handleContactClick, checkedAll, handleRowClick]
  );

  // Tags para el modal (si lo usas)
  const [tag, setTag] = useState<any>();
  const [assignTag, setAssignTag] = useState<any>([]);
  const handlestag = (tags: any) => {
    setTag(tags);
    const assigned = tags.map((item: any) => item.value);
    setAssignTag(assigned);
  };
  const tags = [
    { label: "Exiting", value: "Exiting" },
    { label: "Lead", value: "Lead" },
    { label: "Long-term", value: "Long-term" },
    { label: "Partner", value: "Partner" }
  ];

  // Imagen para el modal
  const [imgStore, setImgStore] = useState<any>();
  const [selectedImage, setSelectedImage] = useState<any>();
  const handleClick = (item: any) => {
    const newData = [...(imgStore || []), item];
    setImgStore(newData);
    validation.setFieldValue('img', newData);
  };
  useEffect(() => {
    setImgStore((contact && contact.img) || []);
  }, [contact]);
  const handleImageChange = (event: any) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e: any) => {
      validation.setFieldValue('img', e.target.result);
      setSelectedImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Export
  const [isExportCSV, setIsExportCSV] = useState<boolean>(false);

  document.title = "Contacts | Velzon - React Admin & Dashboard Template";
  return (
    <React.Fragment>
      <div className="page-content">
        <ExportCSVModal
          show={isExportCSV}
          onCloseClick={() => setIsExportCSV(false)}
          data={lauraData}
        />
        <DeleteModal
          show={deleteModal}
          onDeleteClick={handleDeleteContact}
          onCloseClick={() => setDeleteModal(false)}
        />
        <DeleteModal
          show={deleteModalMulti}
          onDeleteClick={() => {
            deleteMultiple();
            setDeleteModalMulti(false);
          }}
          onCloseClick={() => setDeleteModalMulti(false)}
        />
        <Container fluid>
          <BreadCrumb title="Crm y campañas" pageTitle="CRM" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    <div className="flex-grow-1">
                      <button
                        className="btn btn-primary add-btn"
                        onClick={() => { setModal(true); }}
                      >
                        <i className="ri-add-fill me-1 align-bottom"></i> Agregar cliente
                      </button>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="hstack text-nowrap gap-2">
                        {isMultiDeleteButton && (
                          <button className="btn btn-soft-danger" id="remove-actions"
                            onClick={() => setDeleteModalMulti(true)}
                          ><i className="ri-delete-bin-2-line"></i></button>
                        )}
                        <button className="btn btn-secondary">
                          <i className="ri-filter-2-line me-1 align-bottom"></i> Filters
                        </button>
                        <button className="btn btn-soft-success" onClick={() => setIsExportCSV(true)}>Importar</button>

                        <UncontrolledDropdown>
                          <DropdownToggle
                            href="#"
                            className="btn btn-soft-info"
                            tag="button"
                          >
                            <i className="ri-more-2-fill"></i>
                          </DropdownToggle>
                          <DropdownMenu className="dropdown-menu-end">
                            <DropdownItem className="dropdown-item" href="#">All</DropdownItem>
                            <DropdownItem className="dropdown-item" href="#">Last Week</DropdownItem>
                            <DropdownItem className="dropdown-item" href="#">Last Month</DropdownItem>
                            <DropdownItem className="dropdown-item" href="#">Last Year</DropdownItem>
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Col>

            <Col xxl={9}>
              <Card id="contactList">
                <CardBody className="pt-0">
                  <div>
                    {lauraData && lauraData.length > 0 ? (
                      <TableContainer
                        columns={columns}
                        data={lauraData}
                        isGlobalFilter={true}
                        customPageSize={8}
                        divClass="table-responsive table-card mb-3"
                        tableClass="align-middle table-nowrap"
                        theadClass="table-light"
                        isContactsFilter={true}
                      />
                    ) : (<Loader error={error} />)}
                  </div>

                  {/* Modal de alta/edición (opcional) */}
                  <Modal id="showModal" isOpen={modal} toggle={toggle} centered>
                    <ModalHeader className="bg-primary-subtle p-3" toggle={toggle}>
                      {!!isEdit ? "Edit Contact" : "Add Contact"}
                    </ModalHeader>
                    <Form className="tablelist-form" onSubmit={(e) => {
                      e.preventDefault();
                      validation.handleSubmit();
                      return false;
                    }}>
                      <ModalBody>
                        <Input type="hidden" id="id-field" />
                        <Row className="g-3">
                          <Col lg={12}>
                            <div className="text-center">
                              <div className="position-relative d-inline-block">
                                <div className="position-absolute bottom-0 end-0">
                                  <Label htmlFor="customer-image-input" className="mb-0">
                                    <div className="avatar-xs cursor-pointer">
                                      <div className="avatar-title bg-light border rounded-circle text-muted">
                                        <i className="ri-image-fill"></i>
                                      </div>
                                    </div>
                                  </Label>
                                  <Input className="form-control d-none" id="customer-image-input" type="file"
                                    accept="image/png, image/gif, image/jpeg" onChange={handleImageChange}
                                    invalid={validation.touched.img && validation.errors.img ? true : false}
                                  />
                                </div>
                                <div className="avatar-lg p-1" onClick={(item: any) => handleClick(item)}>
                                  <div className="avatar-title bg-light rounded-circle">
                                    <img src={selectedImage || validation.values.img || dummyImg} alt="dummyImg" id="customer-img" className="avatar-md rounded-circle object-fit-cover" />
                                  </div>
                                </div>
                              </div>
                              {validation.errors.img && validation.touched.img ? (
                                <FormFeedback type="invalid" className='d-block'> {validation.errors.img} </FormFeedback>
                              ) : null}
                            </div>

                            <div>
                              <Label htmlFor="name-field" className="form-label">Name</Label>
                              <Input
                                name="name"
                                id="customername-field"
                                className="form-control"
                                placeholder="Enter Name"
                                type="text"
                                onChange={validation.handleChange}
                                onBlur={validation.handleBlur}
                                value={validation.values.name || ""}
                                invalid={validation.touched.name && validation.errors.name ? true : false}
                              />
                              {validation.touched.name && validation.errors.name ? (
                                <FormFeedback type="invalid">{validation.errors.name}</FormFeedback>
                              ) : null}
                            </div>
                          </Col>
                          {/* Resto de campos del modal… */}
                        </Row>
                      </ModalBody>
                      <ModalFooter>
                        <div className="hstack gap-2 justify-content-end">
                          <button type="button" className="btn btn-light" onClick={() => { setModal(false); }} >Close</button>
                          <button type="submit" className="btn btn-success" id="add-btn">{!!isEdit ? "Update" : "Add Contact"}</button>
                        </div>
                      </ModalFooter>
                    </Form>
                  </Modal>

                  <ToastContainer closeButton={false} limit={1} />
                </CardBody>
              </Card>
            </Col>

            {/* Panel derecho — información de Laura */}
            <Col xxl={3}>
              <Card id="contact-view-detail">
                <CardBody className="text-center">
                  <div className="position-relative d-inline-block">
                    <img
                      src={info.img || avatar10}
                      alt=""
                      className="avatar-lg rounded-circle img-thumbnail"
                    />
                    <span className="contact-active position-absolute rounded-circle bg-success">
                      <span className="visually-hidden"></span>
                    </span>
                  </div>
                  <h5 className="mt-4 mb-1">{info.name || "Laura cliente"}</h5>
                  {/* ❌ Company eliminado */}
                  <ul className="list-inline mb-0">
                    <li className="list-inline-item avatar-xs">
                      <Link to="#" className="avatar-title bg-success-subtle text-success fs-15 rounded">
                        <i className="ri-phone-line"></i>
                      </Link>
                    </li>
                    <li className="list-inline-item avatar-xs">
                      <Link to="#" className="avatar-title bg-danger-subtle text-danger fs-15 rounded">
                        <i className="ri-mail-line"></i>
                      </Link>
                    </li>
                    <li className="list-inline-item avatar-xs">
                      <Link to="#" className="avatar-title bg-warning-subtle text-warning fs-15 rounded">
                        <i className="ri-question-answer-line"></i>
                      </Link>
                    </li>
                  </ul>
                </CardBody>

                <CardBody>
                  <h6 className="text-muted text-uppercase fw-semibold mb-3">Información personal</h6>

                  <div className="table-responsive table-card">
                    <Table className="table table-borderless mb-0">
                      <tbody>
                        <tr>
                          <td className="fw-medium">Email</td>
                          <td>{info.email || "laura@cliente.com"}</td>
                        </tr>
                        <tr>
                          <td className="fw-medium">Teléfono</td>
                          <td>{info.phone || "3112244567"}</td>
                        </tr>
                        <tr>
                          <td className="fw-medium">Últimos servicios</td>
                          <td>
                            {(info.tags || ["Corte hombre"]).map((item: any, key: any) => (
                              <span className="badge bg-primary-subtle text-primary me-1" key={key}>{item}</span>
                            ))}
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-medium">Cantidad servicios</td>
                          <td>{Array.isArray(info.tags) ? info.tags.length : 1}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>

                  <div className="d-flex gap-2 mt-3">
                    <a
                      href={`mailto:${info.email || "laura@cliente.com"}`}
                      className="btn btn-danger btn-sm"
                    >
                      Enviar email
                    </a>
                    <a
                      href={`https://wa.me/${(info.phone || "3112244567").replace(/\D/g, "").startsWith("57") ? (info.phone || "3112244567").replace(/\D/g, "") : "57" + (info.phone || "3112244567").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-success btn-sm"
                    >
                      Enviar WhatsApp
                    </a>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default CrmContacts;
