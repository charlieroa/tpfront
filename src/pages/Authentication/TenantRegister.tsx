import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Col, Container, Form, FormFeedback, Input, Row, Alert, Spinner } from 'reactstrap';
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

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const selectRegisterState = (state: any) => state.tenantRegister;
    const registerData = createSelector(
        selectRegisterState,
        (state) => ({
            success: state.registrationSuccess,
            error: state.registrationError,
        })
    );
    const { success, error } = useSelector(registerData);

    // Console.log final para depuración
   

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
        onSubmit: (values) => {
            setIsLoading(true);
            dispatch(registerTenant(values));
        },
    });

    // --- useEffect CORREGIDO ---
    useEffect(() => {
        // Manejo del caso de ÉXITO
        if (success) {
            const timer = setTimeout(() => {
                navigate('/login');
            }, 3000);

            // La limpieza del estado ahora SOLO se asocia con el éxito
            return () => {
                clearTimeout(timer);
                dispatch(resetTenantRegisterFlag());
            };
        }

        // Manejo del caso de ERROR
        if (error) {
            setIsLoading(false);
            // Opcional: Limpiar el mensaje de error después de 5 segundos
            const errorTimer = setTimeout(() => dispatch(resetTenantRegisterFlag()), 5000);
            return () => clearTimeout(errorTimer);
        }
    }, [success, error, dispatch, navigate]);

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
                                        {success && (<Alert color="success" fade={false}>¡Registro exitoso! Serás redirigido para que inicies sesión.</Alert>)}
                                        {error && (<Alert color="danger" fade={false}>{error}</Alert>)}

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
                                                    <div className="position-relative auth-pass-inputgroup">
                                                        <Input
                                                            name="adminPassword"
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="Crea una contraseña segura"
                                                            onChange={validation.handleChange}
                                                            onBlur={validation.handleBlur}
                                                            value={validation.values.adminPassword}
                                                            invalid={!!(validation.touched.adminPassword && validation.errors.adminPassword)}
                                                        />
                                                        <button
                                                            className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted shadow-none"
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        >
                                                            <i className={showPassword ? "ri-eye-off-fill" : "ri-eye-fill"}></i>
                                                        </button>
                                                        {validation.touched.adminPassword && validation.errors.adminPassword ? <FormFeedback type="invalid">{validation.errors.adminPassword as string}</FormFeedback> : null}
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <Button color="success" className="w-100" type="submit" disabled={isLoading}>
                                                        {isLoading ? (
                                                            <Spinner size="sm" className="me-2"> Creando... </Spinner>
                                                        ) : (
                                                            "Crear mi cuenta"
                                                        )}
                                                    </Button>
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