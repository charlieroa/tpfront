// Contenido para tu archivo de Rutas (ej: src/routes/index.js)

import React from "react";
import { Navigate } from "react-router-dom";

// --- Nuestros Componentes de Página (Importados de la Demo) ---

// Dashboard
import DashboardPrincipal from "../pages/DashboardPrincipal";


// Calendario y Caja
import Calendar from "../pages/Calendar";

// Estilistas
import CandidateList from "../pages/Jobs/CandidateList/ListView"; // Lista de Estilistas
import SimplePage from "../pages/Pages/Profile/SimplePage/SimplePage"; // Detalle de Estilista

// Inventario
import EcommerceProducts from "../pages/Ecommerce/EcommerceProducts/index";
import EcommerceProductDetail from "../pages/Ecommerce/EcommerceProducts/EcommerceProductDetail";

// Nómina
import InvoiceList from "../pages/Invoices/InvoiceList";

// Autenticación y Perfil
import Login from "../pages/Authentication/Login";
import Logout from "../pages/Authentication/Logout";
import Register from "../pages/Authentication/Register";
import UserProfile from "../pages/Authentication/user-profile";
import TenantRegister from "../pages/Authentication/TenantRegister";


// --- NUESTRAS RUTAS PROTEGIDAS ---
const authProtectedRoutes = [
  // Dashboard
   { path: "/dashboard", component: <DashboardPrincipal /> },

  // Calendario y Caja
  { path: "/calendar", component: <Calendar /> }, // Usaremos la misma página para ambas

  // Estilistas
  { path: "/stylists", component: <CandidateList /> },
  { path: "/stylists/:id", component: <SimplePage /> }, // Ruta para ver el detalle

  // Inventario
  { path: "/inventory", component: <EcommerceProducts /> },
  { path: "/inventory/:id", component: <EcommerceProductDetail /> },

  // Nómina
  { path: "/payroll", component: <InvoiceList /> },
  
  // Perfil del usuario logueado
  { path: "/profile", component: <UserProfile /> },

  // Redirección por defecto al entrar a la app
  {
    path: "/",
    exact: true,
    component: <Navigate to="/dashboard" />,
  },
  { path: "*", component: <Navigate to="/dashboard" /> },
];


// --- NUESTRAS RUTAS PÚBLICAS ---
const publicRoutes = [
  // Rutas de Autenticación
  { path: "/logout", component: <Logout /> },
  { path: "/login", component: <Login /> },
  { path: "/register", component: <Register /> },
   { path: "/register-tenant", component: <TenantRegister /> },
];

export { authProtectedRoutes, publicRoutes };