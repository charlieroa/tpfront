// ARCHIVO COMPLETO Y CORREGIDO: src/Components/Calendar/AppointmentModal.tsx
import React from "react";
import { Modal, ModalHeader, ModalBody, Form, Row, Col, Label, Input, Button, Spinner } from "reactstrap";
import Flatpickr from "react-flatpickr";
import { FormikProps } from "formik";
import { AppointmentFormValues } from "../../pages/Calendar/types";

// ✅ INTERFAZ DE PROPS RESTAURADA
interface AppointmentModalProps {
  isOpen: boolean;
  toggle: () => void;
  selectedEvent: any;
  validation: FormikProps<AppointmentFormValues>;
  clients: any[];
  services: any[];
  filteredStylists: any[];
  isFetchingStylists: boolean;
  availableSlots: string[];
  timeSlots: string[];
  isSlotLoading: boolean;
  isSuggesting: boolean;
  handleSuggestStylist: () => void;
  showNewClientForm: boolean;
  setShowNewClientForm: (show: boolean) => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen, toggle, selectedEvent, validation, clients, services,
  filteredStylists, isFetchingStylists, availableSlots, timeSlots,
  isSlotLoading, isSuggesting, handleSuggestStylist, showNewClientForm, setShowNewClientForm,
}) => {
  return (
    <Modal isOpen={isOpen} toggle={toggle} centered size="lg">
      <ModalHeader toggle={toggle} tag="h5" className="p-3 bg-light">
        {!!selectedEvent ? "Editar Cita" : "Agendar Cita"}
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={validation.handleSubmit}>
          <Row>
            {/* Sección de Cliente */}
            <Col xs={12} className="mb-3">
              {showNewClientForm ? (
                <div>
                  <h5>Datos del Nuevo Cliente</h5>
                  <Row>
                    <Col md={6}>
                      <Label>Nombre*</Label>
                      <Input
                        name="newClientFirstName"
                        onChange={validation.handleChange}
                        value={validation.values.newClientFirstName}
                        invalid={!!validation.errors.newClientFirstName && !!validation.touched.newClientFirstName}
                      />
                    </Col>
                    <Col md={6}>
                      <Label>Apellido</Label>
                      <Input
                        name="newClientLastName"
                        onChange={validation.handleChange}
                        value={validation.values.newClientLastName}
                      />
                    </Col>
                    <Col md={6}>
                      <Label>Email*</Label>
                      <Input
                        name="newClientEmail"
                        type="email"
                        onChange={validation.handleChange}
                        value={validation.values.newClientEmail}
                        invalid={!!validation.errors.newClientEmail && !!validation.touched.newClientEmail}
                      />
                    </Col>
                    <Col md={6}>
                      <Label>Teléfono</Label>
                      <Input
                        name="newClientPhone"
                        onChange={validation.handleChange}
                        value={validation.values.newClientPhone}
                      />
                    </Col>
                  </Row>
                  <Button color="link" size="sm" onClick={() => setShowNewClientForm(false)} className="ps-0">
                    O seleccionar cliente existente
                  </Button>
                </div>
              ) : (
                <div style={{ display: selectedEvent ? "none" : "block" }}>
                  <Label>Cliente Existente*</Label>
                  <Input
                    type="select"
                    name="client_id"
                    onChange={validation.handleChange}
                    value={String(validation.values.client_id)}
                    invalid={!!validation.errors.client_id && !!validation.touched.client_id}
                    disabled={!!selectedEvent}
                  >
                    <option value="">Seleccione...</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </Input>
                  <Button color="link" size="sm" onClick={() => setShowNewClientForm(true)} className="ps-0">
                    Crear nuevo cliente
                  </Button>
                </div>
              )}
              {selectedEvent && (
                <div>
                  <Label>Cliente</Label>
                  <Input type="text" value={`${selectedEvent.client_first_name} ${selectedEvent.client_last_name || ""}`} disabled />
                </div>
              )}
            </Col>

            {/* Sección de Servicio */}
            <Col md={12} className="mb-3">
              <Label>Servicio*</Label>
              <Input
                type="select"
                name="service_id"
                onChange={validation.handleChange}
                value={String(validation.values.service_id)}
                invalid={!!validation.errors.service_id && !!validation.touched.service_id}
              >
                <option value="">Seleccione un servicio...</option>
                {services.map((s: any) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </Input>
            </Col>

            {/* Sección de Fecha y Hora */}
            <Col md={6} className="mb-3">
              <Label>Fecha*</Label>
              <Flatpickr
                className="form-control"
                value={validation.values.date as any}
                onChange={([date]) => validation.setFieldValue("date", date)}
                options={{
                  dateFormat: "Y-m-d",
                  altInput: true,
                  altFormat: "F j, Y",
                  minDate: "today",
                }}
              />
            </Col>
            <Col md={6} className="mb-3">
              <Label>Hora*</Label>
              <Input
                type="select"
                name="start_time"
                onChange={validation.handleChange}
                value={validation.values.start_time}
                disabled={!validation.values.date || isSlotLoading}
                invalid={!!validation.errors.start_time && !!validation.touched.start_time}
              >
                <option value="">Seleccione un horario...</option>
                {isSlotLoading ? (
                  <option disabled>Buscando...</option>
                ) : (availableSlots.length > 0 ? availableSlots : timeSlots).map((slot: string) => {
                  let valueTime: string, displayTime: string;
                  if (availableSlots.length > 0) {
                    const localDate = new Date(slot);
                    valueTime = localDate.toTimeString().slice(0, 8);
                    displayTime = localDate.toTimeString().slice(0, 5);
                  } else {
                    valueTime = slot;
                    displayTime = slot.slice(0, 5);
                  }
                  return (
                    <option key={slot} value={valueTime}>
                      {displayTime}
                    </option>
                  );
                })}
              </Input>
            </Col>

            {/* Sección de Estilista */}
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
                  disabled={!validation.values.service_id || isFetchingStylists}
                >
                  <option value="">
                    {!validation.values.service_id ? "Seleccione un servicio primero..." : "Seleccione un estilista..."}
                  </option>
                  {isFetchingStylists ? (
                    <option disabled>Cargando estilistas...</option>
                  ) : (
                    filteredStylists.map((s: any) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.first_name} {s.last_name}
                      </option>
                    ))
                  )}
                </Input>
                <Button
                  color="info"
                  outline
                  onClick={handleSuggestStylist}
                  title="Sugerir Estilista por Turno"
                  disabled={isSuggesting || !validation.values.date || !validation.values.service_id || !validation.values.start_time}
                >
                  {isSuggesting ? <Spinner size="sm" /> : <i className="ri-user-voice-line"></i>}
                </Button>
              </div>
            </Col>
          </Row>

          <div className="hstack gap-2 justify-content-end">
            <Button type="button" color="light" onClick={toggle}>
              Cancelar
            </Button>
            <Button
              type="submit"
              color="success"
              disabled={!validation.isValid || validation.isSubmitting}
            >
              {validation.isSubmitting ? (
                <Spinner size="sm" />
              ) : !!selectedEvent ? (
                "Guardar Cambios"
              ) : (
                "Agendar Cita"
              )}
            </Button>
          </div>
        </Form>
      </ModalBody>
    </Modal>
  );
};

export default AppointmentModal;
