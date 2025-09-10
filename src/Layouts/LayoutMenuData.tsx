// Archivo: src/Layouts/LayoutMenuData.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
// Asegúrate de que la ruta al servicio de autenticación sea correcta desde esta ubicación
import { getToken } from "../services/auth"; 

// --- Helper para obtener el rol del usuario desde el token JWT ---
const getRoleFromToken = (): number | null => {
    try {
        const token = getToken();
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        // La estructura del payload del token es { user: { role_id: ... } }
        return decoded?.user?.role_id || null;
    } catch (e) {
        console.error("Error decodificando el token:", e);
        return null;
    }
};

const LayoutMenuData = () => { 
    const history = useNavigate();
    // Estados para el funcionamiento del menú
    const [isDashboard, setIsDashboard] = useState<boolean>(false);
    const [isEstilistas, setIsEstilistas] = useState<boolean>(false);
    const [isInventario, setIsInventario] = useState<boolean>(false);
    const [iscurrentState, setIscurrentState] = useState("Dashboard");

    // Obtenemos el rol del usuario actual
    const userRole = getRoleFromToken();

    useEffect(() => {
        document.body.classList.remove("twocolumn-panel");
        if (iscurrentState !== "Dashboard") { setIsDashboard(false); }
        if (iscurrentState !== "Estilistas") { setIsEstilistas(false); }
        if (iscurrentState !== "Inventario") { setIsInventario(false); }
    }, [history, iscurrentState, isDashboard, isEstilistas, isInventario]);

    
    // La lista de menús
    const menuItems: any[] = [
        {
            label: "Menú Principal",
            isHeader: true,
        },
        {
            id: "dashboard",
            label: "Dashboard",
            icon: "ri-dashboard-2-line",
            link: "/dashboard",
            roles: [1, 2, 3] // Visible para Admin, Cajero y Estilista
        },
        {
            id: "stylists",
            label: "Crm",
            icon: "ri-user-heart-line",
            link: "/stylists",
            roles: [1, 3] // Visible para Admin y Estilista
        },
        {
            id: "inventory",
            label: "Inventario",
            icon: "ri-archive-line",
            link: "/inventory",
            roles: [1] // Visible solo para Admin
        },
        // --- MENÚ DE NÓMINA AÑADIDO AQUÍ ---
        {
            id: "payroll",
            label: "Nómina",
            icon: "ri-money-dollar-circle-line",
            link: "/payroll",
            roles: [1, ] // Visible para Admin y Cajero
        },
        {
            id: "settings",
            label: "Configuración",
            icon: "ri-settings-3-line",
            link: "/settings", // Corregido a minúscula para consistencia
            roles: [1] // Visible solo para Admin
        },
    ];

    // Filtramos el menú basado en el rol del usuario
    const filteredMenuItems = useMemo(() => {
        if (!userRole) return []; 

        return menuItems.filter(item => {
            if (!item.roles) {
                return true;
            }
            return item.roles.includes(userRole);
        });
    }, [userRole]);

    // Devolvemos la lista de menús ya filtrada
    return <React.Fragment>{filteredMenuItems}</React.Fragment>;
};

export default LayoutMenuData;