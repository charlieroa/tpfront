import React, { useEffect, useState } from "react";
import { Card, CardBody, Container, Form, FormFeedback, Input, Label, Modal, ModalBody, ModalHeader, Row, Col, Button, Spinner } from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { Draggable } from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";
import listPlugin from '@fullcalendar/list';
import { toast } from 'react-toastify';
import Flatpickr from "react-flatpickr";

// Redux
import { useSelector, useDispatch } from "react-redux";
import {
    getCalendarData as onGetCalendarData,
    createAppointment as onCreateAppointment,
    fetchAvailability as onFetchAvailability,
    clearSlots,
    createNewClient as onCreateNewClient
} from "../../slices/thunks";

import BreadCrumb from "../../Components/Common/BreadCrumb";

const Calendar = () => {
    document.title = "Calendario | Sistema de Peluquerías";
    const dispatch: any = useDispatch();

    const { events, clients, services, stylists, categories, availableSlots, nextAvailableStylist, loading, isAppointmentCreated } = useSelector((state: any) => state.Calendar);

    const [modal, setModal] = useState<boolean>(false);
    const [isSlotLoading, setIsSlotLoading] = useState<boolean>(false);
    const [showNewClientForm, setShowNewClientForm] = useState<boolean>(false);
    
    useEffect(() => {
        dispatch(onGetCalendarData());
        const externalEventsElement = document.getElementById("external-events");
        if (externalEventsElement) {
            new Draggable(externalEventsElement, { itemSelector: ".external-event" });
        }
    }, [dispatch]);
    
    useEffect(() => {
        if (isAppointmentCreated && modal) {
            toggle();
        }
    }, [isAppointmentCreated, modal]);

    // ✅ PASO 1: Simplificamos la función toggle. Ya no resetea el formulario.
    const toggle = () => {
        setModal(!modal);
        setShowNewClientForm(false);
    };

    const handleDateClick = (arg: any) => {
        validation.setFieldValue("date", arg.date);
        if (nextAvailableStylist?.id) {
            validation.setFieldValue("stylist_id", nextAvailableStylist.id);
        }
        toggle(); // Llama al toggle simplificado
    };

    // ✅ PASO 2: Creamos una nueva función para el botón "Crear Nueva Cita"
    const handleNewAppointmentClick = () => {
        validation.resetForm(); // Resetea el formulario a sus valores iniciales
        toggle(); // Abre el modal
    };
    
    const validation = useFormik({
        enableReinitialize: true,
        initialValues: {
            client_id: '', service_id: '', stylist_id: '', date: '', start_time: '',
            newClientFirstName: '', newClientLastName: '', newClientPhone: '', newClientEmail: '', newClientPassword: 'password123'
        },
        validationSchema: Yup.object({
            service_id: Yup.string().required("Seleccione un servicio."),
            stylist_id: Yup.string().required("Seleccione un estilista."),
            date: Yup.date().required("Seleccione una fecha."),
            start_time: Yup.string().required("Seleccione un horario."),
            client_id: Yup.string().when('showNewClientForm', { is: false, then: (schema) => schema.required("Seleccione un cliente.") }),
            newClientFirstName: Yup.string().when('showNewClientForm', { is: true, then: (schema) => schema.required("El nombre es requerido.") }),
            newClientEmail: Yup.string().when('showNewClientForm', { is: true, then: (schema) => schema.email("Email inválido").required("El email es requerido.") }),
        }),
        onSubmit: async (values, { setSubmitting }) => {
            setSubmitting(true);
            try {
                let finalClientId = values.client_id;
                if (showNewClientForm) {
                    const newClient = await dispatch(onCreateNewClient({
                        first_name: values.newClientFirstName, last_name: values.newClientLastName,
                        phone: values.newClientPhone, email: values.newClientEmail, password: values.newClientPassword,
                    }));
                    finalClientId = newClient.id;
                }
                
                if (!finalClientId) throw new Error("ID de cliente no válido.");
                
                const localDateTimeString = `${new Date(values.date).toISOString().slice(0, 10)}T${values.start_time}`;
                const localDate = new Date(localDateTimeString);
                const utcDateTimeString = localDate.toISOString();

                await dispatch(onCreateAppointment({
                    client_id: finalClientId,
                    service_id: values.service_id,
                    stylist_id: values.stylist_id,
                    start_time: utcDateTimeString
                }));
                toast.success("¡Cita creada con éxito!");
            } catch (error: any) {
                const errorMessage = error?.error || "No se pudo completar la operación.";
                toast.error(errorMessage);
            } finally {
                setSubmitting(false);
            }
        },
    });

    useEffect(() => {
        const { stylist_id, date } = validation.values;
        if (stylist_id && date) {
            const dateString = new Date(date).toISOString().slice(0, 10);
            setIsSlotLoading(true);
            dispatch(onFetchAvailability(stylist_id, dateString)).finally(() => setIsSlotLoading(false));
        } else {
            dispatch(clearSlots());
        }
    }, [validation.values.stylist_id, validation.values.date, dispatch]);

    const handleSuggestStylist = () => {
        if (nextAvailableStylist?.id) {
            validation.setFieldValue("stylist_id", nextAvailableStylist.id);
            toast.info(`Estilista sugerido por turnero: ${nextAvailableStylist.first_name}`);
        } else {
            toast.warn("No hay estilistas disponibles en el turnero en este momento.");
        }
    };

    if (loading && !events.length) {
        return <div className="page-content"><Container fluid><p>Cargando...</p></Container></div>;
    }

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Calendario" pageTitle="Citas" />
                    <Row>
                        <Col xl={3}>
                            <Card>
                                <CardBody>
                                    {/* ✅ PASO 3: El botón ahora llama a la nueva función */}
                                    <Button color="primary" className="w-100" onClick={handleNewAppointmentClick}>
                                        <i className="mdi mdi-plus"></i> Crear Nueva Cita
                                    </Button>
                                </CardBody>
                            </Card>
                            <Card>
                                <CardBody>
                                    <h5 className="mb-3">Categorías</h5>
                                    <div id="external-events">
                                        {(categories || []).map((category: any) => (
                                            <div
                                                className={`bg-${category.type}-subtle external-event fc-event text-${category.type} mb-2`}
                                                key={"cat-" + category.id} >
                                                <i className="mdi mdi-checkbox-blank-circle font-size-11 me-2" />
                                                {category.title}
                                            </div>
                                        ))}
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={9}>
                            <Card className="card-h-100">
                                <CardBody>
                                    <FullCalendar
                                        plugins={[ BootstrapTheme, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin ]}
                                        initialView="dayGridMonth"
                                        headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
                                        events={events}
                                        dateClick={handleDateClick}
                                        eventClick={(info) => alert(`Cita: ${info.event.title}`)}
                                    />
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            <Modal isOpen={modal} toggle={toggle} centered size="lg">
                <ModalHeader toggle={toggle} tag="h5" className="p-3 bg-light">Agendar Cita</ModalHeader>
                <ModalBody>
                    <Form onSubmit={validation.handleSubmit}>
                        {/* El resto del formulario no cambia */}
                        <Row>
                            <Col xs={12} className="mb-3">
                                {showNewClientForm ? (
                                    <div>
                                        <h5>Datos del Nuevo Cliente</h5>
                                        <Row>
                                            <Col md={6}><Label>Nombre*</Label><Input name="newClientFirstName" onChange={validation.handleChange} value={validation.values.newClientFirstName} invalid={!!validation.errors.newClientFirstName && validation.touched.newClientFirstName} /></Col>
                                            <Col md={6}><Label>Apellido</Label><Input name="newClientLastName" onChange={validation.handleChange} value={validation.values.newClientLastName} /></Col>
                                            <Col md={6}><Label>Email*</Label><Input name="newClientEmail" type="email" onChange={validation.handleChange} value={validation.values.newClientEmail} invalid={!!validation.errors.newClientEmail && validation.touched.newClientEmail} /></Col>
                                            <Col md={6}><Label>Teléfono</Label><Input name="newClientPhone" onChange={validation.handleChange} value={validation.values.newClientPhone} /></Col>
                                        </Row>
                                        <Button color="link" size="sm" onClick={() => setShowNewClientForm(false)} className="ps-0">O seleccionar cliente existente</Button>
                                    </div>
                                ) : (
                                    <div>
                                        <Label>Cliente Existente*</Label>
                                        <Input type="select" name="client_id" onChange={validation.handleChange} value={validation.values.client_id} invalid={!!validation.errors.client_id && validation.touched.client_id}>
                                            <option value="">Seleccione...</option>
                                            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                                        </Input>
                                        <Button color="link" size="sm" onClick={() => setShowNewClientForm(true)} className="ps-0">Crear nuevo cliente</Button>
                                    </div>
                                )}
                            </Col>
                            
                            <Col md={12} className="mb-3">
                                <Label>Servicio*</Label>
                                <Input type="select" name="service_id" onChange={validation.handleChange} value={validation.values.service_id} invalid={!!validation.errors.service_id && validation.touched.service_id}>
                                    <option value="">Seleccione un servicio...</option>
                                    {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Input>
                            </Col>

                            <Col md={6} className="mb-3">
                                <Label>Fecha*</Label>
                                <Flatpickr
                                    className="form-control"
                                    value={validation.values.date}
                                    onChange={([date]) => validation.setFieldValue("date", date)}
                                    options={{ dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y" }}
                                />
                            </Col>
                             <Col md={6} className="mb-3">
                                <Label>Estilista*</Label>
                                <div className="d-flex">
                                    <Input type="select" name="stylist_id" onChange={validation.handleChange} value={validation.values.stylist_id} className="me-2" invalid={!!validation.errors.stylist_id && validation.touched.stylist_id}>
                                        <option value="">Seleccione o use el turnero...</option>
                                        {stylists.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                                    </Input>
                                    <Button color="info" outline onClick={handleSuggestStylist} title="Sugerir Estilista por Turno">
                                        <i className="ri-user-voice-line"></i>
                                    </Button>
                                </div>
                            </Col>

                            <Col xs={12} className="mb-3">
                                <Label>Horarios Disponibles*</Label>
                                {isSlotLoading ? <Spinner size="sm" /> :
                                    <Input type="select" name="start_time" onChange={validation.handleChange} value={validation.values.start_time} disabled={availableSlots.length === 0} invalid={!!validation.errors.start_time && validation.touched.start_time}>
                                        <option value="">{availableSlots.length > 0 ? "Seleccione un horario..." : "Seleccione estilista y fecha"}</option>
                                        {availableSlots.map((slot: string) => {
                                            const time = slot.slice(11, 16); // Formato HH:MM
                                            const value = slot.slice(11, 19); // Formato HH:MM:SS
                                            return <option key={slot} value={value}>{time}</option>
                                        })}
                                    </Input>
                                }
                            </Col>
                        </Row>
                        <div className="hstack gap-2 justify-content-end">
                            <Button type="button" color="light" onClick={toggle}>Cancelar</Button>
                            <Button type="submit" color="success" disabled={!validation.isValid || validation.isSubmitting}>
                                {validation.isSubmitting ? <Spinner size="sm" /> : "Agendar Cita"}
                            </Button>
                        </div>
                    </Form>
                </ModalBody>
            </Modal>
        </React.Fragment>
    );
};

export default Calendar;