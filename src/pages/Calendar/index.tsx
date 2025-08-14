import React, { useEffect, useState } from "react";
import { Card, CardBody, Container, Form, Input, Label, Modal, ModalBody, ModalHeader, Row, Col, Button, Spinner } from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { toast } from 'react-toastify';
import Flatpickr from "react-flatpickr";

// Redux
import { useSelector, useDispatch } from "react-redux";
import {
    getCalendarData as onGetCalendarData,
    createAppointment as onCreateAppointment,
    updateAppointment as onUpdateAppointment,
    fetchAvailability as onFetchAvailability,
    suggestStylist as onSuggestStylist,
    clearSlots,
    createNewClient as onCreateNewClient
} from "../../slices/thunks";

// Componentes Personalizados
import BreadCrumb from "../../Components/Common/BreadCrumb";
import CentroDeCitasDiarias from "../../Components/Calendar/CentroDeCitasDiarias";

interface AppointmentFormValues {
    client_id: string;
    service_id: string;
    stylist_id: string;
    date: string | Date;
    start_time: string;
    newClientFirstName: string;
    newClientLastName: string;
    newClientPhone: string;
    newClientEmail: string;
    newClientPassword: string;
}

const Calendar = () => {
    document.title = "Calendario | Sistema de Peluquerías";
    const dispatch: any = useDispatch();

    const { events, clients, services, stylists, availableSlots, loading } = useSelector((state: any) => state.Calendar);

    const [modal, setModal] = useState<boolean>(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [isSlotLoading, setIsSlotLoading] = useState<boolean>(false);
    const [showNewClientForm, setShowNewClientForm] = useState<boolean>(false);
    const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
    
    useEffect(() => {
        dispatch(onGetCalendarData());
    }, [dispatch]);

    const toggle = () => {
        if (modal) {
            setSelectedEvent(null);
            validation.resetForm();
        }
        setModal(!modal);
        setShowNewClientForm(false);
    };
    
    const handleDateClick = (arg: any) => {
        setSelectedEvent(null);
        validation.resetForm();
        validation.setFieldValue("date", arg.date);
        toggle();
    };

    const handleNewAppointmentClick = () => {
        setSelectedEvent(null);
        validation.resetForm();
        toggle();
    };
    
    const handleEventClick = (arg: any) => {
        const event = arg.event.extendedProps;
        setSelectedEvent(event);
        toggle();
    };

    const handleEventDrop = (dropInfo: any) => {
        const { event } = dropInfo;
        const updatedAppointmentPayload = {
            ...event.extendedProps,
            id: event.id,
            start_time: event.start.toISOString(),
            end_time: event.end ? event.end.toISOString() : null,
        };
        dispatch(onUpdateAppointment(updatedAppointmentPayload)).catch(() => {
            dropInfo.revert();
        });
    };

    const validation = useFormik<AppointmentFormValues>({
        enableReinitialize: true,
        initialValues: {
            client_id: '',
            service_id: '',
            stylist_id: '',
            date: '',
            start_time: '',
            newClientFirstName: '',
            newClientLastName: '',
            newClientPhone: '',
            newClientEmail: '',
            newClientPassword: 'password123'
        },
        validationSchema: Yup.object({
            service_id: Yup.string().required("Seleccione un servicio."),
            stylist_id: Yup.string().required("Seleccione un estilista."),
            date: Yup.mixed().required("Seleccione una fecha."),
            start_time: Yup.string().required("Seleccione un horario."),
            client_id: Yup.string().when('showNewClientForm', { is: false, then: (schema) => schema.required("Seleccione un cliente.") }),
            newClientFirstName: Yup.string().when('showNewClientForm', { is: true, then: (schema) => schema.required("El nombre es requerido.") }),
            newClientEmail: Yup.string().when('showNewClientForm', { is: true, then: (schema) => schema.email("Email inválido").required("El email es requerido.") }),
        }),
        onSubmit: async (values, { setSubmitting }) => {
            setSubmitting(true);
            try {
                const localDateTimeString = `${new Date(values.date).toISOString().slice(0, 10)}T${values.start_time}`;
                const utcDateTimeString = new Date(localDateTimeString).toISOString();

                if (selectedEvent) {
                    const updatedAppointment = {
                        id: selectedEvent.id,
                        client_id: values.client_id,
                        service_id: values.service_id,
                        stylist_id: values.stylist_id,
                        start_time: utcDateTimeString,
                    };
                    await dispatch(onUpdateAppointment(updatedAppointment));
                } else {
                    let finalClientId = values.client_id;
                    if (showNewClientForm) {
                        const newClient = await dispatch(onCreateNewClient({ first_name: values.newClientFirstName, last_name: values.newClientLastName, phone: values.newClientPhone, email: values.newClientEmail, password: values.newClientPassword, }));
                        finalClientId = newClient.id;
                    }
                    if (!finalClientId) throw new Error("ID de cliente no válido.");
                    
                    await dispatch(onCreateAppointment({
                        client_id: finalClientId,
                        service_id: values.service_id,
                        stylist_id: values.stylist_id,
                        start_time: utcDateTimeString
                    }));
                }
                toggle();
            } catch (error: any) {
                const errorMessage = typeof error === 'string' ? error : "No se pudo completar la operación.";
                 if (errorMessage) {
                    toast.error(errorMessage);
                }
            } finally {
                setSubmitting(false);
            }
        },
    });
    
    useEffect(() => {
        if (selectedEvent && modal && services.length > 0 && stylists.length > 0) {
            validation.setValues({
                client_id: String(selectedEvent.clientId || selectedEvent.client_id || ''),
                service_id: String(selectedEvent.serviceId || selectedEvent.service_id || ''),
                stylist_id: String(selectedEvent.stylistId || selectedEvent.stylist_id || ''),
                date: new Date(selectedEvent.start_time).toISOString().slice(0, 10),
                start_time: new Date(selectedEvent.start_time).toTimeString().slice(0, 8),
                newClientFirstName: '', newClientLastName: '', newClientPhone: '', newClientEmail: '',
                newClientPassword: '',
            });
        }
    }, [selectedEvent, modal, services, stylists]);


    const { date, stylist_id, service_id, start_time } = validation.values;

    useEffect(() => {
        if (stylist_id && date) {
            const dateObject = typeof date === 'string' ? new Date(date) : date;
            if (dateObject && !isNaN(dateObject.getTime())) {
                const dateString = dateObject.toISOString().slice(0, 10);
                setIsSlotLoading(true);

                dispatch(onFetchAvailability(stylist_id, dateString))
                    .then((fetchedSlots: string[] | undefined) => {
                        let finalSlots = fetchedSlots || [];
                        if (selectedEvent) {
                            const eventStartTimeISO = new Date(selectedEvent.start_time).toISOString();
                            const eventTimeExists = finalSlots.some(slot => new Date(slot).toISOString() === eventStartTimeISO);

                            if (!eventTimeExists) {
                                finalSlots = [...finalSlots, selectedEvent.start_time];
                                finalSlots.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
                            }
                        }
                        dispatch({ type: 'calendar/fetchSlotsSuccess', payload: finalSlots });
                    })
                    .catch((err: any) => {
                        console.error("Error al buscar disponibilidad:", err);
                        dispatch(clearSlots());
                    })
                    .finally(() => {
                        setIsSlotLoading(false);
                    });
            }
        } else {
            dispatch(clearSlots());
        }
    }, [date, stylist_id, selectedEvent, dispatch]);


    const handleSuggestStylist = async () => {
        const { date, start_time, service_id } = validation.values;
        
        if (!date || !start_time || !service_id) {
            toast.warn("Por favor, seleccione servicio, fecha y hora para sugerir un estilista.");
            return;
        }

        setIsSuggesting(true);
        try {
            const dateObject = new Date(date);
            const dateString = dateObject.toISOString().slice(0, 10);
            
            const suggestedStylist = await dispatch(onSuggestStylist(dateString, start_time, service_id));
            
            if (suggestedStylist && suggestedStylist.id) {
                validation.setFieldValue("stylist_id", String(suggestedStylist.id));
            }
        } catch (error) {
            console.error("No se pudo sugerir un estilista:", error);
        } finally {
            setIsSuggesting(false);
        }
    };

    const generateTimeSlots = () => {
        const slots = [];
        for (let h = 8; h < 19; h++) { 
            slots.push(`${String(h).padStart(2, '0')}:00:00`);
            slots.push(`${String(h).padStart(2, '0')}:30:00`);
        }
        return slots;
    };
    const timeSlots = generateTimeSlots();

    if (loading) { return <div className="page-content"><Container fluid><p>Cargando...</p></Container></div>; }

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <BreadCrumb title="Calendario" pageTitle="Citas" />
                    <Row>
                        <Col xl={3}>
                            <CentroDeCitasDiarias 
                                events={events} 
                                onNewAppointmentClick={handleNewAppointmentClick} 
                            />
                        </Col>
                        <Col xl={9}>
                            <Card className="card-h-100">
                                <CardBody>
                                    <FullCalendar
                                        plugins={[ BootstrapTheme, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin ]}
                                        initialView="dayGridMonth"
                                        headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }}
                                        events={events}
                                        editable={true}
                                        dateClick={handleDateClick}
                                        eventClick={handleEventClick}
                                        eventDrop={handleEventDrop}
                                        locale={esLocale} 
                                        buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' }}
                                    />
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            <Modal isOpen={modal} toggle={toggle} centered size="lg">
                <ModalHeader toggle={toggle} tag="h5" className="p-3 bg-light">
                    {!!selectedEvent ? "Editar Cita" : "Agendar Cita"}
                </ModalHeader>
                <ModalBody>
                    <Form onSubmit={validation.handleSubmit}>
                        <Row>
                            <Col xs={12} className="mb-3">
                                {showNewClientForm ? (
                                    <div>
                                        <h5>Datos del Nuevo Cliente</h5>
                                        <Row>
                                            <Col md={6}><Label>Nombre*</Label><Input name="newClientFirstName" onChange={validation.handleChange} value={validation.values.newClientFirstName} invalid={!!validation.errors.newClientFirstName && !!validation.touched.newClientFirstName} /></Col>
                                            <Col md={6}><Label>Apellido</Label><Input name="newClientLastName" onChange={validation.handleChange} value={validation.values.newClientLastName} /></Col>
                                            <Col md={6}><Label>Email*</Label><Input name="newClientEmail" type="email" onChange={validation.handleChange} value={validation.values.newClientEmail} invalid={!!validation.errors.newClientEmail && !!validation.touched.newClientEmail} /></Col>
                                            <Col md={6}><Label>Teléfono</Label><Input name="newClientPhone" onChange={validation.handleChange} value={validation.values.newClientPhone} /></Col>
                                        </Row>
                                        <Button color="link" size="sm" onClick={() => setShowNewClientForm(false)} className="ps-0">O seleccionar cliente existente</Button>
                                    </div>
                                ) : (
                                    <div style={{ display: selectedEvent ? 'none' : 'block' }}>
                                        <Label>Cliente Existente*</Label>
                                        <Input type="select" name="client_id" onChange={validation.handleChange} value={String(validation.values.client_id)} invalid={!!validation.errors.client_id && !!validation.touched.client_id} disabled={!!selectedEvent}>
                                            <option value="">Seleccione...</option>
                                            {clients.map((c: any) => <option key={c.id} value={String(c.id)}>{c.first_name} {c.last_name}</option>)}
                                        </Input>
                                        <Button color="link" size="sm" onClick={() => setShowNewClientForm(true)} className="ps-0">Crear nuevo cliente</Button>
                                    </div>
                                )}
                                {selectedEvent && (
                                    <div>
                                        <Label>Cliente</Label>
                                        <Input type="text" value={`${selectedEvent.client_first_name} ${selectedEvent.client_last_name || ''}`} disabled />
                                    </div>
                                )}
                            </Col>
                            
                            <Col md={12} className="mb-3">
                                <Label>Servicio*</Label>
                                <Input type="select" name="service_id" onChange={validation.handleChange} value={String(validation.values.service_id)} invalid={!!validation.errors.service_id && !!validation.touched.service_id}>
                                    <option value="">Seleccione un servicio...</option>
                                    {services.map((s: any) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                                </Input>
                            </Col>

                            <Col md={6} className="mb-3">
                                <Label>Fecha*</Label>
                                <Flatpickr
                                    className="form-control"
                                    value={validation.values.date}
                                    onChange={([date]) => validation.setFieldValue("date", date)}
                                    options={{ dateFormat: "Y-m-d", altInput: true, altFormat: "F j, Y", minDate: "today" }}
                                />
                            </Col>

                            <Col md={6} className="mb-3">
                                <Label>Hora*</Label>
                                <Input 
                                    type="select" 
                                    name="start_time" 
                                    onChange={validation.handleChange} 
                                    value={validation.values.start_time} 
                                    disabled={!date || isSlotLoading} 
                                    invalid={!!validation.errors.start_time && !!validation.touched.start_time}
                                >
                                    <option value="">Seleccione un horario...</option>
                                    {isSlotLoading ? <option disabled>Buscando...</option> : 
                                        (availableSlots.length > 0 ? availableSlots : timeSlots).map((slot: string) => {
                                            let valueTime: string;
                                            let displayTime: string;

                                            if (availableSlots.length > 0) {
                                                const localDate = new Date(slot);
                                                valueTime = localDate.toTimeString().slice(0, 8);
                                                displayTime = localDate.toTimeString().slice(0, 5);
                                            } else {
                                                valueTime = slot;
                                                displayTime = slot.slice(0, 5);
                                            }

                                            return <option key={slot} value={valueTime}>{displayTime}</option>;
                                        })
                                    }
                                </Input>
                            </Col>

                            <Col xs={12} className="mb-3">
                                <Label>Estilista*</Label>
                                <div className="d-flex">
                                    <Input 
                                        type="select" 
                                        name="stylist_id" 
                                        onChange={validation.handleChange}
                                        value={String(validation.values.stylist_id)} 
                                        className="me-2" 
                                        invalid={!!validation.errors.stylist_id && !!validation.touched.stylist_id}
                                    >
                                        <option value="">Seleccione o use el turnero...</option>
                                        {stylists.map((s: any) => <option key={s.id} value={String(s.id)}>{s.first_name} {s.last_name}</option>)}
                                    </Input>
                                    <Button 
                                        color="info" 
                                        outline 
                                        onClick={handleSuggestStylist} 
                                        title="Sugerir Estilista por Turno"
                                        disabled={isSuggesting || !date || !service_id || !start_time}
                                    >
                                        {isSuggesting ? <Spinner size="sm" /> : <i className="ri-user-voice-line"></i>}
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                        <div className="hstack gap-2 justify-content-end">
                            <Button type="button" color="light" onClick={toggle}>Cancelar</Button>
                            <Button type="submit" color="success" disabled={!validation.isValid || validation.isSubmitting}>
                                {validation.isSubmitting ? <Spinner size="sm" /> : (!!selectedEvent ? 'Guardar Cambios' : 'Agendar Cita')}
                            </Button>
                        </div>
                    </Form>
                </ModalBody>
            </Modal>
        </React.Fragment>
    );
};

export default Calendar;