// src/pages/Authentication/Login.tsx
import React, { useEffect, useState } from 'react';
import {
  Card, CardBody, Col, Container, Input, Label, Row,
  Button, Form, FormFeedback, Spinner
} from 'reactstrap';
import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";

// redux
import { useSelector, useDispatch } from "react-redux";

import { Link } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";

// Formik + Yup
import * as Yup from "yup";
import { useFormik } from "formik";

// actions (tus thunks agregados)
import { loginUser, socialLogin, resetLoginFlag } from "../../slices/thunks";

import logoLight from "../../assets/images/logo-light.png";
import { createSelector } from 'reselect';

// SweetAlert2
import Swal from 'sweetalert2';

const Login = (props: any) => {
  const dispatch: any = useDispatch();

  const selectLayoutState = (state: any) => state;
  const loginpageData = createSelector(
    selectLayoutState,
    (state) => ({
      user: state.Account?.user,
      error: state.Login?.error,
      errorMsg: state.Login?.errorMsg,
    })
  );

  const { user, error, errorMsg } = useSelector(loginpageData);

  const [userLogin, setUserLogin] = useState<any>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loader, setLoader] = useState<boolean>(false);

  // Relleno opcional desde store (si vienes de un flujo que dejó datos en Account.user)
  useEffect(() => {
    if (user) {
      const updatedUserData =
        process.env.REACT_APP_DEFAULTAUTH === "firebase"
          ? user.multiFactor?.user?.email
          : user.user?.email;
      const updatedUserPassword =
        process.env.REACT_APP_DEFAULTAUTH === "firebase" ? "" : user.user?.confirm_password;

      setUserLogin({
        email: updatedUserData || "",
        password: updatedUserPassword || "",
      });
    }
  }, [user]);

  const validation: any = useFormik({
    enableReinitialize: true,
    initialValues: {
      email: userLogin.email,
      password: userLogin.password,
    },
    validationSchema: Yup.object({
      email: Yup.string().required("Please Enter Your Email"),
      password: Yup.string().required("Please Enter Your Password"),
    }),
    onSubmit: (values) => {
      setLoader(true);
      dispatch(loginUser(values, props.router.navigate));
    },
  });

  const signIn = (type: any) => {
    dispatch(socialLogin(type, props.router.navigate));
  };

  // Mostrar SweetAlert en errores (contraseña incorrecta / servidor)
  useEffect(() => {
    if (errorMsg || error) {
      const messageRaw = (errorMsg || error || "").toString();
      // Heurística sencilla para mensaje más claro
      const isCredError =
        /unauthorized|invalid|credencial|credential|password|contraseña|401/i.test(messageRaw);

      const title = isCredError ? "Credenciales inválidas" : "Credenciales inválidas";
      const text =
        messageRaw?.trim() ||
        (isCredError
          ? "Verifica tu email y contraseña."
          : "Ocurrió un problema al iniciar sesión. Inténtalo nuevamente.");

      Swal.fire({
        icon: "error",
        title,
        text,
        confirmButtonText: "Entendido",
      }).finally(() => {
        setLoader(false);
        dispatch(resetLoginFlag());
      });
    }
  }, [dispatch, errorMsg, error]);

  document.title = "Basic SignIn | Velzon - React Admin & Dashboard Template";

  return (
    <React.Fragment>
      <ParticlesAuth>
        <div className="auth-page-content">
          <Container>
            <Row>
              <Col lg={12}>
                <div className="text-center mt-sm-5 mb-4 text-white-50">
                  <div>
                    <Link to="/" className="d-inline-block auth-logo">
                      <img src={logoLight} alt="" height="120" />
                    </Link>
                  </div>
                  <p className="mt-3 fs-15 fw-medium">Ahora la IA en tu pelukeria</p>
                </div>
              </Col>
            </Row>

            <Row className="justify-content-center">
              <Col md={8} lg={6} xl={5}>
                <Card className="mt-4">
                  <CardBody className="p-4">
                    <div className="text-center mt-2">
                      <h5 className="text-primary">Bienvenido </h5>
                      <p className="text-muted">Ingresa a tu cuenta.</p>
                    </div>

                    {/* Quitamos los Alerts en pantalla; ahora usamos SweetAlert2 por useEffect */}

                    <div className="p-2 mt-4">
                      <Form
                        onSubmit={(e) => {
                          e.preventDefault();
                          validation.handleSubmit();
                          return false;
                        }}
                        action="#"
                      >
                        <div className="mb-3">
                          <Label htmlFor="email" className="form-label">Email</Label>
                          <Input
                            name="email"
                            className="form-control"
                            placeholder="Enter email"
                            type="email"
                            onChange={validation.handleChange}
                            onBlur={validation.handleBlur}
                            value={validation.values.email || ""}
                            invalid={!!(validation.touched.email && validation.errors.email)}
                          />
                          {validation.touched.email && validation.errors.email ? (
                            <FormFeedback type="invalid">{validation.errors.email}</FormFeedback>
                          ) : null}
                        </div>

                        <div className="mb-3">
                          <div className="float-end">
                            <Link to="/forgot-password" className="text-muted">Forgot password?</Link>
                          </div>
                          <Label className="form-label" htmlFor="password-input">Password</Label>
                          <div className="position-relative auth-pass-inputgroup mb-3">
                            <Input
                              name="password"
                              value={validation.values.password || ""}
                              type={showPassword ? "text" : "password"}
                              className="form-control pe-5"
                              placeholder="Enter Password"
                              onChange={validation.handleChange}
                              onBlur={validation.handleBlur}
                              invalid={!!(validation.touched.password && validation.errors.password)}
                            />
                            {validation.touched.password && validation.errors.password ? (
                              <FormFeedback type="invalid">{validation.errors.password}</FormFeedback>
                            ) : null}
                            <button
                              className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted shadow-none"
                              onClick={() => setShowPassword(!showPassword)}
                              type="button"
                              id="password-addon"
                            >
                              <i className="ri-eye-fill align-middle"></i>
                            </button>
                          </div>
                        </div>

                        <div className="form-check">
                          <Input className="form-check-input" type="checkbox" id="auth-remember-check" />
                          <Label className="form-check-label" htmlFor="auth-remember-check">Remember me</Label>
                        </div>

                        <div className="mt-4">
                          <Button
                            color="success"
                            disabled={loader}
                            className="btn btn-success w-100"
                            type="submit"
                          >
                            {loader && <Spinner size="sm" className="me-2">Loading...</Spinner>}
                            Sign In
                          </Button>
                        </div>

                        <div className="mt-4 text-center">
                          <div className="signin-other-title">
                            <h5 className="fs-13 mb-4 title">Sign In with</h5>
                          </div>
                          <div>
                            <Link
                              to="#"
                              className="btn btn-primary btn-icon me-1"
                              onClick={e => {
                                e.preventDefault();
                                signIn("facebook");
                              }}
                            >
                              <i className="ri-facebook-fill fs-16" />
                            </Link>
                            <Link
                              to="#"
                              className="btn btn-danger btn-icon me-1"
                              onClick={e => {
                                e.preventDefault();
                                signIn("google");
                              }}
                            >
                              <i className="ri-google-fill fs-16" />
                            </Link>
                            <Button color="dark" className="btn-icon" type="button"><i className="ri-github-fill fs-16"></i></Button>{" "}
                            <Button color="info" className="btn-icon" type="button"><i className="ri-twitter-fill fs-16"></i></Button>
                          </div>
                        </div>
                      </Form>
                    </div>
                  </CardBody>
                </Card>

                <div className="mt-4 text-center">
                  <p className="mb-0">
                    Don't have an account ?{" "}
                    <Link to="/register-tenant" className="fw-semibold text-primary text-decoration-underline">
                      Signup
                    </Link>
                  </p>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </ParticlesAuth>
    </React.Fragment>
  );
};

export default withRouter(Login);
