
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Col, Container, Form, FormFeedback, Input, Row, Alert } from 'reactstrap';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from 'reselect';

import { registerTenant } from '../../slices/auth/tenantRegister/thunk';
import { resetTenantRegisterFlag } from '../../slices/auth/tenantRegister/reducer';

import logoLight from "../../assets/images/logo-light.png";
import ParticlesAuth from '../AuthenticationInner/ParticlesAuth';

const TenantRegister = () => {
    document.title = "Crear Cuenta de Peluquería | Sistema de Peluquerías";

    const navigate = useNavigate();
    const dispatch = useDispatch<any>();

    // Apuntamos al nuevo estado de Redux que creamos
    const selectRegisterState = (state: any) => state.tenantRegister;
    const registerData = createSelector(
        selectRegisterState,
        (state) => ({
            success: state.registrationSuccess,
            error: state.registrationError,
        })
    );
    const { success, error } = useSelector(registerData);

    const validation = useFormik({
        initialValues: {
            tenantName: '',
            adminFirstName: '',
            adminEmail: '',
            adminPassword: '',
        },
        validationSchema: Yup.object({
            tenantName: Yup.string().required("Por favor, ingrese el nombre de la peluquería"),
            adminFirstName: Yup.string().required("Por favor, ingrese su nombre"),
            adminEmail: Yup.string().required("Por favor, ingrese un email").email("Email inválido"),
            adminPassword: Yup.string().required("Por favor, ingrese una contraseña").min(6, "La contraseña debe tener al menos 6 caracteres"),
        }),
        onSubmit: (values, { setSubmitting }) => {
            dispatch(registerTenant(values));
            setSubmitting(false);
        },
    });

    useEffect(() => {
        if (success) {
            setTimeout(() => navigate('/login'), 3000);
        }
        return () => {
            dispatch(resetTenantRegisterFlag());
        };
    }, [success, dispatch, navigate]);

    return (
        <React.Fragment>
            <ParticlesAuth>
                <div className="auth-page-content">
                    <Container>
                        <Row className="justify-content-center">
                            <Col md={8} lg={6} xl={5}>
                                <Card className="mt-4">
                                    <CardBody className="p-4">
                                        <div className="text-center mt-2">
                                            <h5 className="text-primary">Crear Cuenta de Peluquería</h5>
                                            <p className="text-muted">Empieza a gestionar tu negocio hoy mismo.</p>
                                        </div>
                                        {success && (<Alert color="success">¡Registro exitoso! Serás redirigido para que inicies sesión.</Alert>)}
                                        {error && (<Alert color="danger">{error.message || "Ha ocurrido un error en el registro."}</Alert>)}
                                        <div className="p-2 mt-4">
                                            <Form onSubmit={(e) => { e.preventDefault(); validation.handleSubmit(); }}>
                                                
                                                <div className="mb-3">
                                                    <label htmlFor="tenantName" className="form-label">Nombre de tu Peluquería <span className="text-danger">*</span></label>
                                                    <Input name="tenantName" type="text" placeholder="Ej: Salón Glamour" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.tenantName} invalid={!!(validation.touched.tenantName && validation.errors.tenantName)} />
                                                    {validation.touched.tenantName && validation.errors.tenantName ? <FormFeedback type="invalid">{validation.errors.tenantName as string}</FormFeedback> : null}
                                                </div>

                                                <div className="mb-3">
                                                    <label htmlFor="adminFirstName" className="form-label">Tu Nombre <span className="text-danger">*</span></label>
                                                    <Input name="adminFirstName" type="text" placeholder="Ej: Ana López" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.adminFirstName} invalid={!!(validation.touched.adminFirstName && validation.errors.adminFirstName)} />
                                                    {validation.touched.adminFirstName && validation.errors.adminFirstName ? <FormFeedback type="invalid">{validation.errors.adminFirstName as string}</FormFeedback> : null}
                                                </div>

                                                <div className="mb-3">
                                                    <label htmlFor="adminEmail" className="form-label">Tu Email <span className="text-danger">*</span></label>
                                                    <Input name="adminEmail" type="email" placeholder="Para iniciar sesión" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.adminEmail} invalid={!!(validation.touched.adminEmail && validation.errors.adminEmail)} />
                                                    {validation.touched.adminEmail && validation.errors.adminEmail ? <FormFeedback type="invalid">{validation.errors.adminEmail as string}</FormFeedback> : null}
                                                </div>
                                                
                                                <div className="mb-3">
                                                    <label className="form-label" htmlFor="adminPassword">Contraseña <span className="text-danger">*</span></label>
                                                    <Input name="adminPassword" type="password" placeholder="Crea una contraseña segura" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.adminPassword} invalid={!!(validation.touched.adminPassword && validation.errors.adminPassword)} />
                                                    {validation.touched.adminPassword && validation.errors.adminPassword ? <FormFeedback type="invalid">{validation.errors.adminPassword as string}</FormFeedback> : null}
                                                </div>

                                                <div className="mt-4">
                                                    <Button color="success" className="w-100" type="submit" disabled={validation.isSubmitting}>Crear mi cuenta</Button>
                                                </div>
                                            </Form>
                                        </div>
                                    </CardBody>
                                </Card>
                                <div className="mt-4 text-center">
                                    <p className="mb-0">¿Ya tienes una cuenta? <Link to="/login" className="fw-semibold text-primary text-decoration-underline"> Iniciar Sesión </Link></p>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                </div>
            </ParticlesAuth>
        </React.Fragment>
    );
};

export default TenantRegister;