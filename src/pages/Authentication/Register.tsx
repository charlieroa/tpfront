// Contenido FINAL y COMPLETO para: src/pages/Authentication/Register.tsx

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// --- IMPORTACIÓN CORREGIDA ---
import { Button, Card, CardBody, Col, Container, Form, FormFeedback, Input, Row, Alert } from 'reactstrap';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from 'reselect';

import { registerUser } from '../../slices/auth/register/thunk';
import { resetRegisterFlagChange } from '../../slices/auth/register/reducer';

import logoLight from "../../assets/images/logo-light.png";
import ParticlesAuth from '../AuthenticationInner/ParticlesAuth';

const Register = () => {
    document.title = "Registro | Sistema de Peluquerías";

    const navigate = useNavigate();
    const dispatch = useDispatch<any>();

    const selectRegisterState = (state: any) => state.Account;
    const registerData = createSelector(
        selectRegisterState,
        (state) => ({
            success: state.registrationSuccess,
            error: state.registrationError,
        })
    );
    const { success, error } = useSelector(registerData);

    const validation = useFormik({
        initialValues: { email: '', first_name: '', tenant_id: '', password: '' },
        validationSchema: Yup.object({
            email: Yup.string().required("Por favor, ingrese un email").email("Email inválido"),
            first_name: Yup.string().required("Por favor, ingrese su nombre"),
            tenant_id: Yup.string().required("Por favor, ingrese el código de la peluquería"),
            password: Yup.string().required("Por favor, ingrese una contraseña").min(6, "La contraseña debe tener al menos 6 caracteres"),
        }),
        onSubmit: (values, { setSubmitting }) => {
            const registrationData = { ...values, role_id: 4, last_name: '(Cliente)' };
            dispatch(registerUser(registrationData));
            setSubmitting(false);
        },
    });

    useEffect(() => {
        if (success) {
            setTimeout(() => navigate('/login'), 3000);
        }
        return () => {
            dispatch(resetRegisterFlagChange());
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
                                    {/* --- COMPONENTE CORREGIDO --- */}
                                    <CardBody className="p-4">
                                        <div className="text-center mt-2">
                                            <h5 className="text-primary">Crear Nueva Cuenta</h5>
                                            <p className="text-muted">Crea tu cuenta para empezar.</p>
                                        </div>
                                        {success && (<Alert color="success">¡Registro exitoso! Serás redirigido al login...</Alert>)}
                                        {error && (<Alert color="danger">{error.message || "Ha ocurrido un error."}</Alert>)}
                                        <div className="p-2 mt-4">
                                            <Form onSubmit={(e) => { e.preventDefault(); validation.handleSubmit(); }}>
                                                
                                                <div className="mb-3">
                                                    <label htmlFor="email" className="form-label">Email <span className="text-danger">*</span></label>
                                                    <Input name="email" type="email" placeholder="Ingresa tu email" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.email} invalid={!!(validation.touched.email && validation.errors.email)} />
                                                    {validation.touched.email && validation.errors.email ? <FormFeedback type="invalid">{validation.errors.email as string}</FormFeedback> : null}
                                                </div>

                                                <div className="mb-3">
                                                    <label htmlFor="first_name" className="form-label">Nombre <span className="text-danger">*</span></label>
                                                    <Input name="first_name" type="text" placeholder="Ingresa tu nombre" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.first_name} invalid={!!(validation.touched.first_name && validation.errors.first_name)} />
                                                    {validation.touched.first_name && validation.errors.first_name ? <FormFeedback type="invalid">{validation.errors.first_name as string}</FormFeedback> : null}
                                                </div>

                                                <div className="mb-3">
                                                    <label htmlFor="tenant_id" className="form-label">Código de la Peluquería <span className="text-danger">*</span></label>
                                                    <Input name="tenant_id" type="text" placeholder="Ingresa el código" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.tenant_id} invalid={!!(validation.touched.tenant_id && validation.errors.tenant_id)} />
                                                    {validation.touched.tenant_id && validation.errors.tenant_id ? <FormFeedback type="invalid">{validation.errors.tenant_id as string}</FormFeedback> : null}
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label" htmlFor="password-input">Contraseña <span className="text-danger">*</span></label>
                                                    <Input name="password" type="password" placeholder="Ingresa una contraseña" onChange={validation.handleChange} onBlur={validation.handleBlur} value={validation.values.password} invalid={!!(validation.touched.password && validation.errors.password)} />
                                                    {validation.touched.password && validation.errors.password ? <FormFeedback type="invalid">{validation.errors.password as string}</FormFeedback> : null}
                                                </div>

                                                <div className="mt-4">
                                                    <Button color="success" className="w-100" type="submit" disabled={validation.isSubmitting}>Registrarse</Button>
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

export default Register;